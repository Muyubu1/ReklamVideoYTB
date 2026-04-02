/**
 * Kredi Bakiyesi Widget — Dashboard'da kredi durumunu gösterir
 */

export default function CreditBalance({ used = 3, total = 10 }) {
  const remaining = total - used;
  const percentage = Math.round((used / total) * 100);
  const isLow = remaining <= 2;

  return (
    <div className="glass-card p-6 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[var(--text-secondary)]">Kredi Bakiyesi</h3>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${
            isLow
              ? "bg-red-500/10 text-red-400 border border-red-500/20"
              : "bg-green-500/10 text-green-400 border border-green-500/20"
          }`}
        >
          {isLow ? "Azalıyor" : "Aktif"}
        </span>
      </div>

      {/* Büyük sayı */}
      <div className="flex items-baseline gap-1 mb-4">
        <span className="text-4xl font-bold gradient-text">{remaining}</span>
        <span className="text-lg text-[var(--text-muted)]">/ {total}</span>
        <span className="text-sm text-[var(--text-muted)] ml-1">video</span>
      </div>

      {/* İlerleme çubuğu */}
      <div className="w-full h-2 rounded-full bg-white/5 mb-3">
        <div
          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
          style={{ width: `${100 - percentage}%` }}
        />
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        Bu ay {used} video oluşturdunuz
      </p>
    </div>
  );
}
