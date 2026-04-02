/**
 * Video Oluşturma Formu — Logo yükleme + firma bilgileri
 * Drag & drop + tıklayarak dosya yükleme destekli
 */

"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const SECTORS = [
  "Sağlık", "Teknoloji", "Gıda", "İnşaat", "Eğitim",
  "Otomotiv", "Finans", "Turizm", "Tekstil", "Diğer",
];

const DURATIONS = [
  { value: "15", label: "15 saniye", scenes: "3 sahne" },
  { value: "20", label: "20 saniye", scenes: "4 sahne" },
  { value: "30", label: "30 saniye", scenes: "6 sahne" },
];

export default function VideoForm() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    firma_adi: "",
    sektor: "",
    konsept: "",
    video_suresi: "20",
    ses_dili: "tr",
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Form alanı güncelleme
  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Logo dosyası seçme
  const handleLogoSelect = useCallback((file) => {
    if (!file) return;
    const validTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("Desteklenen formatlar: PNG, JPG, WebP");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("Logo dosyası en fazla 20MB olabilir");
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setError(null);
  }, []);

  // Drag & Drop
  const handleDrag = useCallback((e, dragging) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(dragging);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleLogoSelect(file);
  }, [handleLogoSelect]);

  // Form gönderme
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!logoFile) { setError("Logo dosyası zorunludur"); return; }
    if (!form.firma_adi.trim()) { setError("Firma adı zorunludur"); return; }
    if (!form.sektor) { setError("Sektör seçimi zorunludur"); return; }
    if (!form.konsept.trim()) { setError("Konsept açıklaması zorunludur"); return; }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("logo", logoFile);
      Object.entries(form).forEach(([key, val]) => formData.append(key, val));

      const res = await fetch("/api/generate", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Bir hata oluştu");

      router.push(`/dashboard/create?jobId=${data.jobId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      {/* Logo Yükleme */}
      <div>
        <label className="block text-sm font-medium mb-2">Firma Logosu *</label>
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={(e) => handleDrag(e, true)}
          onDragOver={(e) => handleDrag(e, true)}
          onDragLeave={(e) => handleDrag(e, false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? "border-purple-500 bg-purple-500/10"
              : logoPreview
              ? "border-green-500/30 bg-green-500/5"
              : "border-white/10 bg-white/[0.02] hover:border-purple-500/30 hover:bg-white/[0.04]"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => handleLogoSelect(e.target.files?.[0])}
            className="hidden"
          />

          {logoPreview ? (
            <div className="flex flex-col items-center gap-3">
              <img src={logoPreview} alt="Logo" className="w-24 h-24 object-contain rounded-lg" />
              <p className="text-sm text-green-400">{logoFile.name}</p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setLogoFile(null); setLogoPreview(null); }}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Kaldır
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">Logo dosyasını sürükleyin veya tıklayın</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">PNG, JPG, WebP — Max 20MB</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Firma Adı */}
      <div>
        <label className="block text-sm font-medium mb-2">Firma Adı *</label>
        <input
          type="text"
          value={form.firma_adi}
          onChange={(e) => updateField("firma_adi", e.target.value)}
          placeholder="Örn: ADL Asansör"
          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
        />
      </div>

      {/* Sektör ve Ses Dili — Yan yana */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Sektör *</label>
          <select
            value={form.sektor}
            onChange={(e) => updateField("sektor", e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-[var(--text-primary)] focus:outline-none focus:border-purple-500/50 transition-all"
          >
            <option value="" className="bg-[var(--bg-secondary)]">Sektör seçin</option>
            {SECTORS.map((s) => (
              <option key={s} value={s} className="bg-[var(--bg-secondary)]">{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Ses Dili</label>
          <select
            value={form.ses_dili}
            onChange={(e) => updateField("ses_dili", e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-[var(--text-primary)] focus:outline-none focus:border-purple-500/50 transition-all"
          >
            <option value="tr" className="bg-[var(--bg-secondary)]">Türkçe</option>
            <option value="en" className="bg-[var(--bg-secondary)]">İngilizce</option>
          </select>
        </div>
      </div>

      {/* Konsept */}
      <div>
        <label className="block text-sm font-medium mb-2">Konsept / Açıklama *</label>
        <textarea
          value={form.konsept}
          onChange={(e) => updateField("konsept", e.target.value)}
          placeholder="Firmanızın öne çıkan özellikleri, hedef kitlesi, vermek istediğiniz mesaj..."
          rows={4}
          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all resize-none"
        />
      </div>

      {/* Video Süresi — Radio kartlar */}
      <div>
        <label className="block text-sm font-medium mb-3">Video Süresi</label>
        <div className="grid grid-cols-3 gap-3">
          {DURATIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => updateField("video_suresi", d.value)}
              className={`p-4 rounded-xl border text-center transition-all ${
                form.video_suresi === d.value
                  ? "border-purple-500/50 bg-purple-500/10 text-purple-300"
                  : "border-white/10 bg-white/[0.02] text-[var(--text-secondary)] hover:border-white/20"
              }`}
            >
              <div className="text-lg font-semibold">{d.label}</div>
              <div className="text-xs text-[var(--text-muted)] mt-1">{d.scenes}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Hata mesajı */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Gönder butonu */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={`btn-primary w-full text-lg py-4 flex items-center justify-center gap-3 ${
          isSubmitting ? "opacity-60 cursor-not-allowed" : ""
        }`}
      >
        {isSubmitting ? (
          <>
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Video Oluşturuluyor...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            Video Oluştur
          </>
        )}
      </button>
    </form>
  );
}
