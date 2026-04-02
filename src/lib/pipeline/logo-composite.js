/**
 * Logo Composite Pipeline
 * 1. Vision AI (Gemini Flash) ile patch/yama koordinatlarını tespit et
 * 2. Sharp ile logoyu programatik olarak görsele yerleştir
 */

import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

const GEMINI_VISION_MODEL = "gemini-2.0-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_VISION_MODEL}:generateContent`;

const DETECTION_PROMPT = `Analyze this image and detect all uniform patch/badge areas on the chest of people.
For each person, return the patch location in this exact JSON format and ONLY JSON, no markdown:
{
  "patches": [
    {
      "person": 1,
      "x": <top-left x pixel>,
      "y": <top-left y pixel>,
      "width": <width pixels>,
      "height": <height pixels>,
      "rotation_degrees": <tilt angle, 0 if straight>,
      "perspective": "frontal"|"slight_left"|"slight_right"|"angled"
    }
  ],
  "image_width": <total image width>,
  "image_height": <total image height>
}

If there are no visible patch areas or people, return: { "patches": [], "image_width": <w>, "image_height": <h> }
Return ONLY the JSON object, nothing else.`;

/**
 * Gemini Vision ile görseldeki patch/yama koordinatlarını tespit eder
 * @param {string} imageBase64 - Görselin base64 verisi
 * @param {string} [mimeType="image/jpeg"] - Görsel MIME tipi
 * @returns {Promise<object>} - { patches: [...], image_width, image_height }
 */
export async function detectPatchCoordinates(imageBase64, mimeType = "image/jpeg") {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY tanımlanmamış");

  console.log("[logo-composite] Patch koordinatları tespit ediliyor (Gemini Vision)...");

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inlineData: { mimeType, data: imageBase64 } },
          { text: DETECTION_PROMPT },
        ],
      }],
      generationConfig: { temperature: 0.1 },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini Vision hatası (${res.status}): ${errBody.slice(0, 300)}`);
  }

  const data = await res.json();
  const textPart = data.candidates?.[0]?.content?.parts?.find((p) => p.text);

  if (!textPart?.text) {
    throw new Error("Gemini Vision yanıt döndürmedi");
  }

  // Markdown wrapping temizle: ```json ... ```
  let jsonStr = textPart.text.trim();
  jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  try {
    const result = JSON.parse(jsonStr);
    console.log(`[logo-composite] ${result.patches?.length || 0} patch tespit edildi`);
    return result;
  } catch {
    console.error("[logo-composite] JSON parse hatası, ham yanıt:", jsonStr.slice(0, 300));
    throw new Error("Gemini Vision geçersiz JSON döndürdü");
  }
}

/**
 * Sharp ile logoyu patch koordinatlarına yerleştirir
 * @param {object} params
 * @param {Buffer} params.imageBuffer - Ana görsel buffer
 * @param {Buffer} params.logoBuffer - Logo buffer (transparan PNG)
 * @param {Array} params.patches - Patch koordinat dizisi
 * @returns {Promise<Buffer>} - Logo yerleştirilmiş final görsel buffer
 */
export async function compositeLogoOnImage({ imageBuffer, logoBuffer, patches }) {
  if (!patches || patches.length === 0) {
    console.warn("[logo-composite] Patch bulunamadı, görsel değiştirilmeden döndürülüyor");
    return imageBuffer;
  }

  console.log(`[logo-composite] ${patches.length} patch'e logo yerleştiriliyor...`);

  // Her patch için logo overlay hazırla
  const composites = [];

  for (const patch of patches) {
    const { x, y, width, height, rotation_degrees } = patch;

    if (!width || !height || width < 10 || height < 10) {
      console.warn(`[logo-composite] Geçersiz patch boyutu (${width}x${height}), atlanıyor`);
      continue;
    }

    // Logo'yu patch boyutuna resize et
    let logoPatch = sharp(logoBuffer)
      .resize(Math.round(width), Math.round(height), {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      });

    // Rotasyon uygula
    if (rotation_degrees && Math.abs(rotation_degrees) > 1) {
      logoPatch = logoPatch.rotate(rotation_degrees, {
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      });
    }

    // Hafif blur (nakış efekti) + opacity ayarı
    const patchBuffer = await logoPatch
      .blur(0.3)
      .ensureAlpha()
      .composite([{
        input: Buffer.from([0, 0, 0, Math.round(255 * 0.90)]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: "dest-in",
      }])
      .toBuffer();

    composites.push({
      input: patchBuffer,
      left: Math.round(x),
      top: Math.round(y),
    });
  }

  if (composites.length === 0) {
    console.warn("[logo-composite] Geçerli composite bulunamadı");
    return imageBuffer;
  }

  const result = await sharp(imageBuffer)
    .composite(composites)
    .toBuffer();

  console.log(`[logo-composite] ${composites.length} logo başarıyla yerleştirildi`);
  return result;
}

/**
 * Tam pipeline: görsel oku → koordinat tespit → logo yerleştir → kaydet
 * @param {object} params
 * @param {string} params.imagePath - Görsel dosya yolu
 * @param {string} params.logoPath - Logo dosya yolu (transparan PNG)
 * @param {string} params.outputPath - Çıktı dosya yolu
 * @returns {Promise<string>} - Kaydedilen dosya yolu
 */
export async function processImageWithLogo({ imagePath, logoPath, outputPath }) {
  console.log(`[logo-composite] İşleniyor: ${path.basename(imagePath)}`);

  // Dosyaları oku
  const [imageBuffer, logoBuffer] = await Promise.all([
    fs.readFile(imagePath),
    fs.readFile(logoPath),
  ]);

  // Görsel base64'e çevir (Gemini Vision için)
  const imageBase64 = imageBuffer.toString("base64");
  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = ext === ".png" ? "image/png" : "image/jpeg";

  // Patch koordinatlarını tespit et
  const detection = await detectPatchCoordinates(imageBase64, mimeType);

  // Logoyu yerleştir
  const resultBuffer = await compositeLogoOnImage({
    imageBuffer,
    logoBuffer,
    patches: detection.patches,
  });

  // Kaydet
  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, resultBuffer);

  console.log(`[logo-composite] Kaydedildi: ${path.basename(outputPath)}`);
  return outputPath;
}
