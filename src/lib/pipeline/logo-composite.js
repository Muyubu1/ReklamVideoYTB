/**
 * Logo Composite Pipeline v3
 * Aşama 2: Gemini Vision ile göğüs alanı tespit (0-1000 normalize, kişi başı 1)
 * Aşama 3: Sharp ile logoyu over blend + blur(0.3) ile kaba yerleştir
 * Aşama 4 (harmonizasyon) image-gen.js'de yapılır.
 */

import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Gemini 0-1000 normalize koordinat formatı — kişi başı TAM 1 göğüs alanı
const DETECTION_PROMPT = `Analyze this image. Find the absolute best spot on the left breast / chest pocket area for each person where a company logo would naturally be embroidered.

IMPORTANT RULES:
- Return EXACTLY ONE bounding box per person.
- DO NOT select collar flaps, buttons, name tags, or any other elements.
- Only select the left chest / breast pocket region.
- If a person is not clearly visible or has no suitable chest area, skip them.

Return the locations in this EXACT JSON format (NO markdown, ONLY JSON):
{
  "patches": [
    {
      "person": 1,
      "y_min": <top edge, 0-1000 normalized>,
      "x_min": <left edge, 0-1000 normalized>,
      "y_max": <bottom edge, 0-1000 normalized>,
      "x_max": <right edge, 0-1000 normalized>,
      "perspective": "frontal"|"slight_left"|"slight_right"
    }
  ]
}

Coordinate system: 0-1000 normalized. (0,0) is top-left. 1000 is full width/height.
If no suitable areas found, return: { "patches": [] }
Return ONLY valid JSON.`;

/**
 * Gemini Vision ile patch koordinatlarını tespit et
 * @param {Buffer} imageBuffer - Görsel buffer
 * @returns {Promise<{patches: Array}>} - Normalize koordinatlı patch dizisi
 */
export async function detectPatchCoordinates(imageBuffer) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY tanımlanmamış");

  const imageBase64 = imageBuffer.toString("base64");
  console.log("[logo-composite] Patch koordinatları tespit ediliyor...");

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ parts: [
        { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
        { text: DETECTION_PROMPT },
      ]}],
      generationConfig: { temperature: 0.1 },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini hatası (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text;
  if (!text) throw new Error("Gemini yanıt döndürmedi");

  // Markdown wrapping temizle
  let json = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  try {
    const result = JSON.parse(json);
    console.log(`[logo-composite] ${result.patches?.length || 0} patch tespit edildi`);
    return result;
  } catch {
    console.error("[logo-composite] JSON parse hatası:", json.slice(0, 200));
    throw new Error("Gemini geçersiz JSON döndürdü");
  }
}

/**
 * 0-1000 normalize koordinatları piksel koordinatlarına dönüştür
 */
function normalizeToPixels(patch, imgWidth, imgHeight) {
  return {
    x: Math.round((patch.x_min / 1000) * imgWidth),
    y: Math.round((patch.y_min / 1000) * imgHeight),
    width: Math.round(((patch.x_max - patch.x_min) / 1000) * imgWidth),
    height: Math.round(((patch.y_max - patch.y_min) / 1000) * imgHeight),
    perspective: patch.perspective || "frontal",
  };
}

/**
 * Perspektife göre affine matrix hesapla
 * Matrix: [scaleX, shearX, shearY, scaleY]
 */
function getAffineMatrix(perspective) {
  switch (perspective) {
    case "slight_left": return [1, -0.06, 0, 1];
    case "slight_right": return [1, 0.06, 0, 1];
    default: return null; // frontal — transform gerekmez
  }
}

/**
 * Sharp ile logoyu patch koordinatlarına yerleştir
 * Kaba Yerleştirme: blur(0.3) + over blend
 * multiply modu KALDIRILDI — Aşama 4 (Flux Img2Img) ışık/renk işini halleder
 * @param {Buffer} imageBuffer - Ana görsel buffer
 * @param {Buffer} logoBuffer - Logo buffer (transparan PNG)
 * @param {Array} patches - Normalize koordinatlı patch dizisi
 * @returns {Promise<Buffer>} - Logo yerleştirilmiş final buffer
 */
export async function compositeLogoOnImage(imageBuffer, logoBuffer, patches) {
  if (!patches?.length) {
    console.warn("[logo-composite] Patch yok, görsel değiştirilmeden döndürülüyor");
    return imageBuffer;
  }

  const metadata = await sharp(imageBuffer).metadata();
  const { width: imgW, height: imgH } = metadata;
  const composites = [];

  for (const patch of patches) {
    const px = normalizeToPixels(patch, imgW, imgH);
    if (px.width < 15 || px.height < 15) continue;

    // Logo'yu patch boyutuna resize et (%95 — daha büyük ve belirgin)
    const targetW = Math.round(px.width * 0.95);
    const targetH = Math.round(px.height * 0.95);

    let logoPatch = sharp(logoBuffer)
      .resize(targetW, targetH, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .ensureAlpha()
      // Keskinliği körelt — Aşama 4 harmonizasyonu doğal dokuyu verecek
      .blur(0.3);

    // Perspektif affine transform
    const matrix = getAffineMatrix(px.perspective);
    if (matrix) {
      logoPatch = logoPatch.affine(matrix, {
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      });
    }

    const patchBuffer = await logoPatch.png().toBuffer();

    // Ortalama için offset (%95 padding'e uyumlu)
    const offsetX = Math.round(px.x + px.width * 0.025);
    const offsetY = Math.round(px.y + px.height * 0.025);

    // over blend ile doğrudan kumaş üzerine yerleştir (Aşama 4 harmanlayacak)
    composites.push({
      input: patchBuffer,
      left: offsetX,
      top: offsetY,
      blend: "over",
    });
  }

  if (!composites.length) return imageBuffer;

  const result = await sharp(imageBuffer).composite(composites).png().toBuffer();
  console.log(`[logo-composite] ${composites.length} patch'e logo yerleştirildi`);
  return result;
}

/**
 * Inpainting için siyah/beyaz mask üret
 * Logo alanları beyaz, geri kalan siyah — Flux Inpainting sadece beyaz bölgeyi işler
 * @param {Array} patches - Normalize koordinatlı patch dizisi
 * @param {number} imgWidth - Görsel genişliği
 * @param {number} imgHeight - Görsel yüksekliği
 * @param {number} expand - Mask'ı logo alanından ne kadar genişlet (px) — kenar yumuşatma için
 * @returns {Promise<Buffer>} - Siyah/beyaz mask PNG buffer
 */
export async function generateInpaintMask(patches, imgWidth, imgHeight, expand = 10) {
  // Siyah base (tüm görsel korunacak)
  const composites = [];

  for (const patch of patches) {
    const px = normalizeToPixels(patch, imgWidth, imgHeight);
    if (px.width < 15 || px.height < 15) continue;

    // Logo alanını biraz genişlet (kenar harmonizasyonu için)
    const maskX = Math.max(0, px.x - expand);
    const maskY = Math.max(0, px.y - expand);
    const maskW = Math.min(px.width + expand * 2, imgWidth - maskX);
    const maskH = Math.min(px.height + expand * 2, imgHeight - maskY);

    // Beyaz dikdörtgen — bu alan inpaint edilecek
    const whiteRect = await sharp({
      create: { width: maskW, height: maskH, channels: 3, background: { r: 255, g: 255, b: 255 } },
    }).png().toBuffer();

    composites.push({ input: whiteRect, left: maskX, top: maskY });
  }

  const mask = await sharp({
    create: { width: imgWidth, height: imgHeight, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .composite(composites)
    .png()
    .toBuffer();

  console.log(`[logo-composite] Inpaint mask üretildi (${composites.length} bölge)`);
  return mask;
}

/**
 * Tam pipeline: görsel oku → koordinat tespit → logo yerleştir → kaydet
 * Orchestrator ve image-gen.js'den çağrılır
 * @param {object} params
 * @param {string} params.imagePath - Görsel dosya yolu
 * @param {string} params.logoPath - Logo dosya yolu (transparan PNG)
 * @param {string} params.outputPath - Çıktı dosya yolu
 * @returns {Promise<string>} - Kaydedilen dosya yolu
 */
export async function processImageWithLogo({ imagePath, logoPath, outputPath }) {
  console.log(`[logo-composite] İşleniyor: ${path.basename(imagePath)}`);

  const [imageBuffer, logoBuffer] = await Promise.all([
    fs.readFile(imagePath),
    fs.readFile(logoPath),
  ]);

  const detection = await detectPatchCoordinates(imageBuffer);
  const resultBuffer = await compositeLogoOnImage(imageBuffer, logoBuffer, detection.patches);

  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, resultBuffer);

  console.log(`[logo-composite] Kaydedildi: ${path.basename(outputPath)}`);
  return outputPath;
}
