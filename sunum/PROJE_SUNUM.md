# VideoAI — AI Destekli Profesyonel Reklam Video Üretici

## Proje Sunumu

---

# 1. VİZYON VE PROBLEM

## Çözdüğümüz Problem

Türkiye'deki KOBİ'ler profesyonel reklam videosu üretmek için **ajansa binlerce lira** ödemek veya **günlerce beklemek** zorunda kalıyor. Bir montajcının 1 dakikalık tanıtım videosu üretmesi ortalama 3-5 iş günü sürüyor ve maliyeti 5.000-15.000 ₺ arasında değişiyor.

## Çözümümüz

Kullanıcı sadece **şirket logosunu yükleyip firma bilgilerini girer**. Gerisini yapay zeka halleder:

- Senaryo yazılır (yapay zeka)
- 4 sahnelik fotogerçekçi görseller üretilir (yapay zeka)
- Logo doğal şekilde kıyafetlere/yüzeylere yerleştirilir (görüş modeli + görüntü işleme)
- Her sahne videoya dönüştürülür (yapay zeka)
- Türkçe seslendirme eklenir (yapay zeka)
- Tek bir profesyonel MP4 dosyası olarak birleştirilir

**Toplam süre: ~10-12 dakika. Maliyet: ~$0.62/video.**

---

# 2. TEKNİK MİMARİ

## Teknoloji Yığını

| Katman | Teknoloji | Açıklama |
|--------|-----------|----------|
| **Framework** | Next.js 16 (App Router) | Full-stack React framework, SSR + API Routes |
| **Stil** | Tailwind CSS v4 | Utility-first CSS, dark tema, glass-morphism UI |
| **Görüntü İşleme** | Sharp v0.34 | Node.js tabanlı yüksek performanslı image processing |
| **Video İşleme** | FFmpeg (fluent-ffmpeg) | Video birleştirme, codec dönüşümü, ses overlay |
| **Veritabanı (MVP)** | In-Memory Map | Sunucu belleğinde iş takibi (Phase 2'de Supabase) |
| **Dil** | JavaScript (ESM) | ES Modules, async/await, Promise.allSettled |

## Proje Dosya Yapısı

```
src/
├── app/
│   ├── page.js                         ← Landing sayfası
│   ├── api/
│   │   ├── generate/route.js           ← POST: Video üretim başlat
│   │   ├── status/[jobId]/route.js     ← GET: İş durumu sorgula
│   │   ├── test-model/route.js         ← POST: Test Lab pipeline
│   │   ├── composite-logo/route.js     ← POST: Tek seferlik logo composite
│   │   └── files/[...filepath]/route.js← GET: Dosya sunucusu
│   └── dashboard/
│       ├── page.js                     ← Dashboard ana sayfa
│       ├── create/page.js              ← Video oluşturma + ilerleme takibi
│       ├── videos/page.js              ← Tüm videolar listesi
│       └── test-lab/page.js            ← Logo Pipeline test arayüzü
├── components/
│   ├── dashboard/
│   │   ├── VideoForm.jsx               ← Logo yükleme + firma bilgi formu
│   │   ├── ProgressTracker.jsx         ← 5 adımlı pipeline ilerleme çubuğu
│   │   ├── VideoCard.jsx               ← Video önizleme kartı
│   │   └── CreditBalance.jsx           ← Kredi bakiye widget'ı
│   └── landing/
│       ├── Hero.jsx                    ← Ana tanıtım bölümü
│       ├── HowItWorks.jsx             ← 3 adımlı süreç anlatımı
│       ├── Pricing.jsx                ← 4 fiyatlandırma planı
│       └── Footer.jsx                 ← Alt bilgi
└── lib/
    └── pipeline/
        ├── orchestrator.js             ← 5 adımlı pipeline koordinatörü
        ├── scenario.js                 ← Adım 1: LLM senaryo üretimi
        ├── image-gen.js                ← Adım 2: 4 aşamalı görsel üretimi
        ├── logo-composite.js           ← Gemini tespit + Sharp yerleştirme
        ├── video-gen.js                ← Adım 3: Görüntüden video üretimi
        ├── tts.js                      ← Adım 4: Türkçe seslendirme
        └── ffmpeg.js                   ← Adım 5: Video birleştirme
```

---

# 3. KULLANILAN AI ARAÇLARI VE API'LER

## 3.1 OpenRouter API — Senaryo Üretimi

| Özellik | Detay |
|---------|-------|
| **Amaç** | Türkçe reklam senaryosu + İngilizce görsel promptları üretmek |
| **Birincil Model** | Google Gemini 2.5 Flash (`google/gemini-2.5-flash-preview`) |
| **Yedek Model** | OpenAI GPT-4o Mini (`openai/gpt-4o-mini`) |
| **Neden OpenRouter?** | Tek API anahtarıyla birden fazla LLM sağlayıcısına erişim; model çökerse otomatik fallback |

**Giriş:** Firma adı, sektör, konsept, video süresi
**Çıkış (JSON):**
```json
{
  "ad_script_tr": "Türkçe reklam metni (max 60 kelime)",
  "image_prompts": ["Sahne 1 İngilizce prompt", "Sahne 2...", "Sahne 3...", "Sahne 4..."],
  "video_prompts": ["Kamera hareketi 1", "Kamera hareketi 2", "...", "..."]
}
```

**Neden 4 Farklı Sahne?**
Her sahnede logo farklı bir yüzeyde görünür:
1. Göğüse nakışlı yama (üniforma)
2. Kapıdaki fırçalanmış metal rozet
3. Işıklı/oyma tabela
4. Panel üzerindeki baskılı etiket

Bu çeşitlilik videonun profesyonel ve dinamik görünmesini sağlar.

---

## 3.2 Fal.ai — Görsel ve Video Üretimi

Fal.ai platformunda **3 farklı model** kullanıyoruz:

### A) Flux Dev — Metin-Görsel Üretimi (Text-to-Image)
| Özellik | Detay |
|---------|-------|
| **Model ID** | `fal-ai/flux/dev` |
| **Amaç** | 4 sahnelik fotogerçekçi görseller üretmek |
| **Çözünürlük** | Portrait 4:3 (9:16 dikey) |
| **Ayarlar** | 28 inference step, guidance 3.5 |
| **Süre** | ~3-4 saniye/görsel |
| **Maliyet** | ~$0.04/görsel |

### B) Flux Inpainting — Logo Harmonizasyonu (Mask-Based)
| Özellik | Detay |
|---------|-------|
| **Model ID** | `fal-ai/flux-general/inpainting` |
| **Amaç** | Sharp ile yerleştirilen logoyu kumaşla doğal harmanlama |
| **Girdi** | Logolu görsel + siyah/beyaz mask (logo alanı beyaz) |
| **Ayarlar** | strength: 0.35, 28 inference step, guidance 3.5 |
| **Kritik Fark** | Img2Img'den farklı olarak sadece mask'taki beyaz bölgeyi işler; yüzler, arka plan DEĞİŞMEZ |

### C) Kling v1.6 — Görüntüden Video Üretimi (Image-to-Video)
| Özellik | Detay |
|---------|-------|
| **Model ID** | `fal-ai/kling-video/v1.6/standard/image-to-video` |
| **Amaç** | Statik sahne görsellerini 5 saniyelik video kliplere dönüştürme |
| **Girdi** | Sahne görseli URL + kamera hareketi promptu |
| **Format** | 9:16 portrait, 5 saniye, MP4 |
| **Süre** | ~6 dakika/klip (pipeline'ın darboğazı) |
| **Maliyet** | ~$0.10/klip |

**Neden Fal.ai?**
- Queue-based API: Uzun süren video üretimini `fal.subscribe()` ile takip
- Dahili storage: `fal.storage.upload()` ile buffer'ları doğrudan CDN'e yükleme
- Tek API anahtarı ile birden fazla model (Flux, Kling) erişimi

---

## 3.3 Google Gemini 2.5 Flash — Görüş Modeli (Vision)

| Özellik | Detay |
|---------|-------|
| **Model** | `gemini-2.5-flash` |
| **API** | Google AI Studio (generativelanguage.googleapis.com) |
| **Amaç** | Görseldeki göğüs/cep alanını tespit ederek logo yerleşim koordinatlarını döndürme |
| **Sıcaklık** | 0.1 (deterministik, tutarlı sonuçlar) |
| **Çıkış Formatı** | 0-1000 normalize koordinatlar (JSON) |

**Neden Gemini Vision?**
- Hızlı ve ucuz görüş modeli (~$0.01/istek)
- JSON formatında yapılandırılmış çıktı üretebiliyor
- Kıyafet üzerindeki göğüs/cep bölgesini yüksek doğrulukla tespit ediyor

**Prompt Mühendisliği:**
Gemini'ye "tüm yamaları bul" yerine "kişi başına TAM 1 göğüs alanı bul" talimatı veriyoruz. Bu sayede yaka kıvrımlarını, düğmeleri veya isimlikleri yanlışlıkla logo alanı olarak algılama problemi çözüldü.

---

## 3.4 ElevenLabs — Türkçe Seslendirme (TTS)

| Özellik | Detay |
|---------|-------|
| **Model** | Multilingual v2 (`eleven_multilingual_v2`) |
| **Ses** | Adam (Türkçe uyumlu erkek ses) |
| **Amaç** | 60 kelimelik Türkçe reklam metnini doğal seslendirmeye çevirme |
| **Ayarlar** | stability: 0.5, similarity: 0.75, style: 0.3, speaker_boost: true |
| **Format** | MP3, ~15 saniye |
| **Maliyet** | ~$0.05/seslendirme |

**Neden ElevenLabs?**
- Türkçe telaffuz kalitesi rakiplerinden (Google TTS, Azure) belirgin şekilde üstün
- Doğal prozodi ve vurgu
- Multilingual v2 modeli 29+ dili destekliyor (gelecekte çok dilli destek)

---

## 3.5 Sharp — Görüntü İşleme Kütüphanesi

| Özellik | Detay |
|---------|-------|
| **Tür** | Node.js C++ binding (libvips) |
| **Amaç** | Logoyu programatik olarak görsele yerleştirme |
| **İşlemler** | resize, blur, affine transform, composite, mask üretimi |
| **Süre** | <0.1 saniye (son derece hızlı) |

**Neden Sharp (Yapay Zeka Değil)?**
Logo yerleştirme için bir AI modeli kullanmak yerine deterministik görüntü işleme tercih ettik çünkü:
1. **Kontrol:** Logonun tam piksel koordinatını, boyutunu, açısını biz belirliyoruz
2. **Tutarlılık:** Aynı koordinatlar her zaman aynı sonucu verir
3. **Hız:** <100ms (AI modeli 3-10 saniye sürerdi)
4. **Maliyet:** $0 (API çağrısı yok)

---

## 3.6 FFmpeg — Video Birleştirme

| Özellik | Detay |
|---------|-------|
| **Tür** | Sistem bağımlılığı (C binary) |
| **Wrapper** | fluent-ffmpeg (Node.js) |
| **Amaç** | 4 video klip + ses dosyasını tek MP4'e birleştirme |
| **Çıkış** | 1080×1920 (9:16), H.264, AAC 192kbps |
| **Süre** | ~10 saniye |

---

# 4. LOGO YERLEŞTİRME PİPELİNE'I — DERİN TEKNİK ANALİZ

Bu projenin en karmaşık ve yenilikçi kısmı, logonun fotogerçekçi görsellere **doğal nakış gibi** yerleştirilmesidir. 4 aşamalı bir pipeline geliştirdik:

## Neden Bu Kadar Karmaşık?

Basit bir "logoyu görsele yapıştır" yaklaşımı şu sorunları yaratıyor:

| Problem | Açıklama |
|---------|----------|
| **Sticker Efekti** | Logo sanki fotoğrafa sonradan yapıştırılmış gibi sırıtıyor |
| **Işık Uyumsuzluğu** | Logo düz, ama kumaşın üzerinde gölge ve ışık var |
| **Perspektif Hatası** | Kişi hafif yana dönükse logo düz duruyor, fiziksel olarak yanlış |
| **Kumaş Dokusu Eksikliği** | Gerçek nakışta iplik dokusu var, dijital yapıştırmada yok |

Bu sorunları çözmek için endüstri standardı **Image Harmonization** yaklaşımını benimsedik.

## 4 Aşamalı Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│  AŞAMA 1: TEMİZ SAHNE ÜRETİMİ (Flux Dev)                      │
│                                                                 │
│  Prompt'taki tüm "logo", "patch", "badge" kelimeleri SİLİNİR.  │
│  Flux'a eklenen talimat:                                        │
│  "Ensure the clothing is completely clean with NO added logos,   │
│   NO text, NO patches. A clean natural uniform fabric."         │
│                                                                 │
│  Sonuç: Üzerinde HİÇBİR işaret olmayan tertemiz üniforma       │
│  Süre: ~3 saniye                                                │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  AŞAMA 2: GÖĞÜS ALANI TESPİTİ (Gemini Vision)                  │
│                                                                 │
│  Gemini'ye gönderilen prompt:                                   │
│  "Find exactly ONE chest pocket area per person where a logo    │
│   would naturally be embroidered. Do NOT select collar flaps,   │
│   buttons, or name tags."                                       │
│                                                                 │
│  Çıktı (0-1000 normalize koordinatlar):                         │
│  { patches: [{ person:1, x_min, y_min, x_max, y_max,           │
│                perspective: "frontal"|"slight_left"|... }] }    │
│                                                                 │
│  Süre: ~5-6 saniye                                              │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  AŞAMA 3: KABA LOGO YERLEŞTİRME (Sharp)                        │
│                                                                 │
│  1. Logo → resize (patch alanının %95'i, fit: "contain")        │
│  2. Logo → blur(0.3) — jilet keskinliğini yumuşat              │
│  3. Logo → affine transform (perspektife göre hafif eğim)       │
│     - frontal → dönüşüm yok                                    │
│     - slight_left → shear matrix [1, -0.06, 0, 1]              │
│     - slight_right → shear matrix [1, 0.06, 0, 1]              │
│  4. Logo → over blend ile görsele yerleştir                     │
│                                                                 │
│  Ayrıca: Inpainting için siyah/beyaz MASK üretilir             │
│  (logo alanları beyaz, geri kalan siyah, 10px genişletme)       │
│                                                                 │
│  Süre: <0.1 saniye                                              │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  AŞAMA 4: HARMONİZASYON / FIRINLAMA (Flux Inpainting)          │
│                                                                 │
│  Model: fal-ai/flux-general/inpainting                          │
│                                                                 │
│  Girdi:                                                         │
│  - image_url: Aşama 3'ten çıkan logolu görsel                  │
│  - mask_url: Logo alanlarını gösteren siyah/beyaz mask          │
│  - prompt: "The company logo is naturally embroidered onto the  │
│     uniform fabric, seamlessly matching lighting, shadows, and  │
│     natural fabric wrinkles perfectly."                         │
│  - strength: 0.35                                               │
│                                                                 │
│  NE YAPAR:                                                      │
│  - SADECE mask'taki beyaz bölgeleri (logo alanlarını) yeniden   │
│    çizer                                                        │
│  - Yüzler, arka plan, vücut pozisyonu DEĞİŞMEZ                 │
│  - Logo kumaşın ışığına, gölgesine, kırışıklıklarına göre       │
│    organikleşir                                                 │
│                                                                 │
│  Süre: ~7 saniye                                                │
└─────────────────────────────────────────────────────────────────┘
```

## Daha Önce Denenen ve Başarısız Olan Yaklaşımlar

### Yaklaşım 1: Flux'a "Boş Yama Çiz" Demek
**Ne yaptık:** Prompt'ta Flux'a "göğüste boş dikdörtgen patch alanı olsun" dedik.
**Sonuç:** Flux kıyafete kocaman GRİ DİKDÖRTGEN çizdi. Çirkin ve yapay.
**Öğrenilen ders:** Flux'a ne isteMEdiğimizi söylemek daha etkili. "Logo olmasın" demek, "boş kutu çiz" demekten çok daha iyi sonuç verir.

### Yaklaşım 2: Multiply Blend Modu
**Ne yaptık:** Sharp'ta `multiply` blend ile logoyu kumaş dokusuna harmanlama.
**Sonuç:** Koyu kumaşlarda (lacivert, siyah) logonun tüm açık renkleri yok oldu. Lacivert × Beyaz = Lacivert. Logo neredeyse görünmez hale geldi.
**Öğrenilen ders:** Multiply modu sadece açık renkli yüzeylerde çalışır. Koyu kumaşlar için `over` blend + inpainting yaklaşımı gerekli.

### Yaklaşım 3: Flux Image-to-Image Harmonizasyon
**Ne yaptık:** Sharp composite sonrası `fal-ai/flux/dev/image-to-image` (strength: 0.20) ile tüm görseli yeniden işleme.
**Sonuç:** Yüzler değişti, arka plan değişti, kompozisyon bozuldu — ama logo hâlâ yapışık duruyor. Flux Img2Img mask desteklemediği için TÜM pikselleri yeniden üretiyor.
**Öğrenilen ders:** Global image-to-image, lokal harmonizasyon için uygun değil. Mask-based inpainting şart.

### Final Çözüm: Mask-Based Inpainting
Logo koordinatlarından otomatik siyah/beyaz mask üretip, sadece logo bölgesini Flux Inpainting ile yeniden çizdiriyoruz. Yüzler, arka plan, kıyafet dokunulmadan kalıyor. Logo ise kumaşın ışığına ve dokusuna göre organikleşiyor.

---

# 5. VİDEO OLUŞTURMA PİPELİNE'I — 5 ADIMLI ORKESTRASYON

## Genel Akış

```
KULLANICI GİRDİSİ
    │
    ▼
┌───────────────────────────────┐
│ Adım 1: SENARYO ÜRETİMİ      │  OpenRouter (Gemini 2.5 Flash)
│ ~3 saniye, ~$0.01             │  → Türkçe metin + 4 İngilizce prompt
└───────────┬───────────────────┘
            ▼
┌───────────────────────────────┐
│ Adım 2: GÖRSEL ÜRETİMİ       │  Flux Dev + Gemini Vision + Sharp + Flux Inpainting
│ ~15 saniye (4 sahne paralel)  │  → 4 adet fotogerçekçi logolu görsel
│ ~$0.20                        │
└───────────┬───────────────────┘
            ▼
┌───────────────────────────────────────────────────┐
│ Adım 3 & 4: VİDEO + SES (PARALEL)                │
│                                                   │
│ ┌─────────────────────┐  ┌──────────────────────┐ │
│ │ 3: VIDEO ÜRETİMİ    │  │ 4: SESLENDİRME       │ │
│ │ Kling v1.6           │  │ ElevenLabs           │ │
│ │ ~6 dk (4 sahne //l)  │  │ ~5 saniye            │ │
│ │ ~$0.40               │  │ ~$0.05               │ │
│ │ → 4 × 5sn MP4 klip  │  │ → 1 × Türkçe MP3    │ │
│ └─────────────────────┘  └──────────────────────┘ │
│                                                   │
│ Promise.allSettled() ile paralel çalışır           │
└───────────────────────┬───────────────────────────┘
                        ▼
┌───────────────────────────────┐
│ Adım 5: BİRLEŞTİRME          │  FFmpeg (concat demuxer)
│ ~10 saniye, $0.00             │  → 1080×1920, H.264, AAC 192kbps
└───────────────────────────────┘
            ▼
      FİNAL VİDEO (MP4)
```

## Paralel İşleme Stratejisi

Pipeline'daki en büyük darboğaz **video üretimi** (~6 dakika/klip). Bunu minimize etmek için:

1. **4 sahne görseli paralel üretilir** (`Promise.allSettled`)
2. **4 video klip paralel üretilir** (`Promise.allSettled`)
3. **Video + TTS paralel çalışır** — ses dosyası 5 saniyede hazır, video beklemeye devam
4. **Kısmi başarı tolere edilir** — 4 sahneden 3'ü başarılıysa pipeline devam eder

Bu strateji sayesinde 4 klip × 6 dakika = 24 dakika yerine **~6-7 dakika** yeterli oluyor.

## İş Takibi ve İlerleme Bildirimi

```javascript
// Her adım tamamlandığında güncellenir
job.steps = {
  scenario: { status: "completed", duration: 3.2 },
  image:    { status: "completed", duration: 15.1 },
  video:    { status: "processing", duration: null },  // ← şu an burada
  tts:      { status: "completed", duration: 4.8 },
  merge:    { status: "pending" }
}
```

Frontend her 3 saniyede `/api/status/[jobId]` endpoint'ini sorgulayarak kullanıcıya gerçek zamanlı ilerleme gösteriyor.

---

# 6. TEST LAB — LOGO PİPELİNE TEST ARAYÜZÜ

## Amaç

Logo yerleştirme kalitesini gerçek zamanlı test etmek ve optimizasyonları gözle doğrulamak için özel bir test sayfası geliştirdik.

## Özellikler

- **Logo Yükleme:** PNG/JPG/WebP drag & drop
- **Prompt Editörü:** Sahne açıklamasını özelleştirme
- **3 Görsel Karşılaştırma:**
  - Aşama 1: Temiz Sahne (Flux Dev) — logosuz baz görsel
  - Aşama 3: Kaba Yerleştirme (Sharp) — logo yapıştırılmış hali
  - Aşama 4: Kusursuz Final (Flux Inpainting) — harmonize edilmiş hali
- **Performans Metrikleri:** Her aşamanın süresi, toplam süre, tespit edilen alan sayısı
- **Fullscreen Önizleme:** Her görseli büyük boyutta inceleme
- **İndirme:** Final görseli doğrudan indirme

Bu 3'lü karşılaştırma sayesinde "yapıştırma → harmanlama" farkını gözle görmek mümkün.

---

# 7. FRONTEND MİMARİSİ

## Sayfa Yapısı

### Landing Sayfası (`/`)
| Bölüm | Bileşen | İçerik |
|-------|---------|--------|
| Hero | `Hero.jsx` | "AI ile Profesyonel Reklam Videoları" + CTA butonları |
| Nasıl Çalışır | `HowItWorks.jsx` | 3 adım: Yükle → AI üretir → İndir |
| Fiyatlandırma | `Pricing.jsx` | 4 plan: Tek Video (₺49) → Ajans (₺1499/ay) |
| Alt Bilgi | `Footer.jsx` | Bağlantılar, sosyal medya |

### Dashboard (`/dashboard`)
| Sayfa | İçerik |
|-------|--------|
| Ana Sayfa | Kredi bakiyesi, son videolar, istatistikler |
| Video Oluştur | Form (logo + bilgi) → 5 adımlı ilerleme takibi → Final video |
| Videolarım | Tüm üretilen videoların listesi, durum, indirme |
| Test Lab | Logo pipeline test arayüzü (3 aşama karşılaştırma) |

## UI/UX Tasarım Kararları

- **Dark Tema:** Profesyonel ve modern görünüm, göz yorgunluğunu azaltır
- **Glass-morphism:** Yarı saydam kartlar (`glass-card` class), derinlik hissi
- **Mor Accent:** Marka rengi olarak mor/purple, CTA butonlarda kullanım
- **Responsive:** Mobile-first tasarım, tüm ekran boyutlarına uyumlu
- **Gerçek Zamanlı Feedback:** İlerleme çubuğu, adım adım durum göstergeleri

---

# 8. MALİYET ANALİZİ

## Video Başına Üretim Maliyeti

| Adım | API | Birim Maliyet | Adet | Toplam |
|------|-----|---------------|------|--------|
| Senaryo | OpenRouter (Gemini) | $0.01 | 1 | $0.01 |
| Görsel Üretimi | Fal.ai (Flux Dev) | $0.04 | 4 | $0.16 |
| Logo Tespiti | Google AI (Gemini) | $0.01 | 4 | $0.04 |
| Harmonizasyon | Fal.ai (Flux Inpainting) | $0.04 | 4 | $0.16 |
| Video Üretimi | Fal.ai (Kling) | $0.10 | 4 | $0.40 |
| Seslendirme | ElevenLabs | $0.05 | 1 | $0.05 |
| Birleştirme | FFmpeg (yerel) | $0.00 | 1 | $0.00 |
| **TOPLAM** | | | | **~$0.82** |

## Fiyatlandırma ve Kar Marjı

| Plan | Fiyat | Video/Ay | Birim Fiyat | Maliyet | Brüt Marj |
|------|-------|----------|-------------|---------|-----------|
| Tek Video | ₺49 (~$1.50) | 1 | ₺49 | ~$0.82 | %45 |
| Başlangıç | ₺299/ay | 10 | ₺29.90 | ~$0.82 | %91 |
| Profesyonel | ₺699/ay | 30 | ₺23.30 | ~$0.82 | %88 |
| Ajans | ₺1499/ay | 100 | ₺14.99 | ~$0.82 | %83 |

---

# 9. GÜVENLİK VE HATA YÖNETİMİ

## API Güvenliği
- Tüm API anahtarları `.env.local` dosyasında, asla client'a açık değil
- Path traversal koruması (dosya sunucusu)
- Dosya boyutu limitleri (logo max 20MB)

## Hata Toleransı
| Senaryo | Strateji |
|---------|----------|
| Senaryo LLM çökerse | Gemini → GPT-4o-mini fallback |
| 1 sahne görseli başarısızsa | Diğer 3 sahne ile devam |
| Logo tespit edilemezse | Base görseli logosuz kullan |
| Harmonizasyon başarısızsa | Kaba composite'i final olarak kullan |
| Video üretimi çökerse | Başarılı kliplerle kısmi video oluştur |

## Paralel İşleme Dayanıklılığı
`Promise.allSettled()` kullanımı sayesinde bir sahnenin başarısız olması diğerlerini engellemez. Her zaman en iyi mümkün sonucu üretmeye çalışır.

---

# 10. GELİŞTİRME YOLCULUĞU — SÜRÜM TARİHÇESİ

## v1.0 — İlk Prototip
- Basit text-to-image + video pipeline
- Logo yerleştirme yok

## v2.0 — Logo Composite Pipeline (3 Aşama)
- Flux Dev + Gemini Vision + Sharp (multiply blend)
- **Problem:** Gri yama sorunu, karanlık kumaşlarda logo kaybolması

## v2.5 — Multiply → Over Geçişi
- multiply blend kaldırıldı, over blend + blur(0.4) eklendi
- Gemini promptu iyileştirildi (kişi başı 1 alan)
- **Problem:** Logo hâlâ "yapıştırılmış" görünüyor

## v3.0 — Image-to-Image Harmonizasyon Denemesi
- Flux Dev Img2Img (strength: 0.20) eklendi
- **Problem:** Tüm görseli yeniden çizdi — yüzler ve arka plan değişti, logo harmanlama çalışmadı

## v3.5 — Mask-Based Inpainting (Güncel)
- `fal-ai/flux-general/inpainting` modeline geçiş
- Otomatik siyah/beyaz mask üretimi (logo koordinatlarından)
- Sadece logo bölgesi yeniden çiziliyor, geri kalan korunuyor
- Logo boyutu %85 → %95'e çıkarıldı

---

# 11. GELECEKTEKİ GELİŞTİRMELER (ROADMAP)

## Phase 2 (Hafta 3-6)
- **Supabase Entegrasyonu:** Kullanıcı kimlik doğrulama, PostgreSQL veritabanı, dosya depolama
- **İş Kuyruğu:** BullMQ ile paralel iş yönetimi
- **E-posta Bildirimi:** Video hazır olduğunda otomatik e-posta
- **Yeniden Deneme:** Başarısız işler için otomatik retry mekanizması

## Phase 3 (Hafta 6-12)
- **Çok Dilli Destek:** İngilizce, Arapça seslendirme ve senaryo
- **50+ Sektör Şablonu:** Hazır senaryo kalıpları
- **A/B Test Varyantları:** Aynı firma için farklı konseptlerde video üretimi
- **Ödeme Entegrasyonu:** Stripe / Iyzico
- **API Erişimi:** Ajanslar için programatik erişim
- **Kullanıcı Analitiği:** Video izlenme, indirme istatistikleri

---

# 12. TEKNİK ÖZELLİKLER TABLOSU

| Özellik | Değer |
|---------|-------|
| Framework | Next.js 16.2.2 (App Router, ESM) |
| Node.js | v20+ |
| Runtime | Server-side (API Routes) + Client-side (React 19) |
| Styling | Tailwind CSS v4 |
| Video Codec | H.264 (libx264), CRF 23 |
| Audio Codec | AAC, 192 kbps |
| Video Çözünürlük | 1080×1920 (9:16 portrait) |
| Sahne Sayısı | 4 (paralel üretim) |
| Klip Süresi | 5 saniye × 4 = 20 saniye |
| Toplam Üretim Süresi | ~10-12 dakika |
| Maliyet/Video | ~$0.82 |
| Desteklenen Logo Formatları | PNG, JPG, WebP |
| TTS Dili | Türkçe (genişletilebilir) |
| Ortam Değişkenleri | 5 adet API anahtarı |

---

# 13. API ENDPOINT REFERANSı

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/generate` | POST | Video üretim işi başlat (FormData: logo + bilgiler) |
| `/api/generate` | GET | Tüm işleri listele |
| `/api/status/[jobId]` | GET | İş durumunu sorgula (polling) |
| `/api/test-model` | POST | Test Lab: 4 aşamalı logo pipeline çalıştır |
| `/api/test-model` | GET | Pipeline bilgisi |
| `/api/composite-logo` | POST | Tek seferlik logo composite (bağımsız) |
| `/api/files/[...filepath]` | GET | Output dosyalarını sun (path traversal korumalı) |

---

# 14. SONUÇ

**VideoAI**, yapay zekanın birden fazla alanını (dil modelleri, görüntü üretimi, görüş modelleri, görüntü işleme, video üretimi, ses sentezi) tek bir pipeline'da orkestre ederek, KOBİ'lerin dakikalar içinde profesyonel reklam videoları üretmesini sağlayan yenilikçi bir SaaS platformudur.

**Temel Farklılaştırıcılar:**
1. **4 Aşamalı Logo Pipeline:** Endüstri standardı inpainting harmonizasyonu ile doğal logo yerleştirme
2. **Türkçe Odaklı:** Senaryo, seslendirme ve UI tamamen Türkçe
3. **Tam Otomasyon:** Kullanıcı sadece logo yükler, geri kalanı AI halleder
4. **Maliyet Verimliliği:** Video başına ~$0.82 ile %83-91 brüt marj
5. **Dayanıklı Mimari:** Paralel işleme, fallback modeller, kısmi başarı toleransı

---

*Bu doküman VideoAI projesinin teknik sunumu için hazırlanmıştır.*
*Tarih: Nisan 2026*
