"use client";

import { useState, useRef, useCallback } from "react";

const DEFAULT_PROMPT = `Photorealistic portrait photo of two professional elevator maintenance technicians standing confidently in a modern high-rise building lobby with sleek glass elevators behind them. Both wearing clean navy blue work uniforms with the company logo clearly visible as an embroidered patch on their chest pockets. One technician holds a professional toolkit, the other holds a digital tablet. The logo on their uniforms shows realistic fabric texture with subtle wrinkles and stitching detail around the patch. Golden hour light streams through floor-to-ceiling windows creating warm rim lighting. Shot on Sony A7IV, 50mm f/1.8, shallow depth of field, cinematic color grading with corporate blue and warm gold tones. Vertical portrait composition 9:16.`;

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

  const clearLogo = useCallback(() => {
    setLogoFile(null);
    setLogoPreview(null);
    setLogoBase64(null);
    setLogoMimeType(null);
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
        <h1 className="text-2xl font-bold mb-1">Logo Pipeline Test</h1>
        <p className="text-[var(--text-secondary)]">
          2 Aşamalı: Flux Dev (sahne) → Kontext Max Multi (logo yerleştirme)
        </p>
      </div>

      {/* Logo + Prompt */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Logo Upload */}
        <div className="glass-card p-5 rounded-2xl">
          <h3 className="text-sm font-semibold mb-3">Logo (PNG)</h3>
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              logoPreview
                ? "border-green-500/30 bg-green-500/5"
                : "border-white/10 hover:border-purple-500/30"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => handleLogo(e.target.files?.[0])}
              className="hidden"
            />
            {logoPreview ? (
              <div className="space-y-2">
                <img src={logoPreview} alt="Logo" className="w-20 h-20 object-contain mx-auto rounded-lg" />
                <p className="text-xs text-green-400">{logoFile?.name}</p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); clearLogo(); }}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Kaldır
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Logo yükle</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">PNG, JPG, WebP</p>
              </div>
            )}
          </div>
          {/* Pipeline bilgisi */}
          <div className="mt-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
            <p className="text-xs text-[var(--text-muted)]">
              <span className="text-purple-400">Aşama 1:</span> Flux Dev ile temiz sahne
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              <span className="text-purple-400">Aşama 2:</span> Kontext Max Multi ile logo yerleştirme
            </p>
          </div>
        </div>

        {/* Prompt */}
        <div className="lg:col-span-2 glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Sahne Promptu</h3>
            <button
              onClick={() => setPrompt(DEFAULT_PROMPT)}
              className="text-xs text-purple-400 hover:text-purple-300"
            >
              Varsayılana Dön
            </button>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={6}
            placeholder="Sahne açıklamasını girin..."
            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-purple-500/50 resize-none"
          />
        </div>
      </div>

      {/* Test Et butonu */}
      <button
        onClick={runTest}
        disabled={isRunning || !logoBase64}
        className={`px-8 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
          isRunning || !logoBase64
            ? "bg-white/5 text-[var(--text-muted)] cursor-not-allowed"
            : "btn-primary"
        }`}
      >
        {isRunning ? (
          <><Spinner /> Pipeline Çalışıyor...</>
        ) : (
          "Test Et"
        )}
      </button>

      {/* Hata */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Sonuç — Sahne + Final yan yana */}
      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Aşama 1: Temiz Sahne */}
            <ResultCard
              title="Aşama 1: Temiz Sahne"
              subtitle="Flux Dev"
              duration={result.steps.scene.duration}
              imageUrl={result.sceneUrl}
            />

            {/* Aşama 2: Logo Yerleştirilmiş */}
            <ResultCard
              title="Aşama 2: Logo Yerleştirilmiş"
              subtitle="Kontext Max Multi"
              duration={result.steps.logo.duration}
              imageUrl={result.imageUrl}
            />
          </div>

          {/* Toplam süre + İndir */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-sm text-green-400 font-medium">
              Toplam: {result.duration}s
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              (Sahne: {result.steps.scene.duration}s + Logo: {result.steps.logo.duration}s)
            </span>
            <a
              href={result.imageUrl}
              download="logo_pipeline_result.png"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-sm text-purple-400 hover:text-purple-300"
            >
              Final Görseli İndir
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultCard({ title, subtitle, duration, imageUrl }) {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <>
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">{title}</h3>
              <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>
            </div>
            <span className="text-xs text-green-400 font-medium">{duration}s</span>
          </div>
        </div>
        <div className="p-4">
          <div
            onClick={() => setFullscreen(true)}
            className="rounded-xl overflow-hidden border border-white/10 hover:border-purple-500/30 cursor-pointer transition-all"
          >
            <img src={imageUrl} alt={title} className="w-full object-cover" />
          </div>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setFullscreen(false)}
        >
          <div className="relative max-w-lg max-h-[90vh]">
            <img src={imageUrl} alt={title} className="max-h-[85vh] rounded-xl object-contain" />
            <div className="absolute top-2 right-2 flex gap-2">
              <a
                href={imageUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur text-xs text-white hover:bg-black/80"
              >
                İndir
              </a>
              <button className="px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur text-xs text-white hover:bg-black/80">
                Kapat
              </button>
            </div>
            <p className="text-center text-sm text-white/60 mt-2">{title} — {duration}s</p>
          </div>
        </div>
      )}
    </>
  );
}

function Spinner() {
  return (
    <svg className="w-5 h-5 animate-spin text-purple-400" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
