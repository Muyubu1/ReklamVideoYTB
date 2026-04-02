/**
 * Footer Section — İletişim ve bağlantılar
 */

const FOOTER_LINKS = [
  {
    title: "Ürün",
    links: [
      { label: "Özellikler", href: "#nasil-calisir" },
      { label: "Fiyatlandırma", href: "#fiyatlandirma" },
      { label: "API Erişimi", href: "#" },
      { label: "Sektör Şablonları", href: "#" },
    ],
  },
  {
    title: "Şirket",
    links: [
      { label: "Hakkımızda", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Kariyer", href: "#" },
      { label: "İletişim", href: "#iletisim" },
    ],
  },
  {
    title: "Destek",
    links: [
      { label: "Yardım Merkezi", href: "#" },
      { label: "SSS", href: "#" },
      { label: "Gizlilik Politikası", href: "#" },
      { label: "Kullanım Koşulları", href: "#" },
    ],
  },
];

export default function Footer() {
  return (
    <footer id="iletisim" className="relative border-t border-white/5">
      {/* Üst gradient çizgi */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12">
          {/* Marka */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold">
                Video<span className="gradient-text">AI</span>
              </span>
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed mb-6 max-w-xs">
              Yapay zeka ile profesyonel reklam videoları oluşturun.
              Logonuz, hikayeniz, videonuz.
            </p>
            {/* Sosyal medya */}
            <div className="flex items-center gap-3">
              <SocialLink href="#" label="Twitter">
                <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
              </SocialLink>
              <SocialLink href="#" label="LinkedIn">
                <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 6a2 2 0 100-4 2 2 0 000 4z" />
              </SocialLink>
              <SocialLink href="#" label="Instagram">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zM17.5 6.5h.01" />
              </SocialLink>
            </div>
          </div>

          {/* Link grupları */}
          {FOOTER_LINKS.map((group) => (
            <div key={group.title}>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-4">
                {group.title}
              </h4>
              <ul className="space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Alt çizgi */}
        <div className="border-t border-white/5 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[var(--text-muted)]">
            © 2026 VideoAI. Tüm hakları saklıdır.
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            Türkiye&apos;de yapay zeka ile üretildi
          </p>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({ href, label, children }) {
  return (
    <a
      href={href}
      aria-label={label}
      className="w-10 h-10 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-purple-500/30 hover:bg-purple-500/10 transition-all"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        {children}
      </svg>
    </a>
  );
}
