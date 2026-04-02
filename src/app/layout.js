import "./globals.css";

export const metadata = {
  title: "VideoAI — AI ile Profesyonel Reklam Videoları",
  description:
    "Logonuzu yükleyin, sektörünüzü seçin. AI, markanıza özel sinematik reklam videosu üretsin. 10 dakikada profesyonel sonuç.",
  keywords: "ai video, reklam videosu, yapay zeka, video üretici, logo animasyon",
  openGraph: {
    title: "VideoAI — AI ile Profesyonel Reklam Videoları",
    description: "Logonuzu yükleyin, AI markanıza özel sinematik reklam videosu üretsin.",
    type: "website",
    locale: "tr_TR",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
