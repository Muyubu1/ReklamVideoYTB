"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import VideoForm from "@/components/dashboard/VideoForm";
import ProgressTracker from "@/components/dashboard/ProgressTracker";

function CreateContent() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");
  const [jobStatus, setJobStatus] = useState(null);

  useEffect(() => {
    if (!jobId) return;
    let active = true;

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/status/${jobId}`);
        if (!res.ok || !active) return;
        const data = await res.json();
        setJobStatus(data);
        if (data.status === "processing") setTimeout(pollStatus, 3000);
      } catch {
        if (active) setTimeout(pollStatus, 5000);
      }
    };

    pollStatus();
    return () => { active = false; };
  }, [jobId]);

  // Form ekranı
  if (!jobId || !jobStatus) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Yeni Reklam Videosu</h1>
          <p className="text-[var(--text-secondary)]">Logonuzu yükleyin ve firma bilgilerinizi girin</p>
        </div>
        <VideoForm />
      </div>
    );
  }

  const isCompleted = jobStatus.status === "completed";
  const isError = jobStatus.status === "error";

  // İlerleme ve sonuç ekranı
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Başlık */}
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold mb-2">
          {isCompleted ? "Videonuz Hazır! 🎉" : isError ? "Bir Sorun Oluştu" : "Videonuz Hazırlanıyor..."}
        </h1>
        <p className="text-[var(--text-secondary)]">
          {isCompleted
            ? `${jobStatus.input?.firma_adi} için reklam videosu tamamlandı`
            : isError
            ? "Lütfen tekrar deneyin."
            : "Bu işlem yaklaşık 10-15 dakika sürer."}
        </p>
      </div>

      <ProgressTracker steps={jobStatus.steps || {}} overallStatus={jobStatus.status} />

      {/* Senaryo metni */}
      {jobStatus.scenario?.ad_script_tr && (
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">📝 Reklam Metni</h3>
          <p className="text-[var(--text-primary)] leading-relaxed italic">
            &ldquo;{jobStatus.scenario.ad_script_tr}&rdquo;
          </p>
        </div>
      )}

      {/* Üretilen Sahneler */}
      {jobStatus.scenes?.length > 0 && jobStatus.scenes.some((s) => s.imageUrl) && (
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">🎨 Üretilen Sahneler</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {jobStatus.scenes.map((scene) => (
              <div key={scene.index} className="space-y-2">
                {scene.imageUrl ? (
                  <a href={scene.imageUrl} target="_blank" rel="noopener noreferrer" className="block">
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 hover:border-purple-500/30 transition-all group">
                      <img src={scene.imageUrl} alt={`Sahne ${scene.index}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium transition-opacity">
                          Büyüt
                        </span>
                      </div>
                    </div>
                  </a>
                ) : (
                  <div className="aspect-video rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <span className="text-xs text-[var(--text-muted)]">Başarısız</span>
                  </div>
                )}
                <p className="text-xs text-[var(--text-muted)] text-center">Sahne {scene.index}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ses önizleme */}
      {jobStatus.audioUrl && (
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">🎙️ Seslendirme</h3>
          <audio controls className="w-full" style={{ height: 40 }}>
            <source src={jobStatus.audioUrl} type="audio/mpeg" />
          </audio>
        </div>
      )}

      {/* Final video önizleme + indirme */}
      {isCompleted && jobStatus.finalVideoUrl && (
        <div className="glass-card p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-2">🎬 Final Video</h3>
          <video
            controls
            className="w-full rounded-xl border border-white/10"
            poster={jobStatus.scenes?.[0]?.imageUrl}
          >
            <source src={jobStatus.finalVideoUrl} type="video/mp4" />
          </video>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <a
              href={jobStatus.finalVideoUrl}
              download={`${jobStatus.input?.firma_adi || "reklam"}_video.mp4`}
              className="btn-primary px-8 py-3 flex items-center gap-2"
            >
              <DownloadIcon />
              Videoyu İndir
            </a>
            {jobStatus.audioUrl && (
              <a
                href={jobStatus.audioUrl}
                download={`${jobStatus.input?.firma_adi || "reklam"}_ses.mp3`}
                className="btn-secondary px-6 py-3 flex items-center gap-2 text-sm"
              >
                <DownloadIcon />
                Sesi İndir
              </a>
            )}
            <button
              onClick={() => {
                setJobStatus(null);
                window.history.replaceState(null, "", "/dashboard/create");
              }}
              className="btn-secondary px-8 py-3"
            >
              Yeni Video Oluştur
            </button>
          </div>
        </div>
      )}

      {/* Hata durumu */}
      {isError && (
        <div className="text-center">
          <button
            onClick={() => {
              setJobStatus(null);
              window.history.replaceState(null, "", "/dashboard/create");
            }}
            className="btn-primary px-8 py-3"
          >
            Tekrar Dene
          </button>
        </div>
      )}
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

export default function CreatePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CreateContent />
    </Suspense>
  );
}
