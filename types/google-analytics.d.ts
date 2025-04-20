// Google Analytics türleri
interface GTagEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
}

interface Window {
  gtag: (
    command: 'config' | 'event',
    targetId: string,
    config?: Record<string, any> | GTagEvent
  ) => void;
}
