'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { pageview } from '@/lib/analytics';
import { SearchParamsProvider } from '@/components/utils/SearchParamsProvider';

// İç bileşen - SearchParams kullanımı için Suspense ile sarmalanmalı
function GoogleAnalyticsInner() {
  const { useSearchParams } = require('next/navigation');
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  // Client tarafında çalıştığı için bu değişkeni burada tanımlayalım
  const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || '';
  
  useEffect(() => {
    if (!GA_TRACKING_ID) return;
    
    const url = pathname + searchParams.toString();
    pageview(url);
  }, [pathname, searchParams]);

  if (!GA_TRACKING_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_TRACKING_ID}');
        `}
      </Script>
    </>
  );
}

// Dış bileşen - Ana sarmalayıcı
export default function GoogleAnalytics() {
  return (
    <SearchParamsProvider>
      <GoogleAnalyticsInner />
    </SearchParamsProvider>
  );
}
