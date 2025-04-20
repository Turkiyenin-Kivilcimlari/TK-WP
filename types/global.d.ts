// Add TypeScript types for Cloudflare Turnstile

interface Window {
  turnstile?: {
    render: (container: HTMLElement, options: {
      sitekey: string;
      callback: (token: string) => void;
      "error-callback"?: () => void;
      theme?: "light" | "dark" | "auto";
      size?: "normal" | "compact";
      [key: string]: any;
    }) => string;
    remove: (widgetId: string) => void;
    reset: (widgetId?: string) => void;
    getResponse: (widgetId?: string) => string | undefined;
  };
  onloadTurnstileCallback?: () => void;
}
