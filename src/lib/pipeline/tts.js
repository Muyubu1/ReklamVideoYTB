/**
 * Pipeline Adım 4: Seslendirme (TTS)
 * ElevenLabs Multilingual v2 ile Türkçe seslendirme üretir.
 */

import fs from "fs/promises";
import path from "path";

const ELEVENLABS_URL = "https://api.elevenlabs.io/v1/text-to-speech";
const DEFAULT_VOICE_ID = "pNInz6obpgDQGcFmaJgB"; // Adam - Türkçe destekli
const MODEL_ID = "eleven_multilingual_v2";
const OUTPUT_DIR = path.join(process.cwd(), "output", "audio");

/**
 * Türkçe reklam metninden ses dosyası üretir
 *
 * @param {string} text - Türkçe reklam metni
 * @param {string} [outputPath] - Opsiyonel çıktı yolu (verilmezse otomatik oluşturulur)
 * @param {object} [options] - Opsiyonel ses ayarları
 * @param {string} [options.voiceId] - Farklı ses ID'si
 * @param {number} [options.stability] - Ses kararlılığı (0-1)
 * @param {number} [options.similarityBoost] - Benzerlik güçlendirme (0-1)
 * @returns {Promise<string>} - Kaydedilen ses dosyası yolu
 */
export async function generateSpeech(text, outputPath, options = {}) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY ortam değişkeni tanımlanmamış");
  }

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    throw new Error("Seslendirme metni boş olamaz");
  }

  const voiceId = options.voiceId || DEFAULT_VOICE_ID;
  const stability = options.stability ?? 0.5;
  const similarityBoost = options.similarityBoost ?? 0.75;

  // Çıktı yolunu belirle
  const finalPath = outputPath || await getDefaultOutputPath();

  // Çıktı dizinini oluştur
  await fs.mkdir(path.dirname(finalPath), { recursive: true });

  console.log(`[tts] Seslendirme üretiliyor (${text.length} karakter)...`);

  const url = `${ELEVENLABS_URL}/${voiceId}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: text.trim(),
      model_id: MODEL_ID,
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
        style: 0.3,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`ElevenLabs API hatası (HTTP ${response.status}): ${errorBody}`);
  }

  // Ses verisini dosyaya yaz
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.length < 1000) {
    throw new Error("Üretilen ses dosyası çok küçük, muhtemelen hatalı");
  }

  await fs.writeFile(finalPath, buffer);

  const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
  console.log(`[tts] Ses dosyası kaydedildi: ${finalPath} (${sizeMB}MB)`);

  return finalPath;
}

/**
 * Varsayılan çıktı yolu oluşturur
 * @returns {Promise<string>}
 */
async function getDefaultOutputPath() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const timestamp = Date.now();
  return path.join(OUTPUT_DIR, `reklam_ses_${timestamp}.mp3`);
}
