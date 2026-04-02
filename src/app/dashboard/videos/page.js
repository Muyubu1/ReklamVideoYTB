"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const STATUS_LABELS = {
  completed: { text: "Tamamlandı", color: "#4ade80" },
  processing: { text: "İşleniyor", color: "#60a5fa" },
  error: { text: "Hata", color: "#f87171" },
};

export default function VideosPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJobs() {
      try {
        const res = await fetch("/api/generate");
        if (res.ok) {
          const data = await res.json();
          setJobs(data.jobs || []);
        }
      } catch {
        // sessizce geç
      } finally {
        setLoading(false);
      }
    }
    fetchJobs();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="glass-card p-12 rounded-2xl text-center max-w-lg mx-auto mt-12">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">Henüz video yok</h3>
        <p className="text-[var(--text-secondary)] mb-6">İlk reklam videonuzu oluşturmaya başlayın</p>
        <Link href="/dashboard/create" className="btn-primary px-6 py-3">
          Video Oluştur
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Videolarım</h1>
        <Link href="/dashboard/create" className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Yeni Video
        </Link>
      </div>

      <div className="space-y-4">
        {jobs.map((job) => (
          <JobRow key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}

function JobRow({ job }) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_LABELS[job.status] || STATUS_LABELS.error;
  const thumb = job.scenes?.[0]?.imageUrl;

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Özet satırı */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        {/* Thumbnail */}
        <div className="w-20 h-12 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
          {thumb ? (
            <img src={thumb} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-5 h-5 text-[var(--text-muted)]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          )}
        </div>

        {/* Bilgiler */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate">{job.input?.firma_adi || "Video"}</h3>
          <p className="text-xs text-[var(--text-muted)]">{job.input?.sektor}</p>
        </div>

        {/* Durum */}
        <span className="text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0"
          style={{ color: status.color, borderColor: `${status.color}33`, background: `${status.color}15` }}>
          {status.text}
        </span>

        {/* Tarih */}
        <span className="text-xs text-[var(--text-muted)] hidden sm:block flex-shrink-0">
          {new Date(job.createdAt).toLocaleDateString("tr-TR")}
        </span>

        {/* Aç/Kapat ikonu */}
        <svg className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Detay paneli */}
      {expanded && (
        <div className="border-t border-white/5 p-4 space-y-4">
          {/* Sahneler */}
          {job.scenes?.length > 0 && job.scenes.some((s) => s.imageUrl) && (
            <div>
              <h4 className="text-xs font-medium text-[var(--text-muted)] mb-2">Sahneler</h4>
              <div className="grid grid-cols-4 gap-2">
                {job.scenes.map((scene) => (
                  <div key={scene.index}>
                    {scene.imageUrl ? (
                      <a href={scene.imageUrl} target="_blank" rel="noopener noreferrer">
                        <img src={scene.imageUrl} alt={`Sahne ${scene.index}`}
                          className="w-full aspect-video object-cover rounded-lg border border-white/10 hover:border-purple-500/30 transition-colors" />
                      </a>
                    ) : (
                      <div className="w-full aspect-video rounded-lg bg-white/5 border border-white/10" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ses */}
          {job.audioUrl && (
            <div>
              <h4 className="text-xs font-medium text-[var(--text-muted)] mb-2">Seslendirme</h4>
              <audio controls className="w-full" style={{ height: 36 }}>
                <source src={job.audioUrl} type="audio/mpeg" />
              </audio>
            </div>
          )}

          {/* Aksiyonlar */}
          <div className="flex items-center gap-3 pt-2">
            {job.finalVideoUrl && (
              <>
                <a href={job.finalVideoUrl} download className="btn-primary px-4 py-2 text-xs flex items-center gap-1.5">
                  Video İndir
                </a>
                <Link href={`/dashboard/create?jobId=${job.id}`}
                  className="btn-secondary px-4 py-2 text-xs">
                  Detayları Gör
                </Link>
              </>
            )}
            {job.status === "processing" && (
              <Link href={`/dashboard/create?jobId=${job.id}`}
                className="btn-secondary px-4 py-2 text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                Durumu İzle
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
