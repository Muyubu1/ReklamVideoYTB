/**
 * GET /api/files/[...filepath] — output/ klasöründen dosya servisi
 * Örnek: /api/files/final/video.mp4 → output/final/video.mp4
 * Güvenlik: Sadece output/ altındaki dosyalara izin verir
 */

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const OUTPUT_ROOT = path.join(process.cwd(), "output");

const MIME_TYPES = {
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export async function GET(request, { params }) {
  const { filepath } = await params;

  if (!filepath || filepath.length === 0) {
    return NextResponse.json({ error: "Dosya yolu belirtilmemiş" }, { status: 400 });
  }

  // Path traversal koruması
  const relativePath = filepath.join("/");
  if (relativePath.includes("..") || relativePath.startsWith("/")) {
    return NextResponse.json({ error: "Geçersiz dosya yolu" }, { status: 403 });
  }

  const fullPath = path.join(OUTPUT_ROOT, relativePath);

  // output/ dizini dışına çıkmayı engelle
  if (!fullPath.startsWith(OUTPUT_ROOT)) {
    return NextResponse.json({ error: "Erişim reddedildi" }, { status: 403 });
  }

  try {
    const stat = await fs.stat(fullPath);
    if (!stat.isFile()) {
      return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 });
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const buffer = await fs.readFile(fullPath);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": stat.size.toString(),
        "Content-Disposition": `inline; filename="${path.basename(fullPath)}"`,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 });
  }
}
