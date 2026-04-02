/**
 * Pipeline Orkestratör
 * Tüm 5 adımı koordine eder ve durumları takip eder.
 * Senaryo → Görsel + Logo Composite → Video → Ses → Birleştir
 */

import path from "path";
import { generateScenario } from "./scenario.js";
import { generateImages } from "./image-gen.js";
import { generateVideos } from "./video-gen.js";
import { generateSpeech } from "./tts.js";
import { mergeVideos } from "./ffmpeg.js";

// Pipeline adım tanımları
const STEPS = ["scenario", "image", "video", "tts", "merge"];

/**
 * Pipeline durumu oluşturur
 * @returns {object} - Başlangıç durum nesnesi
 */
function createPipelineState() {
  const steps = {};
  for (const step of STEPS) {
    steps[step] = { status: "pending", startedAt: null, completedAt: null, error: null };
  }
  return {
    status: "processing",
    steps,
    startedAt: new Date().toISOString(),
    completedAt: null,
  };
}

/**
 * Adım durumunu günceller ve callback'i çağırır
 * @param {object} state - Pipeline durumu
 * @param {string} step - Adım adı
 * @param {"processing"|"completed"|"error"} status - Yeni durum
 * @param {Function} [onProgress] - İlerleme callback'i
 * @param {string} [error] - Hata mesajı
 */
function updateStep(state, step, status, onProgress, error = null) {
  const now = new Date().toISOString();
  state.steps[step].status = status;

  if (status === "processing") {
    state.steps[step].startedAt = now;
    console.log(`[pipeline] ▶ ${step} başladı`);
  } else if (status === "completed") {
    state.steps[step].completedAt = now;
    const duration = getDuration(state.steps[step].startedAt, now);
    console.log(`[pipeline] ✓ ${step} tamamlandı (${duration}s)`);
  } else if (status === "error") {
    state.steps[step].error = error;
    state.steps[step].completedAt = now;
    console.error(`[pipeline] ✗ ${step} hata: ${error}`);
  }

  // Callback ile dışarıya bildir
  if (onProgress) {
    onProgress({ status: state.status, steps: { ...state.steps } });
  }
}

/**
 * İki zaman damgası arasındaki süreyi saniye olarak hesaplar
 */
function getDuration(start, end) {
  if (!start || !end) return "?";
  return ((new Date(end) - new Date(start)) / 1000).toFixed(1);
}

/**
 * Tüm pipeline'ı çalıştırır
 *
 * @param {object} input
 * @param {string} input.firma_adi - Firma adı
 * @param {string} input.sektor - Sektör
 * @param {string} input.konsept - Konsept açıklaması
 * @param {number} [input.video_suresi=20] - Video süresi (saniye)
 * @param {string} input.logoPath - Logo dosya yolu
 * @param {Function} [onProgress] - İlerleme callback: ({ status, steps }) => void
 * @returns {Promise<object>} - { finalVideoPath, scenes, duration, status, steps }
 */
export async function runPipeline(input, onProgress) {
  const { firma_adi, sektor, konsept, video_suresi, logoPath } = input;

  if (!firma_adi || !sektor || !konsept || !logoPath) {
    throw new Error("firma_adi, sektor, konsept ve logoPath alanları zorunludur");
  }

  const state = createPipelineState();

  console.log("═".repeat(50));
  console.log(`[pipeline] Başlatılıyor: ${firma_adi} (${sektor})`);
  console.log("═".repeat(50));

  let scenario, imagePaths, videoPaths, audioPath, finalVideoPath;

  try {
    // ADIM 1: Senaryo üretimi
    updateStep(state, "scenario", "processing", onProgress);
    scenario = await generateScenario({ firma_adi, sektor, konsept, video_suresi });
    updateStep(state, "scenario", "completed", onProgress);

    // ADIM 2: Görsel üretimi + Logo Composite (4 sahne paralel)
    updateStep(state, "image", "processing", onProgress);
    imagePaths = await generateImages(logoPath, scenario.image_prompts);
    updateStep(state, "image", "completed", onProgress);

    // ADIM 3 ve 4: Video üretimi ve seslendirme PARALEL
    updateStep(state, "video", "processing", onProgress);
    updateStep(state, "tts", "processing", onProgress);

    const audioOutputPath = path.join(
      process.cwd(), "output", "audio", `reklam_${Date.now()}.mp3`
    );

    const [videoResult, audioResult] = await Promise.allSettled([
      generateVideos(imagePaths, scenario.video_prompts),
      generateSpeech(scenario.ad_script_tr, audioOutputPath),
    ]);

    // Video sonucunu değerlendir
    if (videoResult.status === "fulfilled") {
      videoPaths = videoResult.value;
      updateStep(state, "video", "completed", onProgress);
    } else {
      updateStep(state, "video", "error", onProgress, videoResult.reason.message);
      throw videoResult.reason;
    }

    // TTS sonucunu değerlendir
    if (audioResult.status === "fulfilled") {
      audioPath = audioResult.value;
      updateStep(state, "tts", "completed", onProgress);
    } else {
      updateStep(state, "tts", "error", onProgress, audioResult.reason.message);
      throw audioResult.reason;
    }

    // ADIM 5: FFmpeg birleştirme
    updateStep(state, "merge", "processing", onProgress);
    const finalOutputPath = path.join(
      process.cwd(), "output", "final",
      `${firma_adi.replace(/\s+/g, "_")}_${Date.now()}.mp4`
    );
    finalVideoPath = await mergeVideos(videoPaths, audioPath, finalOutputPath);
    updateStep(state, "merge", "completed", onProgress);

  } catch (err) {
    state.status = "error";
    state.completedAt = new Date().toISOString();

    for (const step of STEPS) {
      if (state.steps[step].status === "processing") {
        updateStep(state, step, "error", onProgress, err.message);
      }
    }

    const totalDuration = getDuration(state.startedAt, state.completedAt);
    console.error("═".repeat(50));
    console.error(`[pipeline] BAŞARISIZ (${totalDuration}s): ${err.message}`);
    console.error("═".repeat(50));

    return {
      finalVideoPath: null,
      audioPath: audioPath || null,
      scenes: buildScenesSummary(scenario, imagePaths, videoPaths),
      scenario: scenario || null,
      duration: parseFloat(totalDuration) || 0,
      status: "error",
      error: err.message,
      steps: state.steps,
    };
  }

  // Başarılı sonuç
  state.status = "completed";
  state.completedAt = new Date().toISOString();
  const totalDuration = getDuration(state.startedAt, state.completedAt);

  console.log("═".repeat(50));
  console.log(`[pipeline] TAMAMLANDI (${totalDuration}s)`);
  console.log(`[pipeline] Çıktı: ${finalVideoPath}`);
  console.log("═".repeat(50));

  return {
    finalVideoPath,
    audioPath: audioPath || null,
    scenes: buildScenesSummary(scenario, imagePaths, videoPaths),
    scenario,
    duration: parseFloat(totalDuration),
    status: "completed",
    steps: state.steps,
  };
}

/**
 * Sahne özetini oluşturur
 */
function buildScenesSummary(scenario, imagePaths, videoPaths) {
  if (!scenario) return [];

  return scenario.image_prompts.map((prompt, i) => ({
    index: i + 1,
    imagePrompt: prompt,
    videoPrompt: scenario.video_prompts[i],
    imagePath: imagePaths?.[i] || null,
    videoPath: videoPaths?.[i] || null,
  }));
}
