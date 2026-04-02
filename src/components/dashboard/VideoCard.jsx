/**
 * Video Önizleme Kartı — Dashboard video listesi için
 */

const STATUS_CONFIG = {
  completed: { label: "Tamamlandı", color: "green", icon: "✓" },
  processing: { label: "İşleniyor", color: "blue", icon: "◌" },
  error: { label: "Hata", color: "red", icon: "✗" },
  pending: { label: "Bekliyor", color: "yellow", icon: "◷" },
};

export default function VideoCard({ video }) {
  const {
    id,
    firma_adi = "Demo Firma",
    sektor = "Teknoloji",
    status = "completed",
    createdAt = new Date().toISOString(),
    thumbnailUrl = null,
    duration = "20s",
  } = video || {};

  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <div className="glass-card rounded-2xl overflow-hidden group cursor-pointer">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gradient-to-br from-purple-900/20 to-blue-900/20">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={firma_adi} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10 group-hover:bg-white/20 group-hover:scale-110 transition-all">
              <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}

        {/* Süre rozeti */}
        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-xs font-medium bg-black/60 backdrop-blur-sm text-white">
          {duration}
        </span>

        {/* Durum rozeti */}
        {status === "processing" && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-lg text-xs font-medium bg-blue-500/20 backdrop-blur-sm text-blue-300 border border-blue-500/30 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            İşleniyor
          </div>
        )}
      </div>

      {/* Bilgiler */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-medium text-sm truncate">{firma_adi}</h3>
          <span
            className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full border bg-${statusCfg.color}-500/10 text-${statusCfg.color}-400 border-${statusCfg.color}-500/20`}
            style={{
              background: `rgba(var(--${statusCfg.color}), 0.1)`,
              color: statusCfg.color === "green" ? "#4ade80" : statusCfg.color === "red" ? "#f87171" : statusCfg.color === "blue" ? "#60a5fa" : "#facc15",
            }}
          >
            {statusCfg.icon} {statusCfg.label}
          </span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-3">{sektor}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)]">
            {new Date(createdAt).toLocaleDateString("tr-TR")}
          </span>
          {status === "completed" && (
            <div className="flex items-center gap-2">
              <button className="text-xs text-[var(--text-secondary)] hover:text-purple-400 transition-colors">
                İndir
              </button>
              <button className="text-xs text-[var(--text-secondary)] hover:text-purple-400 transition-colors">
                Paylaş
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
