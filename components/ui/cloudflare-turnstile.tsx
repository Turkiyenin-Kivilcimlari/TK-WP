"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { toast } from "sonner";

interface CloudflareTurnstileProps {
  onVerify: (token: string) => void;
  onError?: () => void;
}

export function CloudflareTurnstile({
  onVerify,
  onError,
}: CloudflareTurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const widgetIdRef = useRef<string | null>(null);
  const initialized = useRef(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Localhost kontrolü
  const [isLocalhost, setIsLocalhost] = useState(false);
  
  // Hard-coded site key
  const SITE_KEY = "0x4AAAAAABEm1LyPmKRYL-Of";

  // İstemci tarafında çalışacak kodlar için
  useEffect(() => {
    setIsMounted(true);
    setIsLocalhost(
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1'
    );
  }, []);

  // Localhost ise hemen doğrula
  useEffect(() => {
    if (isLocalhost && isMounted) {
      // Localhost'ta otomatik doğrulama yapalım
      onVerify("localhost-dev-verification-token");
    }
  }, [isLocalhost, onVerify, isMounted]);

  // Turnstile'ı bir kez initialize et
  const initializeTurnstile = () => {
    // Localhost'ta widget oluşturmaya gerek yok
    if (isLocalhost) return;
    
    if (initialized.current || !containerRef.current || !window.turnstile) {
      return;
    }
    
    try {
      // Widget'ı render et
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: onVerify,
        "error-callback": onError,
      });
      
      initialized.current = true;
    } catch (error) {
      toast.error("Turnstile widget oluşturulurken hata oluştu.");
    }
  };

  // Script yüklendiğinde çalışacak callback
  const handleScriptLoad = () => {
    setScriptReady(true);
  };

  // Script hazır olduğunda initialize et
  useEffect(() => {
    if (scriptReady && isMounted) {
      // Script yüklendiğinde bir kerelik initialization
      const timeoutId = setTimeout(() => {
        initializeTurnstile();
      }, 100); 
      
      return () => clearTimeout(timeoutId);
    }
  }, [scriptReady, isMounted]);

  // Component unmount olduğunda cleanup
  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (error) {
          toast.error("Turnstile widget kaldırılırken hata oluştu.");
        }
        
        widgetIdRef.current = null;
        initialized.current = false;
      }
    };
  }, []);

  // Sunucu tarafında sadece konteyner göster, istemci tarafında uygun içeriği render et
  if (!isMounted) {
    return (
      <div className="cloudflare-turnstile-container">
        <div className="flex justify-center my-4 min-h-[70px]" />
      </div>
    );
  }

  return (
    <div className="cloudflare-turnstile-container">
      {!isLocalhost && (
        <Script
          id="cloudflare-turnstile-script"
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          onLoad={handleScriptLoad}
          strategy="afterInteractive"
        />
      )}
      {!isLocalhost ? (
        <div 
          ref={containerRef} 
          className="flex justify-center my-1 min-h-[70px]"
          data-cf-widget-container="true"
        />
      ) : (
        <div className="flex items-center justify-center text-sm text-green-600 my-1 min-h-[70px] bg-green-50 rounded-md border border-green-100">
          {isMounted && (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Geliştirme ortamında otomatik doğrulandı
            </>
          )}
        </div>
      )}
    </div>
  );
}
