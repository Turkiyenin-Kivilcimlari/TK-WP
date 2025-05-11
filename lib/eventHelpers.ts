import { EventType } from "@/models/Event";

/**
 * Etkinliğin geçip geçmediğini kontrol eder
 */
export function isEventPast(event: any): boolean {
  if (!event || !event.eventDays || event.eventDays.length === 0) {
    return true; // Eksik veri durumunda güvenli seçenek
  }

  const now = new Date();
  // Son etkinlik gününü al
  const lastDay = event.eventDays[event.eventDays.length - 1];
  
  if (!lastDay || !lastDay.date) return true;
  
  // Son gün tarihini oluştur
  const lastDate = new Date(lastDay.date);
  
  // Saat belirtilmişse ekleyelim
  if (lastDay.endTime) {
    const [hours, minutes] = lastDay.endTime.split(':').map(Number);
    lastDate.setHours(hours, minutes, 0, 0);
  } 
  // Online etkinlikte bitiş saati yoksa, başlangıç saatinden 1 saat sonra
  else if (lastDay.eventType === EventType.ONLINE && lastDay.startTime) {
    const [hours, minutes] = lastDay.startTime.split(':').map(Number);
    lastDate.setHours(hours, minutes, 0, 0);
    // Başlangıç saatine 1 saat ekle
    lastDate.setHours(lastDate.getHours() + 1);
  }
  // Diğer etkinlik tipleri için günün sonunu kullan
  else {
    lastDate.setHours(23, 59, 59, 999);
  }

  // Şu anki tarih, etkinliğin son tarih saatinden sonra mı?
  return now > lastDate;
}

/**
 * Etkinliğin son gün bitiş zamanını döndürür
 * Bitiş saati yoksa online etkinlikte başlangıçtan 1 saat sonrası, diğerlerinde günün sonu kullanılır
 */
export function getEventEndDateTime(event: any): Date | null {
  if (!event || !event.eventDays || event.eventDays.length === 0) {
    return null;
  }

  const lastDay = event.eventDays[event.eventDays.length - 1];
  if (!lastDay || !lastDay.date) return null;
  
  const lastDate = new Date(lastDay.date);
  
  if (lastDay.endTime) {
    const [hours, minutes] = lastDay.endTime.split(':').map(Number);
    lastDate.setHours(hours, minutes, 0, 0);
  } 
  else if (lastDay.eventType === EventType.ONLINE && lastDay.startTime) {
    const [hours, minutes] = lastDay.startTime.split(':').map(Number);
    lastDate.setHours(hours, minutes, 0, 0);
    lastDate.setHours(lastDate.getHours() + 1);
  } 
  else {
    lastDate.setHours(23, 59, 59, 999);
  }
  
  return lastDate;
}
