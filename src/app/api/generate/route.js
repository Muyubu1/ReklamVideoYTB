/**
 * POST /api/generate — Video üretim pipeline'ını başlatır
 * FormData: logo (file) + firma_adi, sektor, konsept, video_suresi, ses_dili
 * Döndürür: { jobId }
 */

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { runPipeline } from "@/lib/pipeline/orchestrator";
import { convertPathsToUrls } from "@/lib/utils";

// Aktif ve tamamlanmış işler (MVP — Faz 2'de DB'ye geçilecek)
const activeJobs = new Map();

export { activeJobs };

export async function POST(request) {
  try {
    const formData = await request.formData();

    const logoFile = formData.get("logo");
    const firma_adi = formData.get("firma_adi");
    const sektor = formData.get("sektor");
    const konsept = formData.get("konsept");
    const video_suresi = parseInt(formData.get("video_suresi") || "20", 10);

    // Validasyon
    if (!logoFile || !(logoFile instanceof File)) {
      return NextResponse.json({ error: "Logo dosyası zorunludur" }, { status: 400 });
    }
    if (!firma_adi || !sektor || !konsept) {
      return NextResponse.json(
        { error: "firma_adi, sektor ve konsept alanları zorunludur" },
        { status: 400 }
      );
    }

    // Logo dosyasını kaydet
    const logoDir = path.join(process.cwd(), "output", "images");
    await fs.mkdir(logoDir, { recursive: true });

    const ext = path.extname(logoFile.name) || ".png";
    const logoFilename = `logo_${uuidv4().slice(0, 8)}${ext}`;
    const logoPath = path.join(logoDir, logoFilename);

    const logoBuffer = Buffer.from(await logoFile.arrayBuffer());
    await fs.writeFile(logoPath, logoBuffer);

    // Job oluştur
    const jobId = uuidv4();
    const job = {
      id: jobId,
      status: "processing",
      steps: {
        scenario: { status: "pending" },
        image: { status: "pending" },
        video: { status: "pending" },
        tts: { status: "pending" },
        merge: { status: "pending" },
      },
      // Pipeline sonuç verileri
      finalVideoPath: null,
      audioPath: null,
      scenes: [],
      scenario: null,
      // Meta bilgiler
      input: { firma_adi, sektor, konsept, video_suresi },
      createdAt: new Date().toISOString(),
      completedAt: null,
      error: null,
    };

    activeJobs.set(jobId, job);

    // Pipeline'ı arka planda başlat
    runPipelineInBackground(jobId, {
      firma_adi,
      sektor,
      konsept,
      video_suresi,
      logoPath,
    });

    return NextResponse.json({ jobId, status: "processing" });
  } catch (err) {
    console.error("[api/generate] Hata:", err.message);
    return NextResponse.json({ error: "Sunucu hatası: " + err.message }, { status: 500 });
  }
}

/**
 * Pipeline'ı arka planda çalıştırır ve job durumunu gerçek zamanlı günceller
 */
async function runPipelineInBackground(jobId, input) {
  const job = activeJobs.get(jobId);
  if (!job) return;

  try {
    const onProgress = ({ status, steps }) => {
      job.status = status;
      job.steps = steps;
    };

    const result = await runPipeline(input, onProgress);

    // Tüm sonuç verilerini kaydet
    job.status = result.status;
    job.steps = result.steps;
    job.finalVideoPath = result.finalVideoPath;
    job.audioPath = result.audioPath || null;
    job.scenes = result.scenes || [];
    job.scenario = result.scenario || null;
    job.completedAt = new Date().toISOString();

    if (result.error) {
      job.error = result.error;
    }
  } catch (err) {
    job.status = "error";
    job.error = err.message;
    job.completedAt = new Date().toISOString();
    console.error(`[api/generate] Job ${jobId} başarısız:`, err.message);
  }
}

/**
 * GET /api/generate — Tüm işlerin listesini döndürür (geçmiş dahil)
 */
export async function GET() {
  const jobs = Array.from(activeJobs.values())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((job) => ({
      id: job.id,
      status: job.status,
      input: job.input,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      ...convertPathsToUrls({
        finalVideoPath: job.finalVideoPath,
        audioPath: job.audioPath,
        scenes: job.scenes || [],
      }),
    }));

  return NextResponse.json({ jobs });
}
