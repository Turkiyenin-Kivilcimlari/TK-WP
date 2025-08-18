"use client";

import React from "react";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";

interface SafeHTMLProps {
  html: string;
  className?: string;
}

/**
 * SafeHTML bileşeni, DOMPurify kullanarak temizlenmiş HTML içeriği görüntüler
 * Bu bileşen XSS saldırılarını engellemek için HTML içeriğini temizler
 */
export function SafeHTML({ html, className }: SafeHTMLProps) {
  // JSDOM dışında yalnızca istemci tarafında çalışır
  const [sanitizedHtml, setSanitizedHtml] = React.useState("");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      // DOMPurify yapılandırması: izin verilen etiketler ve nitelikler
      DOMPurify.setConfig({
        ADD_ATTR: ["target"],
        ALLOWED_TAGS: [
          "a", "b", "br", "code", "div", "em", "h1", "h2", "h3", "h4", 
          "h5", "h6", "hr", "i", "img", "li", "ol", "p", "pre", "s", 
          "span", "strong", "table", "tbody", "td", "th", "thead", "tr", "u", "ul"
        ],
        ALLOWED_ATTR: [
          "alt", "class", "href", "id", "src", "style", "target", "title"
        ],
        FORBID_TAGS: ["script", "style", "iframe", "form", "input", "button"],
        FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"]
      });
      
      // HTML'i temizle
      const clean = DOMPurify.sanitize(html || "");
      setSanitizedHtml(clean);
    }
  }, [html]);

  return (
    <div 
      className={cn(className)} 
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
