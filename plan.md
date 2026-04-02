# Optimized Logo Pipeline — Sadece Kontext Max Multi

## HEDEF

Test Lab'da diğer tüm modelleri kaldır. Sadece **2 Aşamalı Pipeline** kalsın:
1. Flux Dev → temiz sahne üret (logosuz, göğüste boş patch)
2. Kontext Max Multi → sahne + logo referansıyla AI doğal yerleştirme

## AKIŞ

```
[Logo Yükle] → [Prompt Yaz] → [Test Et butonu]
         ↓
  Aşama 1: Flux Dev (text-to-image, logosuz)
  → Temiz sahne görseli üretilir
         ↓
  Aşama 2: Kontext Max Multi
  → image_urls: [sahne_url, logo_url]
  → Prompt: "@image2 logosunu @image1'deki kişilere yerleştir"
         ↓
  Sonuç: Logo doğal yerleştirilmiş final görsel
```

---

## DEĞİŞİKLİK 1: `src/app/api/test-model/route.js` — TAMAMİYLE YENİDEN YAZ

Tüm modelleri kaldır. Sadece 2 aşamalı pipeline kalsın.

```javascript
/**
 * POST /api/test-model — 2 Aşamalı Logo Pipeline
 * Body: { prompt, logoBase64, logoMimeType }
 * 
 * Aşama 1: Flux Dev ile temiz sahne üret
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
    if (!prompt) return NextResponse.json({ error: "prompt zorunlu" }, { status: 400 });
    if (!logoBase64) return NextResponse.json({ error: "Logo yüklenmeli" }, { status: 400 });

    configureFal();
    const startTime = Date.now();

    // 1. Logo'yu fal storage'a yükle
    const buf = Buffer.from(logoBase64, "base64");
    const file = new File([buf], "logo.png", { type: logoMimeType || "image/png" });
    const logoUrl = await fal.storage.upload(file);
    console.log("[test-lab] Logo yüklendi");

    // 2. Sahne promptunu logosuz hale getir
    const scenePrompt = transformPromptForPatchArea(prompt);

    // AŞAMA 1: Flux Dev ile temiz sahne üret
    console.log("[test-lab] Aşama 1: Temiz sahne üretiliyor (Flux Dev)...");
    const aşama1Start = Date.now();
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
    const aşama1Duration = ((Date.now() - aşama1Start) / 1000).toFixed(1);
    console.log(`[test-lab] Aşama 1 tamamlandı (${aşama1Duration}s)`);

    // AŞAMA 2: Kontext Max Multi ile logo yerleştir
    console.log("[test-lab] Aşama 2: Logo yerleştiriliyor (Kontext Max Multi)...");
    const aşama2Start = Date.now();
    const kontextPrompt = buildKontextPrompt();

    const result = await fal.subscribe("fal-ai/flux-pro/kontext/max/multi", {
      input: {
        prompt: kontextPrompt,
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
    const aşama2Duration = ((Date.now() - aşama2Start) / 1000).toFixed(1);
    console.log(`[test-lab] Aşama 2 tamamlandı (${aşama2Duration}s)`);

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[test-lab] Pipeline tamamlandı (${totalDuration}s)`);

    return NextResponse.json({
      imageUrl: finalUrl,
      sceneUrl,
      duration: parseFloat(totalDuration),
      steps: {
        scene: { duration: parseFloat(aşama1Duration) },
        logo: { duration: parseFloat(aşama2Duration) },
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
```

**Satır sayısı: ~130 satır** ✅

---

## DEĞİŞİKLİK 2: `src/app/dashboard/test-lab/page.js` — TAMAMİYLE YENİDEN YAZ

Tüm model kartlarını kaldır. Tek bir test arayüzü:
- Logo yükle
- Prompt yaz
- "Test Et" butonu
- Sonuç görüntüle (sahne + final yan yana)

```jsx
"use client";
import { useState, useRef, useCallback } from "react";

const DEFAULT_PROMPT = `Photorealistic portrait photo of two professional elevator 
maintenance technicians standing confidently in a modern high-rise building lobby 
with sleek glass elevators behind them. Both wearing clean navy blue work uniforms 
with the company logo clearly visible as an embroidered patch on their chest pockets.
One technician holds a professional toolkit, the other holds a digital tablet. 
The logo on their uniforms shows realistic fabric texture with subtle wrinkles 
and stitching detail around the patch. Golden hour light streams through 
floor-to-ceiling windows creating warm rim lighting. Shot on Sony A7IV, 50mm 
f/1.8, shallow depth of field, cinematic color grading with corporate blue 
and warm gold tones. Vertical portrait composition 9:16.`;

export default function TestLabPage() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoBase64, setLogoBase64] = useState(null);
  const [logoMimeType, setLogoMimeType] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleLogo = useCallback((file) => {
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setLogoMimeType(file.type);
    const reader = new FileReader();
    reader.onload = () => setLogoBase64(reader.result.split(",")[1]);
    reader.readAsDataURL(file);
  }, []);

  const runTest = async () => {
    if (!logoBase64 || !prompt) return;
    setIsRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/test-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, logoBase64, logoMimeType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div>
        <h1 className="text-2xl font-bold mb-1">Logo Pipeline Test 🎯</h1>
        <p className="text-[var(--text-secondary)]">
          2 Aşamalı: Flux Dev (sahne) → Kontext Max Multi (logo yerleştirme)
        </p>
      </div>

      {/* Logo + Prompt yan yana */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Logo Upload */}
        <div className="glass-card p-5 rounded-2xl">
          <h3 className="text-sm font-semibold mb-3">Logo (PNG)</h3>
          {/* ... logo upload bileşeni (mevcut koddan al) */}
        </div>

        {/* Prompt */}
        <div className="lg:col-span-2 glass-card p-5 rounded-2xl">
          <h3 className="text-sm font-semibold mb-3">Sahne Promptu</h3>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
            rows={6} className="w-full px-4 py-3 rounded-xl bg-white/[0.04] 
            border border-white/10 text-sm ..." />
        </div>
      </div>

      {/* Test Et butonu */}
      <button onClick={runTest} disabled={isRunning || !logoBase64}
        className="btn-primary px-8 py-3">
        {isRunning ? "🔄 Pipeline Çalışıyor..." : "🚀 Test Et"}
      </button>

      {/* Hata */}
      {error && <div className="text-red-400 text-sm p-4 ...">{error}</div>}

      {/* Sonuç — Sahne + Final yan yana */}
      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Aşama 1: Sahne */}
          <div className="glass-card p-4 rounded-2xl">
            <h3 className="text-sm font-semibold mb-2">
              Aşama 1: Temiz Sahne 
              <span className="text-green-400 ml-2">{result.steps.scene.duration}s</span>
            </h3>
            <img src={result.sceneUrl} className="w-full rounded-xl" />
          </div>

          {/* Aşama 2: Final */}
          <div className="glass-card p-4 rounded-2xl">
            <h3 className="text-sm font-semibold mb-2">
              Aşama 2: Logo Yerleştirilmiş
              <span className="text-green-400 ml-2">{result.steps.logo.duration}s</span>
            </h3>
            <img src={result.imageUrl} className="w-full rounded-xl" />
          </div>

          {/* Toplam süre + İndir */}
          <div className="md:col-span-2 flex items-center gap-4">
            <span className="text-sm text-green-400">
              Toplam: {result.duration}s
            </span>
            <a href={result.imageUrl} download target="_blank"
              className="text-sm text-purple-400 hover:text-purple-300">
              Final Görseli İndir
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
```

Not: Yukarıdaki JSX iskelet. Claude Code tam CSS class'ları ve detayları mevcut koddan alıp düzgün yazacak.

**Sayfa yapısı:**
- Logo upload (sol) + Prompt (sağ)  
- Test Et butonu
- Sonuç: 2 görsel yan yana (sahne + final)
- Toplam süre + indirme linki
- **Model kartları YOK**, toggle YOK — tek buton

**Satır sayısı: ~200 satır** (fullscreen modal dahil) ✅

---

## DEĞİŞİKLİK 3: `src/lib/pipeline/image-gen.js` — GÜNCELLE

Ana pipeline için de aynı 2 aşamalı stratejiye geç:

- `processImageWithLogo()` import'unu KALDIR
- `logo-composite.js` artık kullanılmayacak (silinmese de sorun olmaz)
- `generateSingleImage()` yeni akış:
  1. `transformPromptForPatchArea(prompt)` 
  2. Flux Dev ile sahne üret → `sceneUrl`
  3. Logo'yu fal storage'a yükle → `logoUrl`  
  4. Kontext Max Multi ile birleştir → `finalUrl`
  5. İndir ve kaydet

**Kontext Max Multi model ID:** `fal-ai/flux-pro/kontext/max/multi`

**Satır sayısı: ~200 satır** ✅

---

## UYGULAMA SIRASI

```
1. src/app/api/test-model/route.js TAMAMİYLE YENİDEN YAZ
   - Tüm MODELS objesini kaldır
   - Sadece 2 aşamalı pipeline fonksiyonları
   - GET: pipeline bilgisi döndür
   - POST: prompt + logoBase64 al, 2 aşama çalıştır, sonuç döndür

2. src/app/dashboard/test-lab/page.js TAMAMİYLE YENİDEN YAZ  
   - Model kartlarını kaldır
   - Tek test arayüzü: logo + prompt + buton
   - Sonuç: sahne + final yan yana göster

3. src/lib/pipeline/image-gen.js GÜNCELLE
   - Kontext Max Multi 2 aşamalı akışa geç  
   - processImageWithLogo import'unu kaldır

4. npm run build — hatasız derlenmeli

5. TEST: localhost:3000/dashboard/test-lab
   - Logo yükle
   - Test Et'e bas
   - Aşama 1 (sahne) + Aşama 2 (logolu) yan yana göster
```

## ÖNEMLİ KURALLAR
- Her dosya MAX 350 satır
- ESM format (import/export)
- Türkçe log mesajları: `[test-lab]` prefix
- `process.env.FAL_KEY` kullan
- `image_urls: [sceneUrl, logoUrl]` — sıra önemli! @image1=sahne, @image2=logo
- `output_format: "png"` — logo kalitesi için
- `safety_tolerance: 5` — reklam içerikleri için
