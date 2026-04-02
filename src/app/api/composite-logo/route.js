/**
 * POST /api/composite-logo — Standalone logo composite endpoint
 * Body: { generatedImageUrl, logoBase64, logoMimeType }
 *
 * 1. generatedImageUrl'den görseli indir
 * 2. Patch koordinatlarını tespit et (Gemini Vision)
 * 3. Logoyu programatik yerleştir (Sharp)
 * 4. Sonucu base64 data URL olarak döndür
 */

import { NextResponse } from "next/server";
import { detectPatchCoordinates, compositeLogoOnImage } from "@/lib/pipeline/logo-composite";

export async function POST(request) {
  try {
    const body = await request.json();
    const { generatedImageUrl, logoBase64, logoMimeType } = body;

    if (!generatedImageUrl) {
      return NextResponse.json(
        { error: "generatedImageUrl zorunlu" },
        { status: 400 }
      );
    }
    if (!logoBase64) {
      return NextResponse.json(
        { error: "logoBase64 zorunlu" },
        { status: 400 }
      );
    }

    console.log("[composite-logo] Composite işlemi başlıyor...");
    const startTime = Date.now();

    // 1. Görseli indir
    let imageBuffer;
    if (generatedImageUrl.startsWith("data:")) {
      // Base64 data URL
      const base64Data = generatedImageUrl.split(",")[1];
      imageBuffer = Buffer.from(base64Data, "base64");
    } else {
      // HTTP URL
      const res = await fetch(generatedImageUrl);
      if (!res.ok) {
        throw new Error(`Görsel indirilemedi (HTTP ${res.status})`);
      }
      const arrayBuffer = await res.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    }

    // 2. Logo buffer oluştur
    const logoBuffer = Buffer.from(logoBase64, "base64");

    // 3. Patch koordinatlarını tespit et
    const imageBase64 = imageBuffer.toString("base64");
    const imageMime = generatedImageUrl.startsWith("data:image/png") ? "image/png" : "image/jpeg";
    const detection = await detectPatchCoordinates(imageBase64, imageMime);

    // 4. Logoyu yerleştir
    const resultBuffer = await compositeLogoOnImage({
      imageBuffer,
      logoBuffer,
      patches: detection.patches,
    });

    // 5. Base64 data URL olarak döndür
    const resultBase64 = resultBuffer.toString("base64");
    const resultUrl = `data:image/png;base64,${resultBase64}`;

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[composite-logo] Tamamlandı (${duration}s), ${detection.patches?.length || 0} patch`);

    return NextResponse.json({
      imageUrl: resultUrl,
      patchCount: detection.patches?.length || 0,
      duration: parseFloat(duration),
    });
  } catch (err) {
    console.error("[composite-logo] Hata:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
