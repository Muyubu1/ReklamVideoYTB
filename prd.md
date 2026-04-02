# AI Reklam Video Generator SaaS — PRD

**Versiyon:** 1.0  
**Tarih:** 1 Nisan 2026  
**Durum:** Geliştirme Aşamasında

---

## 1. Yönetici Özeti

Bu doküman, küçük ve orta ölçekli işletmelerin marka logolarını içeren profesyonel reklam videoları oluşturmasını sağlayan bir SaaS platformunun ürün gereksinimlerini tanımlar.

**Temel değer önerisi:** Kullanıcı sadece logosunu yükler, sektörünü ve iş tarifini girer; sistem otomatik olarak logonun sahneye doğal şekilde yerleştirildiği, seslendirilmiş, sinematik bir reklam videosu üretir.

### Hedef Metrikler

| Metrik | Hedef |
|--------|-------|
| Video üretim süresi | 10-15 dakika (4 sahne) |
| Video başına maliyet | ~$0.62 (API maliyetleri) |
| Logo yerleştirme kalitesi | Doğal, perspektife uygun |
| Desteklenen diller (TTS) | Türkçe (öncelikli), İngilizce |
| MVP lansman hedefi | 6 hafta |

---

## 2. Problem Tanımı

KOBİ'ler reklam videosu oluşturmak için ya pahalıya ajanslara başvuruyor ya da düşük kaliteli template tabanlı araçlar kullanıyor. Mevcut AI video araçları (Creatify, Predis.ai, AdCreative) logoyu sahneye doğal şekilde yerleştiremez; sadece overlay (üzerine yapıştırma) yapar.

### Mevcut Çözümlerin Eksiklikleri

- **Template-tabanlı araçlar:** Jenerik, markayı yansıtmıyor
- **Overlay yaklaşımı:** Logo düz bir şekilde yapıştırılıyor, profesyonel durmuyor
- **Manuel akış (Whisk + Grok + ElevenLabs):** Kaliteli ama ölçeklenemiyor
- **n8n + Flux denemesi:** Flux logoyu tanıyamıyor, Cloudinary overlay bozuk sonuç veriyor

---

## 3. Çözüm Mimarisi

Platform, Google Gemini API (Nano Banana 2) kullanarak logoyu sahneye doğal olarak yerleştirir. Bu, Whisk/Flow ile aynı teknolojidir ancak API üzerinden tam otomatik çalışır.

### Üretim Pipeline — 5 Adım

```
[Kullanıcı Girişi] → [1. Senaryo] → [2. Logolu Görsel] → [3. Video] → [4. Ses] → [5. Birleştir] → [Final Video]
                         LLM          Gemini API          Kling/Wan    ElevenLabs    FFmpeg
                         ~3sn         ~15sn x4            ~6dk x4      ~5sn          ~10sn
                         $0.01        $0.04 x4             $0.10 x4     $0.05         $0
```

---

### Adım 1: Senaryo Üretimi (LLM)

| Parametre | Değer |
|-----------|-------|
| API | OpenRouter / Claude API / GPT-4o-mini |
| Girdi | firma_adi, sektor, konsept, video_suresi |
| Çıktı | ad_script (TR), 4x image_prompt (EN), 4x video_prompt (EN) |
| Süre | ~3 saniye |
| Maliyet | ~$0.01 |

**System Prompt Kuralları:**
- Ad script: Türkçe, max 60 kelime, ikna edici, çağrıya yönlendiren
- Image prompt: İngilizce, 40-60 kelime, fotorealistik, sinematik, logo yerleştirme talimatları içermeli
- Video prompt: İngilizce, max 15 kelime, yavaş kamera hareketi
- Her sahnede logo farklı bir yüzeyde: üniformada patch, kapıda rozet, tabelada kazıma, panelde etiket

---

### Adım 2: Logolu Görsel Üretimi (Gemini API)

| Parametre | Değer |
|-----------|-------|
| API | Google Gemini API (Nano Banana 2) |
| Model ID | `gemini-2.5-flash-image` veya `gemini-3.1-flash-image-preview` |
| Girdi | Logo (base64 inlineData) + sahne prompt |
| Çıktı | 16:9 fotorealistik görsel, logo doğal yerleşmiş |
| Süre | ~10-15 saniye / görsel |
| Maliyet | ~$0.04 / görsel |

**Kritik Prompt Kuralları:**
- Logo üniformaya dikiş/patch olarak yerleştirilmeli
- Kapılara metal rozet olarak yerleştirilmeli
- Tabelaya kazınmış/aydınlatılmış olarak yerleştirilmeli
- Logo ASLA boşta yüzmemeli, çevresinin perspektif ve ışıklandırmasına uyum sağlamalı
- Kumaşta kırışık, metalde yansıma göstermeli

**n8n Implementasyonu:**

```
Webhook (logo_url + bilgiler)
  → HTTP Request: Logo indir (binary)
  → Code Node: base64 encode + Gemini API çağrısı + görsel çıkarma
  → Cloudinary Upload
```

Code Node, `this.helpers.httpRequest()` ile Gemini API'yi çağırır. Bu sayede dev base64 verisi n8n expression editöründen geçmez, bellekte işlenir.

**Gemini API İstek Yapısı:**

```json
{
  "contents": [{
    "parts": [
      {
        "inlineData": {
          "mimeType": "image/png",
          "data": "LOGO_BASE64"
        }
      },
      {
        "text": "SAHNE_PROMPTU"
      }
    ]
  }],
  "generationConfig": {
    "responseModalities": ["IMAGE", "TEXT"]
  }
}
```

---

### Adım 3: Video Animasyonu

| Parametre | Değer |
|-----------|-------|
| API Seçenekleri | Kling v1.6 (fal.ai) / Wan 2.2 / Veo 3 |
| Girdi | Logolu görsel + video prompt |
| Çıktı | 5 saniyelik video klip / sahne |
| Süre | ~5-6 dakika (paralel işlenebilir) |
| Maliyet | ~$0.10 / video |

**Not:** Video üretimi en yavaş adım. 4 sahne paralel işlenirse toplam süre ~6 dk. Sıralı işlenirse ~24 dk. Paralel işlem kritik.

---

### Adım 4: Seslendirme (TTS)

| Parametre | Değer |
|-----------|-------|
| API | ElevenLabs Multilingual v2 |
| Voice ID | pNInz6obpgDQGcFmaJgB (veya özel ses) |
| Girdi | Türkçe reklam metni |
| Çıktı | MP3 ses dosyası |
| Süre | ~5 saniye |
| Maliyet | ~$0.05 |

---

### Adım 5: Birleştirme

| Parametre | Değer |
|-----------|-------|
| Araç | FFmpeg (sunucu tarafında) |
| Girdi | 4 video klip + 1 ses dosyası |
| Çıktı | Final MP4 (16:9, 1080p) |
| Süre | ~10 saniye |
| Maliyet | $0 (sunucu işlem gücü) |

**FFmpeg komutu (konsept):**

```bash
ffmpeg -i sahne1.mp4 -i sahne2.mp4 -i sahne3.mp4 -i sahne4.mp4 -i ses.mp3 \
  -filter_complex "[0:v][1:v][2:v][3:v]concat=n=4:v=1:a=0[v]" \
  -map "[v]" -map 4:a -c:v libx264 -c:a aac -shortest final_reklam.mp4
```

---

## 4. Maliyet Analizi

### Video Başına Maliyet

| Kalem | Birim Maliyet | Adet | Toplam |
|-------|--------------|------|--------|
| LLM (senaryo) | $0.01 | 1 | $0.01 |
| Gemini (görsel) | $0.04 | 4 | $0.16 |
| Video (Kling) | $0.10 | 4 | $0.40 |
| TTS (ElevenLabs) | $0.05 | 1 | $0.05 |
| FFmpeg | $0.00 | 1 | $0.00 |
| **TOPLAM** | | | **$0.62** |

### Fiyatlandırma Önerisi

| Plan | Fiyat | İçerik | Hedef Kitle |
|------|-------|--------|-------------|
| Tek Video | ₺49 | 1 video (20sn, 4 sahne) | Deneme amaçlı |
| Başlangıç | ₺299/ay | 10 video/ay | Küçük işletmeler |
| Profesyonel | ₺699/ay | 30 video/ay + öncelikli üretim | Orta ölçekli |
| Ajans | ₺1499/ay | 100 video/ay + API erişimi | Dijital ajanslar |

**Brüt marj:** %88-96 (video başına $0.62 maliyet, satış fiyatı $3-10)

---

## 5. Teknik Altyapı

### MVP Teknoloji Yığını

| Katman | Teknoloji | Neden |
|--------|-----------|-------|
| Orkestrasyon | n8n (self-hosted) | Mevcut altyapı, webhook tabanlı, hızlı prototipleme |
| Frontend | Next.js + Tailwind | Hızlı geliştirme, SSR, modern UI |
| Auth + DB | Supabase | Auth, PostgreSQL, realtime, storage birlikte |
| Kuyruk | BullMQ (Redis) | Video işlerini kuyruğa al, paralel işlem |
| Dosya Depolama | Cloudinary | Görsel/video upload, CDN, dönüştürme |
| Sunucu | VPS (Hetzner/DO) | FFmpeg işlemleri için |

### API Bağımlılıkları

| Servis | Amaç | Model/Endpoint | Ücretsiz Tier |
|--------|------|---------------|---------------|
| Google Gemini API | Logolu görsel üretimi | `gemini-2.5-flash-image` | 500 istek/gün |
| ElevenLabs | Türkçe seslendirme | `eleven_multilingual_v2` | 10.000 karakter/ay |
| fal.ai (Kling) | Video animasyonu | `kling-video v1.6` | Yok (kullanım başına) |
| OpenRouter | Senaryo üretimi | `gpt-4o-mini` | $5 ücretsiz kredi |

### n8n Workflow Yapısı

```
Webhook (POST /generate-ad-image)
│
├── body: { logo_url, firma_adi, sektor, konsept, video_suresi }
│
├── [1] LLM → Senaryo + 4 sahne prompt üret
│
├── [2] Logo İndir (HTTP GET → binary)
│
├── [3] Split: 4 sahne paralel
│   ├── Sahne 1: Gemini API (logo + prompt) → Görsel → Video (Kling)
│   ├── Sahne 2: Gemini API (logo + prompt) → Görsel → Video (Kling)
│   ├── Sahne 3: Gemini API (logo + prompt) → Görsel → Video (Kling)
│   └── Sahne 4: Gemini API (logo + prompt) → Görsel → Video (Kling)
│
├── [4] ElevenLabs TTS → Ses dosyası
│
├── [5] FFmpeg: 4 video + ses → Final MP4
│
└── [6] Webhook: Sonucu web arayüzüne gönder
```

---

## 6. Kullanıcı Deneyimi

### Kullanıcı Girdi Formu

| Alan | Tip | Zorunlu | Örnek |
|------|-----|---------|-------|
| Logo | Dosya yükleme (PNG/JPG) | Evet | sirket_logo.png |
| Firma Adı | Metin | Evet | ADL Asansör |
| Sektör | Dropdown + serbest metin | Evet | Asansör bakım ve onarım |
| Konsept / Açıklama | Metin alanı | Evet | Güvenilir, profesyonel |
| Video Süresi | Seçim (15s / 20s / 30s) | Evet | 20 saniye |
| Ses Dili | Dropdown | Evet | Türkçe |

### Kullanıcı Akış Senaryosu

1. Kullanıcı kayıt olur / giriş yapar
2. Dashboard'da "Yeni Video Oluştur" butonuna tıklar
3. Formu doldurur: logo yükler, bilgileri girer
4. "Video Oluştur" butonuna tıklar
5. Sistem "Videonuz hazırlanıyor..." mesajı gösterir + ilerleme çubuğu
6. 10-15 dk sonra email/bildirim: "Videonuz hazır!"
7. Dashboard'da videoyu izler, indirir veya paylaşır

### Dashboard Özellikleri

- Video geçmişi listesi (tarih, durum, önizleme)
- Video oynatıcı + indirme butonu
- Kredi bakiyesi göstergesi
- "Tekrar Oluştur" butonu (aynı ayarlarla yeni varyasyon)

---

## 7. Örnek Sahne Promptları

### Sektör: Asansör Bakım ve Onarım

**Sahne 1 — Kuruluş (geniş plan):**

```
Photorealistic wide shot of a modern high-rise building lobby with sleek 
glass elevators. A professional elevator technician in a clean navy blue 
uniform walks confidently toward the elevator carrying a toolkit. The 
company logo is visible as an embroidered patch on the technician's chest 
and as a brushed steel badge on the elevator door frame. Golden hour light 
through floor-to-ceiling windows. Sony A7IV, 35mm, f/2.8, shallow depth 
of field, corporate blue and warm gold color palette.
```

**Video prompt:** `Slow cinematic dolly forward following the technician walking toward elevator`

**Sahne 2 — Uzmanlık (detay plan):**

```
Photorealistic medium close-up of skilled elevator technician hands working 
on elevator control panel with precision tools. The company logo clearly 
visible on the technician uniform sleeve. LED indicator lights glowing soft 
blue and green, stainless steel machinery in background. Dramatic rim 
lighting from above. Sony A7IV, 85mm macro, extremely detailed, industrial 
professional atmosphere, cool steel blue tones.
```

**Video prompt:** `Gentle slow zoom into technician hands adjusting control panel with subtle light flicker`

**Sahne 3 — Güven (ürün odaklı):**

```
Photorealistic shot of pristine modern elevator doors opening smoothly in 
a luxury residential building. The company logo elegantly displayed as a 
small metal badge on the elevator door frame. Polished marble floors, soft 
ambient light, fresh flowers on a console table. Warm inviting atmosphere. 
Sony A7IV, 50mm, rich warm tones with clean whites, cinematic depth of field.
```

**Video prompt:** `Smooth slow camera drift backward as elevator doors gently slide open revealing warm light`

**Sahne 4 — Finale (müşteri memnuniyeti):**

```
Photorealistic shot of a happy family entering a modern well-lit elevator. 
The company logo subtly visible on the interior elevator panel and on a 
certification sticker near the buttons. Soft warm lighting, modern 
residential building interior. Sony A7IV, 35mm, warm golden tones, 
lifestyle photography feel, shallow depth of field.
```

**Video prompt:** `Slow gentle push-in as family enters elevator with subtle parallax on background`

**Seslendirme metni (Türkçe, ~20 saniye):**

> Güvenli bir yaşam, güvenli bir asansörle başlar. Uzman ekibimiz, en son teknolojiyle asansörlerinizin bakım ve onarımını titizlikle gerçekleştirir. Ailenizin güvenliği bizim önceliğimiz. Hemen arayın, farkı hissedin.

---

## 8. Riskler ve Azaltma Stratejileri

| Risk | Etki | Olasılık | Azaltma Stratejisi |
|------|------|----------|-------------------|
| Gemini logo yerleştirme kalitesi düşük | Yüksek | Orta | Her sahne için 2-3 varyasyon üret, LLM ile en iyisini seç |
| Gemini API güvenlik filtresi reddi | Orta | Düşük | Prompt'tan hassas ifadeleri ayarla, fallback model ekle |
| Video üretim süresi çok uzun | Orta | Yüksek | 4 sahneyi paralel işle, kullanıcıya bildirim sistemi |
| API fiyat artışı | Orta | Orta | Çoklu model desteği (Gemini + Flux Kontext yedek) |
| Rakip giriş | Düşük | Yüksek | Türkiye pazarına odaklan, hızlı MVP, sektör şablonları |
| n8n ölçeklenme sorunu | Orta | Orta | Faz 2'de BullMQ + özel backend'e geçiş |

---

## 9. Yol Haritası

### Faz 1: MVP (Hafta 1-3)

- [ ] n8n workflow: Webhook → Gemini görsel → Video → TTS → FFmpeg
- [ ] Tek sahne testi ile Gemini logo kalitesini doğrula
- [ ] 4 sahne paralel üretim
- [ ] Basit web formu (HTML + webhook)
- [ ] webhook.site ile sonuç doğrulama

### Faz 2: Web Uygulaması (Hafta 3-6)

- [ ] Next.js dashboard: kayıt, giriş, video oluşturma formu
- [ ] Supabase: kullanıcı yönetimi, video geçmişi, dosya depolama
- [ ] BullMQ: iş kuyruğu, paralel video üretimi
- [ ] Email bildirim sistemi (video hazır olduğunda)
- [ ] Temel hata yönetimi ve retry mekanizması

### Faz 3: Ölçekleme (Hafta 6-12)

- [ ] Çoklu dil desteği (İngilizce, Arapça)
- [ ] Sektör bazlı şablon kütüphanesi (50+ sektör)
- [ ] A/B test: farklı sahne varyasyonları
- [ ] Stripe/Iyzico ödeme entegrasyonu
- [ ] Kullanıcı analitiği ve geri bildirim döngüsü
- [ ] API erişimi (ajans planı için)

---

## 10. Değerlendirilen Alternatif Yaklaşımlar

| Yaklaşım | Avantaj | Dezavantaj | Karar |
|----------|---------|-----------|-------|
| Flux + Cloudinary overlay | Ucuz, basit | Logo doğal durmuyor, video AI bozuyor | ❌ REDDEDİLDİ |
| LoRA eğitimi (müşteri başına) | En iyi kalite | SaaS için yavaş (15dk eğitim), ölçeklenmez | ⏸️ ERTELENDİ |
| Flux Kontext (logo edit) | API tabanlı, hızlı | Logo tutarlılığı düşük olabilir | 🔄 YEDEK PLAN |
| Browser agent (Whisk otomasyon) | Ücretsiz araçlar | %85 güvenilirlik, ToS riski | ❌ REDDEDİLDİ |
| IP-Adapter (referans görsel) | Açık kaynak | Logo soyut yorumlanabiliyor | ❌ REDDEDİLDİ |
| ComfyUI (self-hosted) | Tam kontrol | Teknik karmaşıklık çok yüksek | ⏸️ ERTELENDİ |
| **Gemini API (Nano Banana)** | **Whisk kalitesi, tam API** | **Preview model, fiyat değişebilir** | **✅ SEÇİLDİ** |

---

## 11. Başarı Kriterleri

| Kriter | Ölçüm | Hedef (3 Ay) |
|--------|-------|-------------|
| Aktif kullanıcı | Aylık benzersiz kullanıcı | 100+ |
| Video üretim sayısı | Toplam üretilen video | 500+ |
| Logo kalite skoru | Kullanıcı puan ortalaması (1-5) | 4.0+ |
| Üretim başarı oranı | Hatasız tamamlanan video yüzdesi | %90+ |
| Gelir | Aylık tekrarlayan gelir (MRR) | ₺10.000+ |
| Müşteri edinme maliyeti | CAC | < ₺100 |
| Churn oranı | Aylık kayıp oranı | < %10 |

---

*Bu doküman yaşayan bir doküman olup, geliştirme sürecinde güncellenecektir.*