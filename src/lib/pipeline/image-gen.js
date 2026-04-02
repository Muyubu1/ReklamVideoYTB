/**
 * Pipeline Adım 2: Görsel Üretimi + Logo Yerleştirme + Harmonizasyon
 * 4 Aşamalı: Flux Dev (sahne) → Gemini Vision (tespit) → Sharp (composite) → Flux Inpainting (harmonize)
 * 4 sahne için paralel çalışır.
 */

import { fal } from "@fal-ai/client";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { detectPatchCoordinates, compositeLogoOnImage, generateInpaintMask } from "./logo-composite.js";

const TEXT_TO_IMAGE_MODEL = "fal-ai/flux/dev";
const INPAINT_MODEL = "fal-ai/flux-general/inpainting";
const OUTPUT_DIR = path.join(process.cwd(), "output", "images");

// Desteklenen logo formatları
const MIME_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

// Harmonizasyon promptu — logo alanının kumaşla kaynaşması
const HARMONIZE_PROMPT =
  "The company logo is naturally embroidered onto the uniform fabric. The logo seamlessly integrates with the fabric texture, matching the lighting, shadows, and natural wrinkles of the clothing perfectly. Realistic embroidery stitching detail.";

/**
 * Fal.ai istemcisini yapılandırır
 */
function configureFal() {
  const apiKey = process.env.FAL_KEY;
  if (!apiKey) {
    throw new Error("FAL_KEY ortam değişkeni tanımlanmamış");
  }
  fal.config({ credentials: apiKey });
}

/**
 * Prompt'taki logo/patch referanslarını temizleyip, tertemiz kıyafet talimatı ekler.
 * Flux'a "boş yama çiz" demek yerine, tamamen desensiz üniforma üretmesini sağlar.
 */
export function transformPromptForPatchArea(prompt) {
  let t = prompt;
  t = t.replace(/company logo clearly visible as an embroidered patch on their chest pockets?\.?/gi, "");
  t = t.replace(/the company logo clearly visible/gi, "");
  t = t.replace(/company logo clearly visible/gi, "");
  t = t.replace(/the company logo/gi, "");
  t = t.replace(/company logo/gi, "");
  t = t.replace(/with (?:the )?logo/gi, "");
  t = t.replace(/logo clearly visible/gi, "");
  t = t.replace(/logo on their/gi, "");
  t = t.replace(/logo (?:is )?visible/gi, "");
  t = t.replace(/\blogo\b/gi, "");
  t = t.replace(/\bpatch\b/gi, "");
  t = t.replace(/\bbadge\b/gi, "");
  t = t.replace(/\s{2,}/g, " ").trim();
  t += " Ensure the clothing, especially the chest and pocket areas, is completely clean with NO added logos, NO text, NO patches, and NO extra embroidery. A clean natural uniform fabric.";
  return t;
}

/**
 * Aşama 1: Flux Dev ile logosuz sahne üretir
 */
async function generateSceneImage(prompt, sceneIndex) {
  console.log(`[görsel] Sahne ${sceneIndex + 1} Aşama 1: Temiz sahne üretiliyor (Flux Dev)...`);

  const result = await fal.subscribe(TEXT_TO_IMAGE_MODEL, {
    input: {
      prompt,
      image_size: "portrait_4_3",
      num_images: 1,
      num_inference_steps: 28,
      guidance_scale: 3.5,
      enable_safety_checker: false,
    },
    logs: false,
  });

  const imageUrl = result.data?.images?.[0]?.url;
  if (!imageUrl) {
    throw new Error(`Sahne ${sceneIndex + 1}: Sahne görseli üretilemedi`);
  }

  console.log(`[görsel] Sahne ${sceneIndex + 1} base görsel hazır`);
  return imageUrl;
}

/**
 * URL'den görseli indir ve buffer olarak döndür
 */
async function downloadToBuffer(imageUrl) {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Görsel indirme hatası (HTTP ${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Aşama 4: Flux Inpainting ile logo alanı harmonizasyonu
 * Sadece mask'taki beyaz bölgeleri (logo alanları) yeniden çizer.
 * Yüzler, arka plan, kompozisyon DEĞİŞMEZ.
 *
 * @param {Buffer} compositeBuffer - Sharp'tan çıkan logolu görsel (PNG buffer)
 * @param {Buffer} maskBuffer - Siyah/beyaz inpaint mask (logo alanları beyaz)
 * @returns {Promise<string>} - Harmonize edilmiş görselin URL'i
 */
export async function harmonizeWithFlux(compositeBuffer, maskBuffer) {
  console.log("[görsel] Aşama 4: Inpainting harmonizasyon başlıyor...");

  // Her iki buffer'ı Fal storage'a yükle
  const imageBlob = new Blob([compositeBuffer], { type: "image/png" });
  const maskBlob = new Blob([maskBuffer], { type: "image/png" });

  const [imageUrl, maskUrl] = await Promise.all([
    fal.storage.upload(imageBlob),
    fal.storage.upload(maskBlob),
  ]);

  const result = await fal.subscribe(INPAINT_MODEL, {
    input: {
      image_url: imageUrl,
      mask_url: maskUrl,
      prompt: HARMONIZE_PROMPT,
      strength: 0.35,
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
      enable_safety_checker: false,
    },
    logs: false,
  });

  const finalUrl = result.data?.images?.[0]?.url;
  if (!finalUrl) {
    throw new Error("Inpainting harmonizasyon görseli üretilemedi");
  }

  console.log("[görsel] Aşama 4: Inpainting harmonizasyon tamamlandı");
  return finalUrl;
}

/**
 * Tek sahne: Flux Dev → Gemini Vision → Sharp → Flux Inpainting → Kaydet
 */
async function generateSingleImage(logoBuffer, imagePrompt, sceneIndex) {
  const cleanPrompt = transformPromptForPatchArea(imagePrompt);

  // Aşama 1: Flux Dev ile temiz sahne üret
  const sceneUrl = await generateSceneImage(cleanPrompt, sceneIndex);
  const sceneBuffer = await downloadToBuffer(sceneUrl);

  // Aşama 2-3: Gemini Vision ile tespit + Sharp ile logo yerleştirme
  try {
    console.log(`[görsel] Sahne ${sceneIndex + 1} Aşama 2-3: Tespit + logo yerleştirme...`);
    const detection = await detectPatchCoordinates(sceneBuffer);
    const compositeBuffer = await compositeLogoOnImage(sceneBuffer, logoBuffer, detection.patches);

    // Aşama 4: Inpainting harmonizasyon (mask üret → sadece logo alanını işle)
    const { default: sharpModule } = await import("sharp");
    const meta = await sharpModule(sceneBuffer).metadata();
    const maskBuffer = await generateInpaintMask(detection.patches, meta.width, meta.height);

    console.log(`[görsel] Sahne ${sceneIndex + 1} Aşama 4: Harmonizasyon...`);
    const harmonizedUrl = await harmonizeWithFlux(compositeBuffer, maskBuffer);
    const finalBuffer = await downloadToBuffer(harmonizedUrl);

    // Kaydet
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    const shortId = uuidv4().slice(0, 8);
    const outputPath = path.join(OUTPUT_DIR, `sahne_${sceneIndex + 1}_${shortId}.png`);
    await fs.writeFile(outputPath, finalBuffer);

    console.log(`[görsel] Sahne ${sceneIndex + 1} tamamlandı: ${path.basename(outputPath)}`);
    return outputPath;
  } catch (err) {
    console.warn(`[görsel] Sahne ${sceneIndex + 1} pipeline başarısız, base görsel kullanılacak: ${err.message}`);

    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    const shortId = uuidv4().slice(0, 8);
    const fallbackPath = path.join(OUTPUT_DIR, `sahne_${sceneIndex + 1}_base_${shortId}.jpg`);
    await fs.writeFile(fallbackPath, sceneBuffer);
    return fallbackPath;
  }
}

/**
 * 4 sahne için paralel görsel üretimi (4 aşamalı pipeline)
 *
 * @param {string} logoPath - Logo dosyasının yolu
 * @param {string[]} imagePrompts - 4 adet sahne promptu
 * @returns {Promise<string[]>} - Kaydedilen görsel dosya yolları
 */
export async function generateImages(logoPath, imagePrompts) {
  if (!logoPath) {
    throw new Error("Logo dosya yolu belirtilmemiş");
  }
  if (!Array.isArray(imagePrompts) || imagePrompts.length !== 4) {
    throw new Error("imagePrompts 4 elemanlı bir dizi olmalı");
  }

  configureFal();

  const ext = path.extname(logoPath).toLowerCase();
  if (!MIME_TYPES[ext]) {
    throw new Error(`Desteklenmeyen logo formatı: ${ext}`);
  }
  const logoBuffer = await fs.readFile(logoPath);

  console.log("[görsel] 4 sahne paralel üretiliyor (Flux → Gemini → Sharp → Inpaint)...");

  const results = await Promise.allSettled(
    imagePrompts.map((prompt, index) =>
      generateSingleImage(logoBuffer, prompt, index)
    )
  );

  const imagePaths = [];
  const errors = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      imagePaths.push(result.value);
    } else {
      errors.push(`Sahne ${index + 1}: ${result.reason.message}`);
      imagePaths.push(null);
    }
  });

  const successCount = imagePaths.filter(Boolean).length;
  if (successCount === 0) {
    throw new Error(`Hiçbir görsel üretilemedi:\n${errors.join("\n")}`);
  }

  if (errors.length > 0) {
    console.warn(`[görsel] ${errors.length} sahne başarısız:\n${errors.join("\n")}`);
  }

  console.log(`[görsel] ${successCount}/4 görsel başarıyla üretildi`);
  return imagePaths;
}
