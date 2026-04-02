/**
 * Pipeline Adım 1: Senaryo Üretimi
 * OpenRouter API üzerinden LLM ile reklam senaryosu oluşturur.
 * Çıktı: Türkçe reklam metni + 4 sahne için görsel/video promptları
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash-preview";
const FALLBACK_MODEL = "openai/gpt-4o-mini";

// Logo yerleştirme yüzeyleri — her sahne farklı yüzeyde
const LOGO_SURFACES = [
  "embroidered patch on the technician's/worker's chest uniform",
  "brushed metal badge on the door frame or entrance",
  "engraved/illuminated sign on the exterior signboard",
  "printed label/sticker on the interior panel or display",
];

const SYSTEM_PROMPT = `Sen profesyonel bir reklam senaristi ve görsel yönetmenisin.
Kullanıcının verdiği firma bilgilerine göre 4 sahneli sinematik bir reklam videosu için senaryo üreteceksin.

KURALLAR:
1. ad_script_tr: Türkçe reklam metni. Maksimum 60 kelime. İkna edici, duygusal, harekete geçirici (CTA içermeli).
2. image_prompts: Her biri İngilizce, 40-60 kelime. Fotorealistik, sinematik kalitede. DİKEY FORMAT (9:16 portrait).
   - Sony A7IV kamera, sinematik lens, sığ alan derinliği kullan. Vertical/portrait composition.
   - Her sahnede firma logosu FARKLI bir yüzeye doğal yerleştirilmeli:
     * Sahne 1: ${LOGO_SURFACES[0]}
     * Sahne 2: ${LOGO_SURFACES[1]}
     * Sahne 3: ${LOGO_SURFACES[2]}
     * Sahne 4: ${LOGO_SURFACES[3]}
   - Logo ASLA havada yüzmemeli. Yüzeyin perspektifine, ışığına, dokusuna uymalı.
   - Kumaşta kırışık, metalde yansıma, tahtada kazıma efekti göstermeli.
3. video_prompts: Her biri İngilizce, maksimum 15 kelime. Yavaş, sinematik kamera hareketi tarif et.
4. Sahne sıralaması: Kuruluş (geniş plan) → Uzmanlık (detay) → Güven (ürün) → Finale (müşteri)

JSON formatında SADECE aşağıdaki yapıyı döndür, başka hiçbir şey yazma:
{
  "ad_script_tr": "string",
  "image_prompts": ["string", "string", "string", "string"],
  "video_prompts": ["string", "string", "string", "string"]
}`;

/**
 * Kullanıcı mesajını oluşturur
 * @param {object} input - { firma_adi, sektor, konsept, video_suresi }
 * @returns {string}
 */
function buildUserMessage(input) {
  const { firma_adi, sektor, konsept, video_suresi } = input;
  return [
    `Firma Adı: ${firma_adi}`,
    `Sektör: ${sektor}`,
    `Konsept/Açıklama: ${konsept}`,
    `Video Süresi: ${video_suresi || 20} saniye (4 sahne)`,
    "",
    "Bu firmaya özel 4 sahneli sinematik reklam senaryosu üret.",
  ].join("\n");
}

/**
 * OpenRouter API'ye istek gönderir
 * @param {string} model - Kullanılacak model ID
 * @param {string} userMessage - Kullanıcı mesajı
 * @returns {object} - Parse edilmiş JSON yanıt
 */
async function callOpenRouter(model, userMessage) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY ortam değişkeni tanımlanmamış");
  }

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "AI Reklam Video Generator",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter API hatası (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenRouter API boş yanıt döndü");
  }

  // finish_reason kontrolü — kesilmiş yanıt tespiti
  const finishReason = data.choices?.[0]?.finish_reason;
  if (finishReason === "length") {
    throw new Error("API yanıtı token limitine ulaştı ve kesildi");
  }

  return parseJsonResponse(content);
}

/**
 * LLM yanıtından JSON çıkarır — markdown code block, fazla metin vb. temizler
 * @param {string} raw - API'den gelen ham metin
 * @returns {object} - Parse edilmiş JSON
 */
function parseJsonResponse(raw) {
  // 1) Doğrudan parse dene
  try {
    return JSON.parse(raw);
  } catch {
    // devam et — temizleme gerekiyor
  }

  // 2) Markdown ```json ... ``` bloğunu çıkar
  const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // devam et
    }
  }

  // 3) İlk { ile son } arasını çıkar
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(raw.slice(firstBrace, lastBrace + 1));
    } catch {
      // devam et
    }
  }

  throw new Error(`JSON parse hatası. Ham yanıt (ilk 300 karakter): ${raw.slice(0, 300)}`);
}

/**
 * Yanıtı doğrular — gerekli alanların varlığını ve formatını kontrol eder
 * @param {object} result - API'den dönen parse edilmiş JSON
 * @returns {object} - Doğrulanmış sonuç
 */
function validateResult(result) {
  const { ad_script_tr, image_prompts, video_prompts } = result;

  if (!ad_script_tr || typeof ad_script_tr !== "string") {
    throw new Error("ad_script_tr alanı eksik veya geçersiz");
  }

  if (!Array.isArray(image_prompts) || image_prompts.length !== 4) {
    throw new Error("image_prompts 4 elemanlı bir dizi olmalı");
  }

  if (!Array.isArray(video_prompts) || video_prompts.length !== 4) {
    throw new Error("video_prompts 4 elemanlı bir dizi olmalı");
  }

  // Kelime sayısı kontrolleri
  const wordCount = ad_script_tr.split(/\s+/).length;
  if (wordCount > 80) {
    console.warn(`[senaryo] Uyarı: ad_script_tr ${wordCount} kelime (hedef: max 60)`);
  }

  image_prompts.forEach((prompt, i) => {
    const wc = prompt.split(/\s+/).length;
    if (wc < 20 || wc > 80) {
      console.warn(`[senaryo] Uyarı: image_prompt[${i}] ${wc} kelime (hedef: 40-60)`);
    }
  });

  return { ad_script_tr, image_prompts, video_prompts };
}

/**
 * Senaryo üretim pipeline'ı
 * Önce birincil modeli dener, başarısız olursa fallback modele geçer.
 *
 * @param {object} input - { firma_adi, sektor, konsept, video_suresi }
 * @returns {Promise<{ad_script_tr: string, image_prompts: string[], video_prompts: string[]}>}
 */
export async function generateScenario(input) {
  const { firma_adi, sektor, konsept } = input;

  if (!firma_adi || !sektor || !konsept) {
    throw new Error("firma_adi, sektor ve konsept alanları zorunludur");
  }

  const userMessage = buildUserMessage(input);
  console.log(`[senaryo] Senaryo üretiliyor: ${firma_adi} (${sektor})`);

  // Birincil model ile dene
  try {
    const raw = await callOpenRouter(MODEL, userMessage);
    const result = validateResult(raw);
    console.log("[senaryo] Senaryo başarıyla üretildi (birincil model)");
    return result;
  } catch (err) {
    console.warn(`[senaryo] Birincil model başarısız: ${err.message}`);
  }

  // Fallback model ile dene
  try {
    console.log(`[senaryo] Fallback model deneniyor: ${FALLBACK_MODEL}`);
    const raw = await callOpenRouter(FALLBACK_MODEL, userMessage);
    const result = validateResult(raw);
    console.log("[senaryo] Senaryo başarıyla üretildi (fallback model)");
    return result;
  } catch (err) {
    throw new Error(`Senaryo üretilemedi (her iki model de başarısız): ${err.message}`);
  }
}
