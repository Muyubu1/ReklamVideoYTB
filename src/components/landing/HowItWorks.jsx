/**
 * Nasıl Çalışır Section — 3 adım kartları
 * Logo Yükle → AI Üretir → İndir
 */

const STEPS = [
  {
    number: "01",
    title: "Logo Yükle",
    description:
      "Markanızın logosunu yükleyin, firma bilgilerinizi ve sektörünüzü girin. Tek yapmanız gereken bu.",
    icon: UploadIcon,
    color: "purple",
  },
  {
    number: "02",
    title: "AI Üretir",
    description:
      "Yapay zeka senaryoyu yazar, logonuzu sahnelere doğal yerleştirir, videoyu oluşturur ve seslendirir.",
    icon: SparklesIcon,
    color: "blue",
  },
  {
    number: "03",
    title: "İndir & Paylaş",
    description:
      "Profesyonel reklam videonuz hazır. İndirin, sosyal medyada paylaşın veya reklamlarınızda kullanın.",
    icon: DownloadIcon,
    color: "cyan",
  },
];

const COLOR_MAP = {
  purple: {
    bg: "rgba(139, 92, 246, 0.1)",
    border: "rgba(139, 92, 246, 0.3)",
    glow: "rgba(139, 92, 246, 0.15)",
    text: "#a78bfa",
  },
  blue: {
    bg: "rgba(59, 130, 246, 0.1)",
    border: "rgba(59, 130, 246, 0.3)",
    glow: "rgba(59, 130, 246, 0.15)",
    text: "#93c5fd",
  },
  cyan: {
    bg: "rgba(6, 182, 212, 0.1)",
    border: "rgba(6, 182, 212, 0.3)",
    glow: "rgba(6, 182, 212, 0.15)",
    text: "#67e8f9",
  },
};

export default function HowItWorks() {
  return (
    <section id="nasil-calisir" className="relative py-32 px-6">
      {/* Arka plan efekti */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/5 to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Bölüm Başlığı */}
        <div className="text-center mb-20">
          <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium border border-white/10 bg-white/5 text-[var(--text-secondary)] mb-4">
            Basit & Hızlı
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Nasıl <span className="gradient-text">Çalışır?</span>
          </h2>
          <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto">
            3 basit adımda profesyonel reklam videonuzu oluşturun
          </p>
        </div>

        {/* Adım Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((step, i) => (
            <StepCard key={step.number} step={step} index={i} />
          ))}
        </div>

        {/* Alt CTA */}
        <div className="text-center mt-16">
          <a href="/dashboard" className="btn-primary px-8 py-4 text-lg">
            Hemen Başla
          </a>
        </div>
      </div>
    </section>
  );
}

function StepCard({ step, index }) {
  const colors = COLOR_MAP[step.color];
  const isLast = index === STEPS.length - 1;

  return (
    <div className={`relative ${!isLast ? "step-connector" : ""}`}>
      <div className="glass-card p-8 h-full flex flex-col">
        {/* Numara */}
        <span
          className="text-6xl font-black leading-none mb-6"
          style={{ color: colors.text, opacity: 0.2 }}
        >
          {step.number}
        </span>

        {/* İkon */}
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center mb-5"
          style={{
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            boxShadow: `0 0 30px ${colors.glow}`,
          }}
        >
          <step.icon color={colors.text} />
        </div>

        {/* İçerik */}
        <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
        <p className="text-[var(--text-secondary)] leading-relaxed flex-1">
          {step.description}
        </p>
      </div>
    </div>
  );
}

/* ═══ İkon Bileşenleri ═══ */

function UploadIcon({ color }) {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );
}

function SparklesIcon({ color }) {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function DownloadIcon({ color }) {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}
