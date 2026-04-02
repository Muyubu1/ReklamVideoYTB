/**
 * Pipeline İlerleme Göstergesi — 5 adım takip
 * Senaryo → Görsel → Video → Ses → Birleştir
 */

const PIPELINE_STEPS = [
  { key: "scenario", label: "Senaryo", icon: "📝", description: "AI senaryo yazıyor" },
  { key: "image", label: "Görseller", icon: "🎨", description: "Logolu görseller üretiliyor" },
  { key: "video", label: "Video", icon: "🎬", description: "Sahneler canlandırılıyor" },
  { key: "tts", label: "Seslendirme", icon: "🎙️", description: "Türkçe seslendirme ekleniyor" },
  { key: "merge", label: "Birleştir", icon: "🎞️", description: "Final video hazırlanıyor" },
];

const STATUS_STYLES = {
  pending: {
    ring: "border-white/10",
    bg: "bg-white/5",
    text: "text-[var(--text-muted)]",
    line: "bg-white/5",
  },
  processing: {
    ring: "border-purple-500 animate-pulse-glow",
    bg: "bg-purple-500/10",
    text: "text-purple-300",
    line: "bg-gradient-to-b from-purple-500 to-purple-500/30",
  },
  completed: {
    ring: "border-green-500/50",
    bg: "bg-green-500/10",
    text: "text-green-400",
    line: "bg-green-500/40",
  },
  error: {
    ring: "border-red-500/50",
    bg: "bg-red-500/10",
    text: "text-red-400",
    line: "bg-red-500/40",
  },
};

/**
 * @param {object} props
 * @param {object} props.steps - Pipeline adım durumları { scenario: { status }, ... }
 * @param {string} props.overallStatus - Genel durum: processing, completed, error
 */
export default function ProgressTracker({ steps = {}, overallStatus = "processing" }) {
  // Tamamlanan adım sayısı
  const completedCount = PIPELINE_STEPS.filter(
    (s) => steps[s.key]?.status === "completed"
  ).length;
  const percentage = Math.round((completedCount / PIPELINE_STEPS.length) * 100);

  return (
    <div className="glass-card p-6 rounded-2xl">
      {/* Başlık */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold mb-1">Video Üretim Durumu</h3>
          <p className="text-sm text-[var(--text-muted)]">
            {overallStatus === "completed"
              ? "Videonuz hazır!"
              : overallStatus === "error"
              ? "Bir hata oluştu"
              : `${completedCount}/${PIPELINE_STEPS.length} adım tamamlandı`}
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold gradient-text">%{percentage}</span>
        </div>
      </div>

      {/* Genel ilerleme çubuğu */}
      <div className="w-full h-1.5 rounded-full bg-white/5 mb-8">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            overallStatus === "error"
              ? "bg-red-500"
              : "bg-gradient-to-r from-purple-500 to-blue-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Adımlar */}
      <div className="space-y-4">
        {PIPELINE_STEPS.map((step, index) => {
          const stepData = steps[step.key] || { status: "pending" };
          const styles = STATUS_STYLES[stepData.status] || STATUS_STYLES.pending;
          const isLast = index === PIPELINE_STEPS.length - 1;

          return (
            <div key={step.key} className="flex gap-4">
              {/* Zaman çizgisi */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-xl border-2 ${styles.ring} ${styles.bg} flex items-center justify-center text-sm`}
                >
                  {stepData.status === "completed" ? (
                    <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : stepData.status === "error" ? (
                    <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <span>{step.icon}</span>
                  )}
                </div>
                {!isLast && (
                  <div className={`w-0.5 h-6 mt-1 rounded-full ${styles.line}`} />
                )}
              </div>

              {/* İçerik */}
              <div className="flex-1 pb-2">
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-medium ${styles.text}`}>{step.label}</h4>
                  {stepData.status === "processing" && (
                    <span className="text-xs text-purple-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                      İşleniyor
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {stepData.error || step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
