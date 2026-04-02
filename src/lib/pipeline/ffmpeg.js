/**
 * Pipeline Adım 5: Video Birleştirme
 * fluent-ffmpeg ile video kliplerini birleştirip ses ekler.
 * Çıktı: 1080p, H.264, AAC, 16:9 MP4
 */

import ffmpeg from "fluent-ffmpeg";
import fs from "fs/promises";
import path from "path";

const OUTPUT_DIR = path.join(process.cwd(), "output", "final");

/**
 * ffmpeg'in sistemde yüklü olup olmadığını kontrol eder
 * @returns {Promise<boolean>}
 */
async function checkFfmpeg() {
  return new Promise((resolve) => {
    ffmpeg.getAvailableFormats((err) => {
      resolve(!err);
    });
  });
}

/**
 * Video kliplerini birleştirmek için concat dosyası oluşturur
 * ffmpeg concat demuxer formatında: file 'path'
 * @param {string[]} videoPaths - Video dosya yolları
 * @returns {Promise<string>} - Concat dosya yolu
 */
async function createConcatFile(videoPaths) {
  const concatPath = path.join(OUTPUT_DIR, `concat_${Date.now()}.txt`);
  const lines = videoPaths.map((p) => `file '${p}'`).join("\n");
  await fs.writeFile(concatPath, lines);
  return concatPath;
}

/**
 * Geçici concat dosyasını siler
 * @param {string} concatPath
 */
async function cleanupConcatFile(concatPath) {
  try {
    await fs.unlink(concatPath);
  } catch {
    // Silinememesi kritik değil
  }
}

/**
 * 4 video klibini birleştirip ses dosyasını ekler
 *
 * @param {string[]} videoPaths - Video dosya yolları (null olanlar atlanır)
 * @param {string} audioPath - Ses dosyası yolu (MP3)
 * @param {string} [outputPath] - Opsiyonel çıktı yolu
 * @returns {Promise<string>} - Final video dosya yolu
 */
export async function mergeVideos(videoPaths, audioPath, outputPath) {
  // ffmpeg kontrolü
  const ffmpegAvailable = await checkFfmpeg();
  if (!ffmpegAvailable) {
    throw new Error("ffmpeg bulunamadı. Lütfen ffmpeg'i kurun: brew install ffmpeg");
  }

  // Null olmayan videoları filtrele
  const validPaths = videoPaths.filter(Boolean);
  if (validPaths.length === 0) {
    throw new Error("Birleştirilecek video bulunamadı");
  }

  // Dosyaların varlığını kontrol et
  for (const vPath of validPaths) {
    try {
      await fs.access(vPath);
    } catch {
      throw new Error(`Video dosyası bulunamadı: ${vPath}`);
    }
  }

  try {
    await fs.access(audioPath);
  } catch {
    throw new Error(`Ses dosyası bulunamadı: ${audioPath}`);
  }

  // Çıktı dizinini oluştur
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const finalPath = outputPath || path.join(OUTPUT_DIR, `reklam_${Date.now()}.mp4`);

  console.log(`[ffmpeg] ${validPaths.length} video + ses birleştiriliyor...`);

  // Concat dosyası oluştur
  const concatPath = await createConcatFile(validPaths);

  try {
    await runFfmpeg(concatPath, audioPath, finalPath);
  } finally {
    await cleanupConcatFile(concatPath);
  }

  // Çıktı dosyası kontrolü
  const stats = await fs.stat(finalPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  if (stats.size < 10000) {
    throw new Error("Oluşturulan video dosyası çok küçük, muhtemelen hatalı");
  }

  console.log(`[ffmpeg] Final video hazır: ${finalPath} (${sizeMB}MB)`);
  return finalPath;
}

/**
 * ffmpeg komutunu çalıştırır
 * concat demuxer + ses overlay + H.264/AAC encoding
 * @param {string} concatPath - Concat liste dosyası
 * @param {string} audioPath - Ses dosyası
 * @param {string} outputPath - Çıktı dosyası
 * @returns {Promise<void>}
 */
function runFfmpeg(concatPath, audioPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      // Concat demuxer ile videoları birleştir
      .input(concatPath)
      .inputOptions(["-f", "concat", "-safe", "0"])
      // Ses dosyasını ekle
      .input(audioPath)
      // Video ayarları: 1080x1920 dikey (9:16), H.264
      .outputOptions([
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "23",
        "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2",
        "-c:a", "aac",
        "-b:a", "192k",
        "-map", "0:v",
        "-map", "1:a",
        "-shortest",
        "-movflags", "+faststart",
        "-pix_fmt", "yuv420p",
      ])
      .output(outputPath)
      .on("start", (cmd) => {
        console.log(`[ffmpeg] Komut: ${cmd}`);
      })
      .on("progress", (progress) => {
        if (progress.percent) {
          console.log(`[ffmpeg] İlerleme: %${Math.round(progress.percent)}`);
        }
      })
      .on("error", (err) => {
        reject(new Error(`ffmpeg hatası: ${err.message}`));
      })
      .on("end", () => {
        console.log("[ffmpeg] Birleştirme tamamlandı");
        resolve();
      })
      .run();
  });
}
