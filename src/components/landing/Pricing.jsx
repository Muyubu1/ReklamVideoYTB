/**
 * Fiyatlandırma Section — 4 plan kartı
 * prd.md'deki fiyatlandırma tablosuna uygun
 */

const PLANS = [
  {
    name: "Tek Video",
    price: "₺49",
    period: "tek seferlik",
    description: "Denemek isteyenler için",
    features: [
      "1 reklam videosu (20sn, 4 sahne)",
      "Logolu görsel üretimi",
      "Türkçe seslendirme",
      "1080p HD kalite",
      "MP4 indirme",
    ],
    cta: "Hemen Dene",
    popular: false,
  },
  {
    name: "Başlangıç",
    price: "₺299",
    period: "/ay",
    description: "Küçük işletmeler için",
    features: [
      "10 video / ay",
      "Tüm temel özellikler",
      "Sektör şablonları",
      "E-posta desteği",
      "Video geçmişi",
    ],
    cta: "Başla",
    popular: false,
  },
  {
    name: "Profesyonel",
    price: "₺699",
    period: "/ay",
    description: "Orta ölçekli firmalar için",
    features: [
      "30 video / ay",
      "Öncelikli üretim kuyruğu",
      "Çoklu dil desteği",
      "Özel ses seçimi",
      "Öncelikli destek",
      "A/B test varyasyonları",
    ],
    cta: "Profesyonel Ol",
    popular: true,
  },
  {
    name: "Ajans",
    price: "₺1.499",
    period: "/ay",
    description: "Dijital ajanslar için",
    features: [
      "100 video / ay",
      "API erişimi",
      "Beyaz etiket (White-label)",
      "Çoklu marka yönetimi",
      "Özel entegrasyon",
      "7/24 öncelikli destek",
    ],
    cta: "İletişime Geç",
    popular: false,
  },
];

export default function Pricing() {
  return (
    <section id="fiyatlandirma" className="relative py-32 px-6">
      {/* Arka plan */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-900/5 to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Bölüm Başlığı */}
        <div className="text-center mb-20">
          <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium border border-white/10 bg-white/5 text-[var(--text-secondary)] mb-4">
            Esnek Fiyatlandırma
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Her Bütçeye{" "}
            <span className="gradient-text">Uygun Plan</span>
          </h2>
          <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto">
            Video başına ₺49&apos;dan başlayan fiyatlarla profesyonel reklam videoları
          </p>
        </div>

        {/* Plan Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((plan) => (
            <PlanCard key={plan.name} plan={plan} />
          ))}
        </div>

        {/* Güvence notu */}
        <p className="text-center text-[var(--text-muted)] text-sm mt-12">
          Tüm planlarda 7 gün iade garantisi • KDV dahil fiyatlar • İstediğiniz zaman iptal
        </p>
      </div>
    </section>
  );
}

function PlanCard({ plan }) {
  return (
    <div
      className={`glass-card p-8 flex flex-col relative ${
        plan.popular ? "plan-popular" : ""
      }`}
    >
      {/* Popüler rozet */}
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500 to-blue-500 text-white">
          En Popüler
        </div>
      )}

      {/* Plan adı ve açıklama */}
      <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
      <p className="text-sm text-[var(--text-muted)] mb-6">{plan.description}</p>

      {/* Fiyat */}
      <div className="mb-8">
        <span className="text-4xl font-bold">{plan.price}</span>
        <span className="text-[var(--text-muted)] ml-1">{plan.period}</span>
      </div>

      {/* Özellikler */}
      <ul className="space-y-3 mb-8 flex-1">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm">
            <CheckIcon />
            <span className="text-[var(--text-secondary)]">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        className={plan.popular ? "btn-primary w-full" : "btn-secondary w-full"}
      >
        {plan.cta}
      </button>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      className="w-5 h-5 flex-shrink-0 text-purple-400 mt-0.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
