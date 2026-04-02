import Link from "next/link";
import CreditBalance from "@/components/dashboard/CreditBalance";
import VideoCard from "@/components/dashboard/VideoCard";

// Demo verisi — Supabase entegrasyonunda gerçek veriyle değişecek
const DEMO_VIDEOS = [
  {
    id: "1",
    firma_adi: "ADL Asansör",
    sektor: "Asansör Bakım",
    status: "completed",
    createdAt: "2026-03-28T14:30:00Z",
    duration: "20s",
  },
  {
    id: "2",
    firma_adi: "Bloom Çiçekçilik",
    sektor: "Perakende",
    status: "completed",
    createdAt: "2026-03-30T09:15:00Z",
    duration: "15s",
  },
  {
    id: "3",
    firma_adi: "TechPro Yazılım",
    sektor: "Teknoloji",
    status: "processing",
    createdAt: "2026-04-01T11:00:00Z",
    duration: "20s",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Hoş geldin + CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Hoş Geldiniz 👋</h1>
          <p className="text-[var(--text-secondary)]">
            AI ile profesyonel reklam videoları oluşturun
          </p>
        </div>
        <Link href="/dashboard/create" className="btn-primary flex items-center gap-2 px-6 py-3">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Yeni Video Oluştur
        </Link>
      </div>

      {/* Üst Kartlar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CreditBalance used={3} total={10} />

        {/* Toplam Video */}
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">Toplam Video</h3>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold">7</span>
            <span className="text-sm text-green-400 ml-2">+2 bu hafta</span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">Tüm zamanlar</p>
        </div>

        {/* Aktif İş */}
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">Aktif İşlem</h3>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold gradient-text">1</span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">Video üretiliyor</p>
        </div>
      </div>

      {/* Son Videolar */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Son Videolar</h2>
          <Link
            href="/dashboard/videos"
            className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            Tümünü Gör →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {DEMO_VIDEOS.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      </div>

      {/* Boş durum — video yoksa gösterilecek */}
      {DEMO_VIDEOS.length === 0 && (
        <div className="glass-card p-12 rounded-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Henüz video yok</h3>
          <p className="text-[var(--text-secondary)] mb-6">İlk reklam videonuzu oluşturmaya başlayın</p>
          <Link href="/dashboard/create" className="btn-primary px-6 py-3">
            İlk Videomu Oluştur
          </Link>
        </div>
      )}
    </div>
  );
}
