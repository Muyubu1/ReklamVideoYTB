/**
 * Yardımcı fonksiyonlar
 */

import path from "path";

const OUTPUT_ROOT = path.join(process.cwd(), "output");

/**
 * Sunucu dosya yolunu /api/files/ URL'ine çevirir
 * Örn: /Users/.../output/final/video.mp4 → /api/files/final/video.mp4
 * @param {string|null} serverPath - Sunucu dosya yolu
 * @returns {string|null} - Web URL veya null
 */
export function toFileUrl(serverPath) {
  if (!serverPath) return null;
  const relative = path.relative(OUTPUT_ROOT, serverPath);
  if (relative.startsWith("..")) return null;
  return `/api/files/${relative}`;
}

/**
 * Pipeline sonucundaki tüm dosya yollarını URL'lere çevirir
 * @param {object} result - Pipeline sonucu
 * @returns {object} - URL'lerle zenginleştirilmiş sonuç
 */
export function convertPathsToUrls(result) {
  return {
    ...result,
    finalVideoUrl: toFileUrl(result.finalVideoPath),
    audioUrl: toFileUrl(result.audioPath),
    scenes: (result.scenes || []).map((scene) => ({
      ...scene,
      imageUrl: toFileUrl(scene.imagePath),
      videoUrl: toFileUrl(scene.videoPath),
    })),
  };
}
