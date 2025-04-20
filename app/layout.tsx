import { Header } from "@/components/ui/header";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./theme-provider";
import { Footer } from "@/components/footer";
import { Providers } from "./providers";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import Script from "next/script";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import { ErrorHandler } from '@/components/layout/ErrorHandler';
import { SearchParamsWrapper } from '@/components/utils/SearchParamsWrapper';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Türkiye'nin Kıvılcımları",
  description: "",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <head>
        <Script
          id="Cookiebot"
          src="https://consent.cookiebot.com/uc.js"
          data-cbid="fd72f4c2-414a-4be3-977a-5ada0f1ac1e5"
          strategy="beforeInteractive"
        />
      </head>
      <html lang="tr" suppressHydrationWarning>
        <body
          className={`min-h-screen bg-background font-sans antialiased ${inter.className}`}
        >
          <Suspense fallback={null}>
            <GoogleAnalytics />
          </Suspense>
          <Providers>
            <SearchParamsWrapper>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                <Header />
                <main className="min-h-screen">
                  <ErrorHandler />
                  {children}
                </main>
                <Footer />
              </ThemeProvider>
            </SearchParamsWrapper>
          </Providers>
        </body>
      </html>
    </>
  );
}
