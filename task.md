# Logo Composite Pipeline — Uygulama Planı

## Problem

AI görüntü üretim modelleri (Flux Kontext, GPT Image, Gemini vb.) logoları pixel-perfect üretemez. Logolar bozuk, bulanık veya farklı çıkar. Bu sektör genelinde bilinen bir sınırlamadır.

## Çözüm: Post-Production Composite

Logoyu AI modeline bırakmak yerine, görseli logosuz üretip sonradan programatik olarak yerleştirmek. Google, Adobe ve profesyonel reklam ajanslarının kullandığı standart yöntemdir.

## Mevcut Pipeline vs Yeni Pipeline

```
❌ ESKİ (Sorunlu):
Logo + Prompt → Flux Kontext → Görsel (bozuk logo)

✅ YENİ (Profesyonel):
Prompt (logosuz) → Flux API → Temiz Görsel
                                    ↓
                      Vision AI → Logo Koordinatları (x, y, w, h)
                                    ↓
                      Sharp/Pillow → Logo Overlay + Perspektif
                                    ↓
                             Final Görsel (%100 doğru logo)
```

---

## ADIM 1: Prompt'u Logosuz Hale Getir

### Ne Yapılacak

Mevcut prompt'tan logo ile ilgili tüm ifadeleri çıkar. Bunun yerine logonun yerleştirileceği alanı tanımlayan ifadeler ekle.

### Örnek

```
ÖNCEKİ PROMPT:
"...Both wearing clean navy blue work uniforms with the company logo
clearly visible as an embroidered patch on their chest pockets..."

YENİ PROMPT:
"...Both wearing clean navy blue work uniforms with a visible
embroidered rectangular patch area on their chest pockets.
The patch should be a plain, slightly lighter navy blue rectangle
with subtle stitching detail around the edges..."
```

### İpuçları

- "blank patch", "empty badge area", "plain rectangular patch" gibi ifadeler kullan
- Patch'in rengini üniformanın rengine yakın tut (daha kolay blend olur)
- Patch boyutunu belirt: "approximately 3x2 inch patch"
- Dikiş detayı iste: "with subtle stitching detail around the patch" (daha gerçekçi olur)

---

## ADIM 2: Görseli Üret (Mevcut Flux API)

### Ne Yapılacak

Mevcut Flux API entegrasyonunu kullanarak görseli logosuz üret. Bu adımda mevcut pipeline'ında değişiklik minimum.

### Dikkat Edilecekler

- Aynı Flux modellerini kullanmaya devam edebilirsin (Dev, Pro, Kontext)
- Logo referans görseli GÖNDERME — sadece text prompt gönder
- Çözünürlüğü yüksek tut (en az 1024x1024), logo yerleştirmede detay önemli
- Seed parametresini sakla — beğenilen sonuçları tekrar üretebilmek için

---

## ADIM 3: Logo Koordinatlarını Tespit Et

Bu adım en kritik kısım. 3 yöntem var, projenin ihtiyacına göre birini veya kombinasyonunu seç.

### Yöntem A: Vision AI ile Tespit (ÖNERİLEN)

En kolay ve en doğru yöntem. Üretilen görseli bir vision modeline gönderip "logo nereye yerleştirilmeli?" diye sor.

#### Kullanılabilecek API'ler

| API | Model | Fiyat/İstek | Hız |
|-----|-------|-------------|-----|
| Anthropic | Claude Sonnet | ~$0.003 | 1-2s |
| OpenAI | GPT-4o | ~$0.005 | 1-3s |
| Google | Gemini Flash | ~$0.001 | <1s |

#### Örnek API Çağrısı (Claude)

```javascript
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01"
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    messages: [{
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: "image/png",
            data: generatedImageBase64
          }
        },
        {
          type: "text",
          text: `Bu görselde üniformalı kişilerin göğüs bölgesindeki yama/patch alanlarını tespit et.

Her bir kişi için aşağıdaki JSON formatında yanıt ver, YALNIZCA JSON döndür:
{
  "patches": [
    {
      "person": 1,
      "x": <sol üst köşe x piksel>,
      "y": <sol üst köşe y piksel>,
      "width": <genişlik piksel>,
      "height": <yükseklik piksel>,
      "rotation_degrees": <eğim açısı>,
      "perspective": "frontal" | "slight_left" | "slight_right" | "angled"
    }
  ],
  "image_width": <toplam görsel genişliği>,
  "image_height": <toplam görsel yüksekliği>
}`
        }
      ]
    }]
  })
});

const data = await response.json();
const coordinates = JSON.parse(data.content[0].text);
```

#### Örnek API Çağrısı (Gemini — Ücretsiz Katman)

```javascript
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const result = await model.generateContent([
  {
    inlineData: {
      mimeType: "image/png",
      data: generatedImageBase64
    }
  },
  `Görseldeki kişilerin göğüs patch/yama alanlarının koordinatlarını JSON olarak ver.
  Format: { "patches": [{ "person": 1, "x": piksel, "y": piksel, "width": piksel, "height": piksel, "rotation_degrees": derece }] }`
]);

const coordinates = JSON.parse(result.response.text());
```

### Yöntem B: MediaPipe Pose Detection (Ücretsiz, Offline)

İnternet gerektirmez, tamamen ücretsiz. İnsan vücudu landmark noktalarından göğüs bölgesini hesaplar.

#### Kurulum

```bash
pip install mediapipe opencv-python Pillow
```

#### Python Kodu

```python
import mediapipe as mp
import cv2
import numpy as np

def detect_chest_area(image_path):
    """MediaPipe ile göğüs bölgesini tespit et"""
    mp_pose = mp.solutions.pose
    image = cv2.imread(image_path)
    h, w = image.shape[:2]

    with mp_pose.Pose(static_image_mode=True) as pose:
        results = pose.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))

        if not results.pose_landmarks:
            return None

        landmarks = results.pose_landmarks.landmark

        # Göğüs cebi = sağ omuz ile sağ kalça arasında,
        # yaklaşık %30 aşağıda, biraz içeride
        r_shoulder = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER]
        l_shoulder = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER]
        r_hip = landmarks[mp_pose.PoseLandmark.RIGHT_HIP]

        # Sağ kişi için göğüs cebi tahmini
        chest_x = int(r_shoulder.x * w + (l_shoulder.x * w - r_shoulder.x * w) * 0.15)
        chest_y = int(r_shoulder.y * h + (r_hip.y * h - r_shoulder.y * h) * 0.25)

        # Patch boyutu (omuz genişliğine orantılı)
        shoulder_width = abs(l_shoulder.x - r_shoulder.x) * w
        patch_w = int(shoulder_width * 0.25)
        patch_h = int(patch_w * 0.75)

        return {
            "x": chest_x - patch_w // 2,
            "y": chest_y - patch_h // 2,
            "width": patch_w,
            "height": patch_h
        }
```

### Yöntem C: Sabit Koordinat Haritası (En Basit)

Eğer ürettiğin görseller hep aynı composition'da ise (örn. hep 2 kişi karşıdan, portrait), sabit koordinat oranları tanımlayabilirsin.

```javascript
// Standart portrait composition için sabit oranlar
const PATCH_PRESETS = {
  "2_person_portrait": {
    person1: { xRatio: 0.28, yRatio: 0.42, wRatio: 0.06, hRatio: 0.045 },
    person2: { xRatio: 0.62, yRatio: 0.42, wRatio: 0.06, hRatio: 0.045 }
  },
  "1_person_portrait": {
    person1: { xRatio: 0.42, yRatio: 0.40, wRatio: 0.07, hRatio: 0.05 }
  }
};

function getCoordinates(preset, imageWidth, imageHeight) {
  const p = PATCH_PRESETS[preset];
  return Object.entries(p).map(([key, ratios]) => ({
    person: key,
    x: Math.round(ratios.xRatio * imageWidth),
    y: Math.round(ratios.yRatio * imageHeight),
    width: Math.round(ratios.wRatio * imageWidth),
    height: Math.round(ratios.hRatio * imageHeight)
  }));
}
```

### Hangi Yöntemi Seçmeli?

| Kriter | Vision AI (A) | MediaPipe (B) | Sabit Preset (C) |
|--------|--------------|---------------|-------------------|
| Doğruluk | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Hız | 1-3 saniye | <0.5 saniye | Anında |
| Maliyet | $0.001-0.005/istek | Ücretsiz | Ücretsiz |
| Farklı pozlar | Her poz çalışır | Çoğu poz çalışır | Sadece önceden tanımlı |
| Kurulum zorluğu | Kolay (API çağrısı) | Orta (Python gerek) | Çok kolay |
| Güvenilirlik | En yüksek | Orta-yüksek | Düşük (poz değişirse bozulur) |

**Öneri:** Vision AI (Yöntem A) ile başla. Hem en doğru hem de en kolay. Maliyet ihmal edilebilir düzeyde (görsel başına $0.001-0.005). Gemini Flash ile ücretsiz katmanda bile günde yüzlerce istek yapabilirsin.

---

## ADIM 4: Logoyu Görsele Yerleştir (Composite)

### Ne Yapılacak

Tespit edilen koordinatlara göre orijinal PNG logosunu görsele yerleştir. Perspektif, renk uyumu ve blend işlemleri uygula.

### Node.js ile (Sharp Kütüphanesi)

#### Kurulum

```bash
npm install sharp
```

#### Kod

```javascript
const sharp = require('sharp');

async function compositeLogoOnImage({
  imagePath,         // üretilen görsel yolu
  logoPath,          // orijinal logo PNG (transparan arka plan)
  outputPath,        // çıktı dosya yolu
  patches            // Vision AI'dan gelen koordinatlar
}) {
  const image = sharp(imagePath);
  const metadata = await image.metadata();

  // Her patch için logo hazırla ve composite et
  const composites = [];

  for (const patch of patches) {
    // Logo'yu patch boyutuna resize et
    const resizedLogo = await sharp(logoPath)
      .resize(patch.width, patch.height, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toBuffer();

    composites.push({
      input: resizedLogo,
      left: patch.x,
      top: patch.y,
      blend: 'over'
    });
  }

  // Logoları görsele yerleştir
  await image
    .composite(composites)
    .toFile(outputPath);

  return outputPath;
}

// Kullanım
await compositeLogoOnImage({
  imagePath: './generated-image.png',
  logoPath: './ADLlogo.png',
  outputPath: './final-with-logo.png',
  patches: [
    { x: 340, y: 280, width: 80, height: 60 },
    { x: 720, y: 295, width: 75, height: 56 }
  ]
});
```

### Python ile (Pillow Kütüphanesi)

#### Kurulum

```bash
pip install Pillow
```

#### Kod

```python
from PIL import Image, ImageEnhance

def composite_logo(image_path, logo_path, output_path, patches):
    """Logoyu görsele yerleştir"""
    base = Image.open(image_path).convert("RGBA")
    logo_original = Image.open(logo_path).convert("RGBA")

    for patch in patches:
        # Logo'yu patch boyutuna resize et
        logo = logo_original.copy()
        logo = logo.resize(
            (patch["width"], patch["height"]),
            Image.LANCZOS
        )

        # Eğer rotation varsa uygula
        if patch.get("rotation_degrees", 0) != 0:
            logo = logo.rotate(
                -patch["rotation_degrees"],
                expand=True,
                resample=Image.BICUBIC
            )

        # Opaklık ayarı (opsiyonel — kumaş efekti için)
        if patch.get("opacity", 1.0) < 1.0:
            alpha = logo.split()[3]
            alpha = ImageEnhance.Brightness(alpha).enhance(patch["opacity"])
            logo.putalpha(alpha)

        # Görsele yapıştır (alpha channel ile)
        base.paste(logo, (patch["x"], patch["y"]), logo)

    # RGB'ye çevir ve kaydet
    final = base.convert("RGB")
    final.save(output_path, quality=95)
    return output_path
```

---

## ADIM 5: Gerçekçilik İyileştirmeleri (Opsiyonel ama Önerilen)

### 5a. Kumaş Efekti (Embroidered Look)

Logonun düz bir sticker gibi değil, kumaşa işlenmiş gibi görünmesi için:

```python
from PIL import ImageFilter, ImageEnhance

def apply_fabric_effect(logo, base_image, patch):
    """Logoyu kumaşa işlenmiş gibi göster"""

    # 1. Hafif blur (nakış efekti)
    logo = logo.filter(ImageFilter.GaussianBlur(radius=0.5))

    # 2. Parlaklığı azalt (kumaş üzerinde mat görünüm)
    enhancer = ImageEnhance.Brightness(logo)
    logo = enhancer.enhance(0.85)

    # 3. Kontrastı hafif düşür
    enhancer = ImageEnhance.Contrast(logo)
    logo = enhancer.enhance(0.9)

    # 4. Patch bölgesinin aydınlatmasını al ve logoya uygula
    patch_region = base_image.crop((
        patch["x"], patch["y"],
        patch["x"] + patch["width"],
        patch["y"] + patch["height"]
    ))
    # Patch bölgesinin ortalama parlaklığına göre logo parlaklığını ayarla
    patch_brightness = sum(patch_region.convert("L").getdata()) / (patch["width"] * patch["height"])
    brightness_factor = patch_brightness / 128  # 128 = nötr
    enhancer = ImageEnhance.Brightness(logo)
    logo = enhancer.enhance(brightness_factor * 0.9)

    return logo
```

### 5b. Perspektif Dönüşümü

Kişi hafif yan dönükse, logoyu da perspektife uygun eğ:

```python
import numpy as np
from PIL import Image

def apply_perspective(logo, perspective_type="frontal"):
    """Perspektif dönüşümü uygula"""
    w, h = logo.size

    if perspective_type == "slight_left":
        # Sol tarafı hafif daralt
        coeffs = find_coeffs(
            [(0, 0), (w, 0), (w, h), (0, h)],          # kaynak
            [(w*0.05, h*0.03), (w, 0), (w, h), (0, h*0.97)]  # hedef
        )
    elif perspective_type == "slight_right":
        coeffs = find_coeffs(
            [(0, 0), (w, 0), (w, h), (0, h)],
            [(0, 0), (w*0.95, h*0.03), (w*0.95, h*0.97), (0, h)]
        )
    else:
        return logo  # frontal ise dönüşüm gerekmiyor

    return logo.transform((w, h), Image.PERSPECTIVE, coeffs, Image.BICUBIC)

def find_coeffs(source_coords, target_coords):
    """Perspektif katsayılarını hesapla"""
    matrix = []
    for s, t in zip(source_coords, target_coords):
        matrix.append([t[0], t[1], 1, 0, 0, 0, -s[0]*t[0], -s[0]*t[1]])
        matrix.append([0, 0, 0, t[0], t[1], 1, -s[1]*t[0], -s[1]*t[1]])
    A = np.matrix(matrix, dtype=float)
    B = np.array([coord for pair in source_coords for coord in pair], dtype=float)
    res = np.dot(np.linalg.inv(A.T * A) * A.T, B)
    return np.array(res).reshape(8)
```

---

## ADIM 6: Mevcut Uygulamana Entegre Et

### Next.js API Route Örneği

Mevcut VideoAI uygulamana eklenecek yeni endpoint:

```
/api/composite-logo
```

#### Dosya: `app/api/composite-logo/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(req: NextRequest) {
  const { generatedImageUrl, logoUrl, modelUsed } = await req.json();

  // 1. Görselleri indir
  const [imageBuffer, logoBuffer] = await Promise.all([
    fetch(generatedImageUrl).then(r => r.arrayBuffer()),
    fetch(logoUrl).then(r => r.arrayBuffer())
  ]);

  // 2. Vision AI ile koordinat tespit et
  const imageBase64 = Buffer.from(imageBuffer).toString('base64');
  const coordinates = await detectPatchCoordinates(imageBase64);

  // 3. Logo composite
  const finalImage = await compositeLogos(
    Buffer.from(imageBuffer),
    Buffer.from(logoBuffer),
    coordinates.patches
  );

  // 4. Sonucu döndür veya storage'a kaydet
  return new NextResponse(finalImage, {
    headers: { 'Content-Type': 'image/png' }
  });
}

async function detectPatchCoordinates(imageBase64: string) {
  // Gemini Flash (ücretsiz) veya Claude ile koordinat tespiti
  // ... (Adım 3'teki kod)
}

async function compositeLogos(
  imageBuffer: Buffer,
  logoBuffer: Buffer,
  patches: Array<{x: number, y: number, width: number, height: number}>
) {
  let image = sharp(imageBuffer);

  const composites = await Promise.all(
    patches.map(async (patch) => ({
      input: await sharp(logoBuffer)
        .resize(patch.width, patch.height, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .toBuffer(),
      left: patch.x,
      top: patch.y,
      blend: 'over' as const
    }))
  );

  return image.composite(composites).png().toBuffer();
}
```

### Mevcut Test Lab Akışına Entegrasyon

```
Mevcut akış:
[Logo Yükle] → [Prompt Yaz] → [Model Seç] → [Üret] → Sonuç

Yeni akış:
[Logo Yükle] → [Prompt Yaz] → [Model Seç] → [Üret (logosuz)]
     ↓                                              ↓
     └──────────→ [Post-Process API] ←──────────────┘
                         ↓
                   Final Sonuç (logo doğru)
```

Frontend'de değişiklik minimum:
1. Prompt'tan logo ifadelerini otomatik temizle (veya kullanıcıya seçenek sun)
2. Flux API'den dönen görseli `/api/composite-logo` endpoint'ine gönder
3. Composite edilmiş görseli kullanıcıya göster

---

## ADIM 7: Test ve Kalibrasyon

### Test Checklist

- [ ] Tek kişi, kameraya dönük — logo doğru yerleşiyor mu?
- [ ] İki kişi, kameraya dönük — her iki logonun da konumu doğru mu?
- [ ] Kişi hafif sola dönük — perspektif uygulanıyor mu?
- [ ] Kişi hafif sağa dönük — perspektif uygulanıyor mu?
- [ ] Karanlık ortam — logo parlaklığı uyumlu mu?
- [ ] Aydınlık ortam — logo parlaklığı uyumlu mu?
- [ ] Farklı çözünürlükler (512px, 1024px, 2048px) — logo orantılı mı?
- [ ] Farklı logo formatları (PNG, SVG) — transparan arka plan çalışıyor mu?

### Kalibrasyon İpuçları

- Vision AI'ın döndürdüğü koordinatları %5-10 küçült (logo genelde biraz küçük olmalı)
- Opaklığı %85-90 arasında tut (tam opak yapma, kumaş efekti için)
- Blur radius'u 0.3-0.7 arasında dene
- Farklı ışık koşullarında parlaklık faktörünü test et

---

## Maliyet Analizi

### Görsel Başına Toplam Maliyet

| Adım | Araç | Maliyet |
|------|------|---------|
| Görsel üretimi | Flux Kontext Pro | $0.04 |
| Koordinat tespiti | Gemini Flash | $0.001 (veya ücretsiz katman) |
| Logo composite | Sharp/Pillow (local) | $0.00 |
| **TOPLAM** | | **~$0.041/görsel** |

### Karşılaştırma

- Flux Kontext Max Multi (mevcut, bozuk logo): $0.08/görsel
- Yeni pipeline (doğru logo): $0.041/görsel
- **Sonuç: Hem daha ucuz hem de %100 doğru logo**

---

## Gerekli Teknolojiler Özeti

| Teknoloji | Ne İçin | Kurulum |
|-----------|---------|---------|
| Node.js + Sharp | Logo resize & composite | `npm install sharp` |
| Gemini Flash API | Koordinat tespiti | Google AI Studio'dan API key |
| Flux API (mevcut) | Görsel üretimi | Zaten mevcut |
| Python + Pillow (opsiyonel) | Gelişmiş efektler | `pip install Pillow` |
| MediaPipe (opsiyonel) | Offline pose detection | `pip install mediapipe` |

---

## Sonraki Adımlar

1. **Hemen:** Gemini Flash API key'i al (ücretsiz) — [Google AI Studio](https://aistudio.google.com)
2. **Gün 1:** Sharp kütüphanesini kur, basit composite fonksiyonunu yaz ve test et
3. **Gün 2:** Vision AI koordinat tespiti fonksiyonunu yaz ve test et
4. **Gün 3:** İkisini birleştirip `/api/composite-logo` endpoint'ini oluştur
5. **Gün 4:** Mevcut Test Lab frontend'ine entegre et
6. **Gün 5:** Kumaş efekti ve perspektif dönüşümünü ekle
7. **Gün 6-7:** Farklı senaryolarla test et ve kalibre et

---

## Notlar

- Logo dosyası mutlaka **transparan PNG** olmalı (JPEG olmaz)
- Sharp kütüphanesi Node.js native module olduğu için deploy ortamında uyumluluk kontrol et
- Vision AI prompt'unu Türkçe veya İngilizce yazabilirsin, ikisi de çalışır
- Koordinat tespiti için Claude, GPT-4o veya Gemini arasında kalite farkı minimumdur, maliyet ve hıza göre seç
- Bu pipeline video frame'lerine de uygulanabilir (her frame'e aynı işlem)