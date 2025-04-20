/**
 * Özel olaylar için event bus
 */

// TypeScript'te özel olay tipini tanımlamak için:
export interface ProfileUpdatedEvent extends Event {
  detail?: {
    user?: {
      id?: string;
      name?: string;
      lastname?: string;
      avatar?: string;
    }
  };
}

// Profil güncellemesini tetikleyecek fonksiyon
export function emitProfileUpdated(userData?: any): void {
  // İstemci tarafında olduğumuzdan emin olalım
  if (typeof window !== 'undefined') {
    
    // Özel bir olay oluştur
    const event = new CustomEvent('profile-updated', { 
      detail: { user: userData }
    });
    
    // Olayı document üzerinde tetikle
    window.dispatchEvent(event);
  }
}
