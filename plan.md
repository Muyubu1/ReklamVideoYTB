# 4 Aşamalı Kusursuz Logo Pipeline (Harmonization Stratejisi)

## HEDEF
Görseldeki "kalıp gibi oturmuş ve sırıtan (pasted-on)" logo problemini, profesyonel endüstri standardı olan **Image-to-Image Harmonization (Fırınlama)** tekniği ile tamamen çözmek. Dördüncü bir aşama eklenerek logo; kumaşın dokusuna, ışık açısına ve kırışıklıklara göre organikleştirilecektir.

## PİPELİNE AŞAMALARI (1 → 2 → 3 → 4)

### 1. `src/lib/pipeline/image-gen.js` GÜNCELLEMESİ (Aşama 1 & 4 Akışı)
- **Aşama 1 (Temiz Sahne):** `transformPromptForPatchArea` metodunda her türlü gri boş yama çizdirme çabasına son ver. Flux sadece üzerinde hiçbir logo ya da patch barındırmayan *saf ve pürüzsüz ("clean uniform, strictly no logos or patches")* bir kumaş/göğüs çizmeli.
- **YENİ Aşama 4 (Harmonize):** `image-gen.js` dosyasına `harmonizeWithFlux(sharpBase64, prompt)` isimli yepyeni bir fonksiyon ekle. 
  - Görevi: Fal.ai storage servisine Sharp'tan gelen logolu görseli yüklemek ve bu URL'i **`fal-ai/flux/dev/image-to-image`** modeline paslamak.
  - **KRİTİK UYARI:** Flux Img2Img için model ayarlarını şöyle gönder:
    `strength: 0.2` (Asla yükseltme! Logonun aslı bozulmamalı, sadece ortam ışığıyla harmanlanmalı).
    `prompt`: Orijinal prompt'un sonuna şu sihirli metni ekle: `"The embroidered company logo patch on the chest is seamlessly integrated, matching the lighting, environment shadow, and natural fabric wrinkles perfectly."`

### 2. `src/lib/pipeline/logo-composite.js` GÜNCELLEMESİ (Nokta Atışı ve Kaba Boyutlandırma)
- **Aşama 2 (Gemini Point Tespiti):** Prompt acımasızca net olmalı: *"Find exactly ONE chest pocket area per person where a natural embroidered logo should sit. Do not confuse it with regular fabric folds. Return 0-1000 normalized coordinates."*
- **Aşama 3 (Sharp Yerleştirme):** Eski `multiply` denemesinden kurtulduk. Logoya minik bir blur atıp keskinliğini körelt (`blur(0.3)`), daha sonra doğrudan `over` modunda yerleştir. Çünkü Aşama 4, ışık/renk işini zaten profesyonelce halledecek. Burada asıl amaç doğru ölçekleme (`fit: "contain"`) ve konumlandırmadır.

### 3. `src/app/api/test-model/route.js` GÜNCELLEMESİ
- Mevcut API yapısı 3 aşamalıydı, bunu **4 aşamalı** hale getir. Artık cevapta:
  - `steps.scene` (Flux Gen)
  - `steps.detection` (Gemini)
  - `steps.composite` (Sharp)
  - **`steps.harmonization` (Flux Img2Img)** süreleri dönmeli. Final image olarak Harmonize'dan çıkan görsel frontend'e aktarılmalı.

### 4. `src/app/dashboard/test-lab/page.js` GÜNCELLEMESİ
- Sonuç ekranındaki metinleri ve göstergeleri 4 Aşamayı yansıtacak şekilde revize et. Mümkünse "Aşama 1: Temiz Sahne", "Aşama 3: Kaba Yerleşim (Sharp)" ve **"Aşama 4: Kusursuz Final (Harmonize)"** şeklinde 3 görseli yan yana ya da kartlarla göster ki aradaki fark (sırıtan logodan, organik nakışa geçiş) kanıtlanabilsin.

## CLAUDE İÇİN İŞ AKIŞI
1. Yukarıdaki yönlendirmeye dayanarak öncelikle `image-gen.js` altyapısını 4 aşamalı hale getirin.
2. `logo-composite.js` ile Gemini promptlarını iyileştirin.
3. API ve Front-end'i bağlayın.
4. Terminalde hiçbir yapılandırma / import hatası vermediğinden emin olmak için uygulamayı derleyin ve çalıştırın.
5. Kullanıcı başarılı çalışmayı doğrulayana kadar Test ekranında hazırda bekleyin.
