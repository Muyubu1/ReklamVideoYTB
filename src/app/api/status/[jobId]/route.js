/**
 * GET /api/status/[jobId] — Video üretim durumunu sorgular
 * Döndürür: jobId, status, steps, dosya URL'leri, senaryo metni, sahneler
 */

import { NextResponse } from "next/server";
import { activeJobs } from "@/app/api/generate/route";
import { convertPathsToUrls } from "@/lib/utils";

export async function GET(request, { params }) {
  const { jobId } = await params;

  if (!jobId) {
    return NextResponse.json({ error: "jobId parametresi zorunludur" }, { status: 400 });
  }

  const job = activeJobs.get(jobId);

  if (!job) {
    return NextResponse.json({ error: "İş bulunamadı" }, { status: 404 });
  }

  // Sunucu dosya yollarını tarayıcı URL'lerine çevir
  const urls = convertPathsToUrls({
    finalVideoPath: job.finalVideoPath,
    audioPath: job.audioPath,
    scenes: job.scenes || [],
  });

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    steps: job.steps,
    error: job.error || null,
    input: job.input,
    createdAt: job.createdAt,
    completedAt: job.completedAt || null,
    // Dosya URL'leri (/api/files/... formatında)
    finalVideoUrl: urls.finalVideoUrl,
    audioUrl: urls.audioUrl,
    scenes: urls.scenes,
    // Senaryo metni
    scenario: job.scenario || null,
  });
}
