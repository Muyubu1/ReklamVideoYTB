/**
 * Pipeline Adım 3: Video Animasyonu
 * Fal.ai üzerinden Kling v1.6 ile logolu görselleri videoya çevirir.
 * 4 sahne queue ile paralel submit edilir.
 */

import { fal } from "@fal-ai/client";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const MODEL_ID = "fal-ai/kling-video/v1.6/standard/image-to-video";
const OUTPUT_DIR = path.join(process.cwd(), "output", "videos");

// Fal.ai istemcisini yapılandır
function configureFal() {
  const apiKey = process.env.FAL_KEY;
  if (!apiKey) {
    throw new Error("FAL_KEY ortam değişkeni tanımlanmamış");
  }
  fal.config({ credentials: apiKey });
}

/**
 * Görsel dosyasını fal.ai'ye yükler ve URL döner
 * @param {string} imagePath - Yerel görsel dosya yolu
 * @returns {Promise<string>} - Fal.ai üzerindeki URL
 */
async function uploadImage(imagePath) {
  const buffer = await fs.readFile(imagePath);
  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = ext === ".png" ? "image/png" : "image/jpeg";

  const file = new File([buffer], path.basename(imagePath), { type: mimeType });
  const url = await fal.storage.upload(file);

  console.log(`[video] Görsel yüklendi: ${path.basename(imagePath)}`);
  return url;
}

/**
 * Tek sahne için video üretim işini kuyruğa gönderir
 * @param {string} imageUrl - Fal.ai'deki görsel URL
 * @param {string} videoPrompt - Kamera hareketi promptu
 * @param {number} sceneIndex - Sahne numarası (0-3)
 * @returns {Promise<string>} - Kaydedilen video dosya yolu
 */
async function generateSingleVideo(imageUrl, videoPrompt, sceneIndex) {
  console.log(`[video] Sahne ${sceneIndex + 1} kuyruğa gönderiliyor...`);

  // Queue ile submit et — uzun süren işlemler için
  const result = await fal.subscribe(MODEL_ID, {
    input: {
      prompt: videoPrompt,
      image_url: imageUrl,
      duration: "5",
      aspect_ratio: "9:16",
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS") {
        const pct = update.logs?.length
          ? update.logs[update.logs.length - 1].message
          : "işleniyor";
        console.log(`[video] Sahne ${sceneIndex + 1}: ${pct}`);
      }
    },
  });

  // Sonuçtan video URL'ini al
  const videoUrl = result.data?.video?.url;
  if (!videoUrl) {
    throw new Error(
      `Sahne ${sceneIndex + 1}: Video URL bulunamadı. Yanıt: ${JSON.stringify(result.data)}`
    );
  }

  // Videoyu indir ve kaydet
  const outputPath = await downloadVideo(videoUrl, sceneIndex);
  console.log(`[video] Sahne ${sceneIndex + 1} tamamlandı: ${outputPath}`);
  return outputPath;
}

/**
 * Video dosyasını URL'den indirip kaydeder
 * @param {string} videoUrl - İndirilecek video URL
 * @param {number} sceneIndex - Sahne numarası
 * @returns {Promise<string>} - Kaydedilen dosya yolu
 */
async function downloadVideo(videoUrl, sceneIndex) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const shortId = uuidv4().slice(0, 8);
  const filename = `sahne_${sceneIndex + 1}_${shortId}.mp4`;
  const outputPath = path.join(OUTPUT_DIR, filename);

  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error(`Video indirme hatası (HTTP ${response.status})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await fs.writeFile(outputPath, Buffer.from(arrayBuffer));

  return outputPath;
}

/**
 * 4 sahne için paralel video üretimi
 *
 * @param {string[]} imagePaths - 4 adet logolu görsel dosya yolu
 * @param {string[]} videoPrompts - 4 adet video promptu
 * @returns {Promise<string[]>} - Kaydedilen video dosya yolları
 */
export async function generateVideos(imagePaths, videoPrompts) {
  if (!Array.isArray(imagePaths) || imagePaths.length !== 4) {
    throw new Error("imagePaths 4 elemanlı bir dizi olmalı");
  }
  if (!Array.isArray(videoPrompts) || videoPrompts.length !== 4) {
    throw new Error("videoPrompts 4 elemanlı bir dizi olmalı");
  }

  configureFal();

  // Null olan görselleri filtrele (image-gen'de başarısız olanlar)
  const validScenes = imagePaths
    .map((imgPath, i) => ({ imgPath, prompt: videoPrompts[i], index: i }))
    .filter((s) => s.imgPath !== null);

  if (validScenes.length === 0) {
    throw new Error("Video üretimi için geçerli görsel bulunamadı");
  }

  console.log(`[video] ${validScenes.length} sahne için görseller yükleniyor...`);

  // Görselleri paralel yükle
  const uploadResults = await Promise.all(
    validScenes.map(async (scene) => ({
      ...scene,
      imageUrl: await uploadImage(scene.imgPath),
    }))
  );

  console.log(`[video] ${validScenes.length} sahne paralel olarak üretiliyor...`);

  // Videoları paralel üret
  const results = await Promise.allSettled(
    uploadResults.map((scene) =>
      generateSingleVideo(scene.imageUrl, scene.prompt, scene.index)
    )
  );

  // Sonuçları değerlendir — sıralama korunmalı
  const videoPaths = new Array(4).fill(null);
  const errors = [];

  results.forEach((result, i) => {
    const originalIndex = uploadResults[i].index;
    if (result.status === "fulfilled") {
      videoPaths[originalIndex] = result.value;
    } else {
      errors.push(`Sahne ${originalIndex + 1}: ${result.reason.message}`);
    }
  });

  const successCount = videoPaths.filter(Boolean).length;
  if (successCount === 0) {
    throw new Error(`Hiçbir video üretilemedi:\n${errors.join("\n")}`);
  }

  if (errors.length > 0) {
    console.warn(`[video] ${errors.length} sahne başarısız:\n${errors.join("\n")}`);
  }

  console.log(`[video] ${successCount}/4 video başarıyla üretildi`);
  return videoPaths;
}
