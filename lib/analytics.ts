'use client';

// Google Analytics'in veri gönderme fonksiyonları
export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || '';

// Sayfa görüntüleme olayını gönder
export const pageview = (url: string) => {
  if (!GA_TRACKING_ID || typeof window === 'undefined') return;

  window.gtag('config', GA_TRACKING_ID, {
    page_path: url,
  });
};

// Özel olay gönder (buton tıklamaları, formlar vb.)
export const event = ({ action, category, label, value }: {
  action: string;
  category: string;
  label?: string;
  value?: number;
}) => {
  if (!GA_TRACKING_ID || typeof window === 'undefined') return;

  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};
