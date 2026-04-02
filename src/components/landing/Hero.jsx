/**
 * Hero Section — Ana sayfa üst bölüm
 * Büyük başlık, açıklama ve CTA butonları
 */

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-glow bg-grid overflow-hidden">
      {/* Dekoratif arka plan elementleri */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-[120px] animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/8 rounded-full blur-[150px] animate-float delay-300" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Rozet */}
        <div className="animate-fade-in-up inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-8">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm text-[var(--text-secondary)]">
            Yapay zeka destekli video üretimi
          </span>
        </div>

        {/* Ana Başlık */}
        <h1 className="animate-fade-in-up delay-100 text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight tracking-tight mb-6">
          AI ile{" "}
          <span className="gradient-text">Profesyonel</span>
          <br />
          Reklam Videoları
        </h1>

        {/* Alt Başlık */}
        <p className="animate-fade-in-up delay-200 max-w-2xl mx-auto text-lg sm:text-xl text-[var(--text-secondary)] leading-relaxed mb-10">
          Logonuzu yükleyin, sektörünüzü belirtin.{" "}
          <span className="text-[var(--text-primary)] font-medium">
            10 dakikada
          </span>{" "}
          markanıza özel, sinematik kalitede reklam videosu hazır olsun.
        </p>

        {/* CTA Butonları */}
        <div className="animate-fade-in-up delay-300 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="/dashboard" className="btn-primary text-lg px-10 py-4">
            Hemen Dene — Ücretsiz
          </a>
          <a href="#nasil-calisir" className="btn-secondary text-lg px-10 py-4">
            Nasıl Çalışır?
          </a>
        </div>

        {/* İstatistikler */}
        <div className="animate-fade-in-up delay-400 mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
          <Stat value="10dk" label="Video Süresi" />
          <Stat value="₺49" label="Başlangıç" />
          <Stat value="4K" label="Kalite" />
        </div>

        {/* Demo Videolar */}
        <div className="animate-fade-in-up delay-400 mt-20 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="rounded-2xl overflow-hidden shadow-[0_8px_40px_rgba(168,85,247,0.15)] border border-white/10 bg-black/30">
              <video
                className="w-full aspect-[9/16] object-cover"
                src="/video/demo-1.mp4"
                controls
                muted
                playsInline
                preload="metadata"
                poster=""
              />
              <div className="px-4 py-3 flex items-center gap-2 text-sm text-white/60 border-t border-white/5">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                AI Reklam Video #1
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-[0_8px_40px_rgba(59,130,246,0.15)] border border-white/10 bg-black/30">
              <video
                className="w-full aspect-[9/16] object-cover"
                src="/video/demo-2.mp4"
                controls
                muted
                playsInline
                preload="metadata"
                poster=""
              />
              <div className="px-4 py-3 flex items-center gap-2 text-sm text-white/60 border-t border-white/5">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                AI Reklam Video #2
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }) {
  return (
    <div className="text-center">
      <div className="text-2xl sm:text-3xl font-bold gradient-text">{value}</div>
      <div className="text-sm text-[var(--text-muted)] mt-1">{label}</div>
    </div>
  );
}
