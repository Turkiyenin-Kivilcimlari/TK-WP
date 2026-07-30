import { Header } from "@/components/ui/header";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./theme-provider";
import { Footer } from "@/components/footer";
import { Providers } from "./providers";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import Script from "next/script";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import { ErrorHandler } from '@/components/layout/ErrorHandler';

const inter = Inter({ subsets: ["latin"] });

const SITE_DESCRIPTION =
  "Türkiye'nin dört bir yanındaki gençleri teknoloji, bilim ve üretim " +
  "kültürü etrafında buluşturan topluluk. Makaleler, etkinlikler ve daha fazlası.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://turkiyeninkivilcimlari.com"
  ),
  title: {
    default: "Türkiye'nin Kıvılcımları",
    template: "%s | Türkiye'nin Kıvılcımları",
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "Türkiye'nin Kıvılcımları",
    title: "Türkiye'nin Kıvılcımları",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Türkiye'nin Kıvılcımları",
  },
  verification: {
    google: "rceQ2iUC9oCm-WSNefE6s7-wns26ZGGPivz0jGMiY9Q"
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      {/* beforeInteractive script'leri Next tarafından <head>'e taşınır; elle
          <head> yazmak (hele <html> dışında) App Router'da geçersizdir ve
          notFound()/durum kodu mekanizmasını bozuyordu. */}
      <Script
        id="Cookiebot"
        src="https://consent.cookiebot.com/uc.js"
        data-cbid="fd72f4c2-414a-4be3-977a-5ada0f1ac1e5"
        strategy="beforeInteractive"
      />
      <body
        className={`min-h-screen bg-background font-sans antialiased ${inter.className}`}
      >
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Header />
            <main className="min-h-screen">
              {/* ErrorHandler useSearchParams kullandığı için kendi Suspense
                  sınırına alınır. children bilinçli olarak Suspense DIŞINDA:
                  sayfa içeriğini saran bir sınır, sayfaların fırlattığı
                  notFound() hatasını yutup 404 durum kodunu engelliyordu. */}
              <Suspense fallback={null}>
                <ErrorHandler />
              </Suspense>
              {children}
              <SpeedInsights />
              <Analytics />
            </main>
            <Footer />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
