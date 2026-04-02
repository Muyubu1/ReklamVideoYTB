/**
 * POST /api/test-model — 4 Aşamalı Kusursuz Logo Pipeline
 * Body: { prompt, logoBase64, logoMimeType }
 *
 * Aşama 1: Flux Dev → temiz sahne üret (logosuz)
 * Aşama 2: Gemini Vision → göğüs alanı tespit et
 * Aşama 3: Sharp → logoyu kaba yerleştir (over blend + blur)
 * Aşama 4: Flux Inpainting → sadece logo alanını harmonize et (mask bazlı)
 *
 * GET /api/test-model — Pipeline bilgisi
 */

import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import sharp from "sharp";
import { detectPatchCoordinates, compositeLogoOnImage, generateInpaintMask } from "@/lib/pipeline/logo-composite";
import { transformPromptForPatchArea, harmonizeWithFlux } from "@/lib/pipeline/image-gen";

export async function GET() {
  return NextResponse.json({
    pipeline: {
      name: "4 Aşamalı Kusursuz Logo Pipeline",
      description: "Flux Dev (sahne) → Gemini (tespit) → Sharp (kaba yerleştirme) → Flux Inpainting (harmonize)",
      steps: [
        { name: "Temiz Sahne", model: "Flux Dev" },
        { name: "Göğüs Tespiti", model: "Gemini 2.5 Flash" },
        { name: "Kaba Yerleştirme", engine: "Sharp Composite" },
        { name: "Harmonizasyon", model: "Flux Inpainting (mask-based)" },
      ],
    },
  });
}

export async function POST(request) {
  try {
    const { prompt, logoBase64, logoMimeType } = await request.json();
    if (!prompt) return NextResponse.json({ error: "prompt zorunlu" }, { status: 400 });
    if (!logoBase64) return NextResponse.json({ error: "Logo gerekli" }, { status: 400 });

    configureFal();
    const startTime = Date.now();

    // AŞAMA 1: Flux Dev ile temiz sahne üret
    console.log("[pipeline] Aşama 1: Temiz sahne üretiliyor (Flux Dev)...");
    const s1Start = Date.now();
    const scenePrompt = transformPromptForPatchArea(prompt);

    const sceneResult = await fal.subscribe("fal-ai/flux/dev", {
      input: {
        prompt: scenePrompt,
        image_size: "portrait_4_3",
        num_images: 1,
        num_inference_steps: 28,
        guidance_scale: 3.5,
        enable_safety_checker: false,
      },
      logs: false,
    });

    const sceneUrl = sceneResult.data?.images?.[0]?.url;
    if (!sceneUrl) throw new Error("Sahne üretilemedi");
    const s1Duration = ((Date.now() - s1Start) / 1000).toFixed(1);
    console.log(`[pipeline] Aşama 1 tamam (${s1Duration}s)`);

    // Sahne görselini indir
    const sceneRes = await fetch(sceneUrl);
    const sceneBuffer = Buffer.from(await sceneRes.arrayBuffer());

    // AŞAMA 2: Gemini Vision ile göğüs alanı tespiti
    console.log("[pipeline] Aşama 2: Göğüs alanı tespiti (Gemini Vision)...");
    const s2Start = Date.now();
    const detection = await detectPatchCoordinates(sceneBuffer);
    const s2Duration = ((Date.now() - s2Start) / 1000).toFixed(1);
    console.log(`[pipeline] Aşama 2 tamam (${s2Duration}s) — ${detection.patches?.length || 0} alan`);

    // AŞAMA 3: Sharp ile kaba logo yerleştirme
    console.log("[pipeline] Aşama 3: Kaba logo yerleştirme (Sharp)...");
    const s3Start = Date.now();
    const logoBuffer = Buffer.from(logoBase64, "base64");
    const compositeBuffer = await compositeLogoOnImage(sceneBuffer, logoBuffer, detection.patches);
    const s3Duration = ((Date.now() - s3Start) / 1000).toFixed(1);
    console.log(`[pipeline] Aşama 3 tamam (${s3Duration}s)`);

    // Kaba composite görseli base64 (frontend'de gösterilecek)
    const compositeDataUrl = `data:image/png;base64,${compositeBuffer.toString("base64")}`;

    // AŞAMA 4: Flux Inpainting ile logo alanı harmonizasyonu
    console.log("[pipeline] Aşama 4: Inpainting harmonizasyon...");
    const s4Start = Date.now();

    // Mask üret — logo alanları beyaz, geri kalan siyah
    const meta = await sharp(sceneBuffer).metadata();
    const maskBuffer = await generateInpaintMask(detection.patches, meta.width, meta.height);

    // Inpainting — sadece logo alanını işle, yüzler/arka plan DEĞİŞMEZ
    const harmonizedUrl = await harmonizeWithFlux(compositeBuffer, maskBuffer);

    // Harmonize görseli indir ve base64 yap
    const harmRes = await fetch(harmonizedUrl);
    const harmBuffer = Buffer.from(await harmRes.arrayBuffer());
    const finalDataUrl = `data:image/png;base64,${harmBuffer.toString("base64")}`;
    const s4Duration = ((Date.now() - s4Start) / 1000).toFixed(1);
    console.log(`[pipeline] Aşama 4 tamam (${s4Duration}s)`);

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[pipeline] Tamamlandı (${totalDuration}s)`);

    return NextResponse.json({
      imageUrl: finalDataUrl,
      compositeUrl: compositeDataUrl,
      sceneUrl,
      duration: parseFloat(totalDuration),
      patchCount: detection.patches?.length || 0,
      steps: {
        scene: { duration: parseFloat(s1Duration) },
        detection: { duration: parseFloat(s2Duration), patches: detection.patches },
        composite: { duration: parseFloat(s3Duration) },
        harmonization: { duration: parseFloat(s4Duration) },
      },
    });
  } catch (err) {
    console.error("[pipeline] Hata:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function configureFal() {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY tanımlanmamış");
  fal.config({ credentials: key });
}
