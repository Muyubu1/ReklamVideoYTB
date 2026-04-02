/**
 * POST /api/test-model — 2 Aşamalı Logo Pipeline
 * Body: { prompt, logoBase64, logoMimeType }
 *
 * Aşama 1: Flux Dev ile temiz sahne üret (logosuz, boş patch)
 * Aşama 2: Kontext Max Multi ile logo yerleştir
 *
 * GET /api/test-model — Pipeline bilgisi
 */

import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

export async function GET() {
  return NextResponse.json({
    pipeline: {
      name: "2 Aşamalı Logo Pipeline",
      description: "Flux Dev ile sahne üret, Kontext Max Multi ile logoyu yerleştir",
      steps: [
        { name: "Sahne Üretimi", model: "Flux Dev", id: "fal-ai/flux/dev" },
        { name: "Logo Yerleştirme", model: "Kontext Max Multi", id: "fal-ai/flux-pro/kontext/max/multi" },
      ],
    },
  });
}

export async function POST(request) {
  try {
    const { prompt, logoBase64, logoMimeType } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "prompt zorunlu" }, { status: 400 });
    }
    if (!logoBase64) {
      return NextResponse.json({ error: "Logo yüklenmeli" }, { status: 400 });
    }

    configureFal();
    const startTime = Date.now();

    // Logo'yu fal storage'a yükle
    const buf = Buffer.from(logoBase64, "base64");
    const file = new File([buf], "logo.png", { type: logoMimeType || "image/png" });
    const logoUrl = await fal.storage.upload(file);
    console.log("[test-lab] Logo yüklendi");

    // Sahne promptunu logosuz hale getir
    const scenePrompt = transformPromptForPatchArea(prompt);

    // AŞAMA 1: Flux Dev ile temiz sahne üret
    console.log("[test-lab] Aşama 1: Temiz sahne üretiliyor (Flux Dev)...");
    const stage1Start = Date.now();

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
    if (!sceneUrl) throw new Error("Sahne görseli üretilemedi");

    const stage1Duration = ((Date.now() - stage1Start) / 1000).toFixed(1);
    console.log(`[test-lab] Aşama 1 tamamlandı (${stage1Duration}s)`);

    // AŞAMA 2: Kontext Max Multi ile logo yerleştir
    console.log("[test-lab] Aşama 2: Logo yerleştiriliyor (Kontext Max Multi)...");
    const stage2Start = Date.now();

    const result = await fal.subscribe("fal-ai/flux-pro/kontext/max/multi", {
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

    const finalUrl = result.data?.images?.[0]?.url;
    if (!finalUrl) throw new Error("Logo yerleştirme başarısız");

    const stage2Duration = ((Date.now() - stage2Start) / 1000).toFixed(1);
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[test-lab] Aşama 2 tamamlandı (${stage2Duration}s)`);
    console.log(`[test-lab] Pipeline tamamlandı (${totalDuration}s)`);

    return NextResponse.json({
      imageUrl: finalUrl,
      sceneUrl,
      duration: parseFloat(totalDuration),
      steps: {
        scene: { duration: parseFloat(stage1Duration) },
        logo: { duration: parseFloat(stage2Duration) },
      },
    });
  } catch (err) {
    console.error("[test-lab] Hata:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function configureFal() {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY tanımlanmamış");
  fal.config({ credentials: key });
}

/**
 * Prompt'taki logo referanslarını boş patch ile değiştirir
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
 * Kontext Max Multi için optimize edilmiş logo yerleştirme promptu
 * @image1 = sahne görseli, @image2 = logo
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
