/**
 * Pipeline Adım 2: Görsel Üretimi + Logo Yerleştirme
 * 2 Aşamalı: Flux Dev (logosuz sahne) → Kontext Max Multi (logo yerleştirme)
 * 4 sahne için paralel çalışır.
 */

import { fal } from "@fal-ai/client";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const TEXT_TO_IMAGE_MODEL = "fal-ai/flux/dev";
const KONTEXT_MODEL = "fal-ai/flux-pro/kontext/max/multi";
const OUTPUT_DIR = path.join(process.cwd(), "output", "images");

// Desteklenen logo formatları
const MIME_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

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
 * Logo dosyasını fal.ai'ye yükler
 * @param {string} logoPath - Logo dosya yolu
 * @returns {Promise<string>} - Fal.ai URL
 */
async function uploadLogo(logoPath) {
  const ext = path.extname(logoPath).toLowerCase();
  const mimeType = MIME_TYPES[ext];

  if (!mimeType) {
    throw new Error(
      `Desteklenmeyen logo formatı: ${ext}. Desteklenen: ${Object.keys(MIME_TYPES).join(", ")}`
    );
  }

  const buffer = await fs.readFile(logoPath);
  const file = new File([buffer], path.basename(logoPath), { type: mimeType });
  const url = await fal.storage.upload(file);

  console.log(`[görsel] Logo yüklendi: ${path.basename(logoPath)}`);
  return url;
}

/**
 * Prompt'taki logo referanslarını boş patch alanı tanımıyla değiştirir
 * @param {string} prompt - Orijinal sahne promptu
 * @returns {string} - Dönüştürülmüş prompt
 */
function transformPromptForPatchArea(prompt) {
  let t = prompt;
  t = t.replace(/company logo clearly visible/gi, "a visible plain rectangular embroidered patch area");
  t = t.replace(/the company logo/gi, "a blank embroidered patch");
  t = t.replace(/company logo/gi, "blank rectangular patch");
  t = t.replace(/with (?:the )?logo/gi, "with a blank embroidered patch");
  t = t.replace(/logo clearly visible/gi, "visible plain patch area");
  t = t.replace(/logo on their/gi, "rectangular badge area on their");
  t = t.replace(/logo (?:is )?visible/gi, "blank patch area visible");
  t = t.replace(/\blogo\b/gi, "blank patch");

  if (!t.toLowerCase().includes("patch") && !t.toLowerCase().includes("badge")) {
    t += " Each person has a visible blank rectangular embroidered patch area on their chest pocket.";
  }
  return t;
}

/**
 * Kontext Max Multi için optimized prompt
 */
function buildKontextPrompt() {
  return [
    "Take the exact logo/emblem from @image2 and place it as an embroidered patch",
    "on the chest pocket area of each person visible in @image1.",
    "The logo must be reproduced EXACTLY as shown in @image2 —",
    "preserve every letter, color, shape, and proportion precisely.",
    "The patch should look naturally sewn onto the uniform fabric:",
    "match the lighting, perspective, and fabric wrinkles of the scene.",
    "Do NOT alter, redraw, or reinterpret the logo in any way.",
    "Do NOT change the people, background, or composition of @image1.",
    "Only add the logo patches — everything else stays identical.",
  ].join(" ");
}

/**
 * Aşama 1: Flux Dev ile logosuz sahne üretir
 * @param {string} prompt - Patch alanı tanımlı prompt
 * @param {number} sceneIndex - Sahne numarası
 * @returns {Promise<string>} - Üretilen görsel URL
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
 * Aşama 2: Kontext Max Multi ile logoyu sahneye yerleştirir
 * @param {string} sceneUrl - Sahne görseli URL
 * @param {string} logoUrl - Logo URL
 * @param {number} sceneIndex - Sahne numarası
 * @returns {Promise<string>} - Logolu görsel URL
 */
async function placeLogoWithKontext(sceneUrl, logoUrl, sceneIndex) {
  console.log(`[görsel] Sahne ${sceneIndex + 1} Aşama 2: Logo yerleştiriliyor (Kontext Max Multi)...`);

  const result = await fal.subscribe(KONTEXT_MODEL, {
    input: {
      prompt: buildKontextPrompt(),
      image_urls: [sceneUrl, logoUrl],
      guidance_scale: 3.5,
      num_images: 1,
      output_format: "png",
      safety_tolerance: 5,
    },
    logs: false,
  });

  const imageUrl = result.data?.images?.[0]?.url;
  if (!imageUrl) {
    throw new Error(`Sahne ${sceneIndex + 1}: Logo yerleştirilemedi`);
  }

  console.log(`[görsel] Sahne ${sceneIndex + 1} logo yerleştirildi`);
  return imageUrl;
}

/**
 * Görseli URL'den indirip dosyaya kaydeder
 * @param {string} imageUrl - Görsel URL
 * @param {number} sceneIndex - Sahne numarası
 * @returns {Promise<string>} - Kaydedilen dosya yolu
 */
async function downloadAndSave(imageUrl, sceneIndex) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const shortId = uuidv4().slice(0, 8);
  const filename = `sahne_${sceneIndex + 1}_${shortId}.png`;
  const outputPath = path.join(OUTPUT_DIR, filename);

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Görsel indirme hatası (HTTP ${response.status})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await fs.writeFile(outputPath, Buffer.from(arrayBuffer));

  return outputPath;
}

/**
 * Tek sahne: Flux Dev → Kontext Max Multi → Kaydet
 * @param {string} logoUrl - Fal.ai'deki logo URL
 * @param {string} imagePrompt - Sahne promptu
 * @param {number} sceneIndex - Sahne numarası
 * @returns {Promise<string>} - Final görsel dosya yolu
 */
async function generateSingleImage(logoUrl, imagePrompt, sceneIndex) {
  // 1. Prompt'u logosuz hale getir
  const patchPrompt = transformPromptForPatchArea(imagePrompt);

  // 2. Flux Dev ile temiz sahne üret
  const sceneUrl = await generateSceneImage(patchPrompt, sceneIndex);

  // 3. Kontext Max Multi ile logo yerleştir
  let finalUrl;
  try {
    finalUrl = await placeLogoWithKontext(sceneUrl, logoUrl, sceneIndex);
  } catch (err) {
    console.warn(`[görsel] Sahne ${sceneIndex + 1} Kontext başarısız, sahne görseli kullanılacak: ${err.message}`);
    finalUrl = sceneUrl;
  }

  // 4. İndir ve kaydet
  const outputPath = await downloadAndSave(finalUrl, sceneIndex);
  console.log(`[görsel] Sahne ${sceneIndex + 1} tamamlandı: ${path.basename(outputPath)}`);
  return outputPath;
}

/**
 * 4 sahne için paralel görsel üretimi (2 aşamalı pipeline)
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

  // Logo'yu fal.ai'ye yükle (bir kez, tüm sahneler için)
  const logoUrl = await uploadLogo(logoPath);

  console.log("[görsel] 4 sahne paralel üretiliyor (Flux Dev → Kontext Max Multi)...");

  // 4 sahneyi paralel çalıştır
  const results = await Promise.allSettled(
    imagePrompts.map((prompt, index) =>
      generateSingleImage(logoUrl, prompt, index)
    )
  );

  // Sonuçları değerlendir
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
