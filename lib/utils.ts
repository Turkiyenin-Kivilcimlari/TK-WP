import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * HTML içeriğini tehlikeli tag ve attribute'lerden arındırır
 * Bu fonksiyon yalnızca istemci tarafında çalışır
 */


export function sanitizeHtml(html: string): string {
  // İstemci tarafında olup olmadığımızı kontrol et
  if (typeof window === 'undefined') {
    // Sunucu tarafında çalışıyorsa, tehlikeli olabilecek içeriği kaldır
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/g, '')
      .replace(/on\w+=\'[^\']*\'/g, '');
  }
  
  // İstemci tarafında DOMPurify kullanmak için lazy import yapabiliriz
  // Bu fonksiyon istemci tarafında daha sonra SafeHTML bileşeni içinde kullanılacak
  return html;
}

/**
 * MongoDB'den gelen genişletilmiş JSON tarih formatını 
 * JavaScript Date nesnesine dönüştürür.
 * 
 * Şu formatları kabul eder:
 * - Date nesnesi
 * - ISO tarih dizisi
 * - { $date: '...' } formatında MongoDB nesnesi
 * - { '$date': '...' } formatında MongoDB nesnesi
 * 
 * @param dateInput - Dönüştürülecek tarih girdisi
 * @returns JavaScript Date nesnesi
 */
export function safeParseDate(dateInput: any): Date {
  // Date nesnesi ise direkt döndür
  if (dateInput instanceof Date) {
    return dateInput;
  }
  
  try {
    // MongoDB Extended JSON formatı kontrolü ({ $date: '...' } veya { '$date': '...' })
    if (dateInput && typeof dateInput === 'object') {
      if (dateInput.$date && typeof dateInput.$date === 'string') {
        return new Date(dateInput.$date);
      }
      
      if (dateInput['$date'] && typeof dateInput['$date'] === 'string') {
        return new Date(dateInput['$date']);
      }
      
      // ISODate formatı kontrolü
      if (dateInput.toString && dateInput.toString().startsWith('ISODate')) {
        const isoDateStr = dateInput.toString().replace(/^ISODate\(['"](.+)['"]\)$/, '$1');
        return new Date(isoDateStr);
      }
    }
    
    // Tarih string'i ise Date'e çevir
    if (typeof dateInput === 'string') {
      return new Date(dateInput);
    }
    
    // Sayı (timestamp) ise Date'e çevir
    if (typeof dateInput === 'number') {
      return new Date(dateInput);
    }
    
    // Eğer hiçbir durum uymuyorsa, şu anki zamanı döndür
    console.warn('Geçersiz tarih formatı, şu anki zaman kullanılıyor:', dateInput);
    return new Date();
  } catch (error) {
    console.error('Tarih dönüşüm hatası:', error);
    return new Date(); // Hata durumunda şu anki zamanı döndür
  }
}

/**
 * SEO dostu slug üretmek için metni formatlayan fonksiyon
 * @param text Slug'a dönüştürülecek metin
 * @returns SEO dostu slug
 */
export function generateSlug(text: string): string {
  return text
    .toString()
    .normalize('NFD') // Aksanlı karakterleri ayır
    .replace(/[\u0300-\u036f]/g, '') // Aksanları kaldır
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Boşlukları tire ile değiştir
    .replace(/[^\w\-]+/g, '') // Alfanumerik olmayan karakterleri kaldır
    .replace(/\-\-+/g, '-') // Çoklu tireleri tek tireye indir
    .replace(/^-+/, '') // Başlangıçtaki tireleri kaldır
    .replace(/-+$/, ''); // Sondaki tireleri kaldır
}

/**
 * Bir metni URL-dostu slug formatına dönüştürür
 * Türkçe karakterleri de doğru şekilde dönüştürür
 */
export function slugify(text: string): string {
  // Türkçe karakterleri dönüştür
  const turkishChars: Record<string, string> = {
    'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
    'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U'
  };

  // Önce tüm Türkçe karakterleri değiştir
  let str = text.replace(/[çğıöşüÇĞİÖŞÜ]/g, match => turkishChars[match]);

  // Sonra standart slugify işlemlerini yap
  return str
    .toString()
    .normalize('NFD')                   // Unicode normalleştirme
    .replace(/[\u0300-\u036f]/g, '')   // Aksanları kaldır
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, '')        // Alfanümerik olmayan tüm karakterleri kaldır
    .replace(/\s+/g, '-')              // Boşlukları tire ile değiştir
    .replace(/-+/g, '-');              // Ardışık tireleri tek tire ile değiştir
}

/**
 * Makale için benzersiz slug oluştur
 * @param title Makale başlığı
 * @param tags Makale etiketleri
 * @param id İsteğe bağlı makale ID'si
 * @returns Benzersiz slug
 */
export function createArticleSlug(title: string, tags: string[] = [], id?: string): string {
  // Başlıktan ana slug'ı oluştur
  const baseSlug = generateSlug(title);
  
  // En fazla 2 etiket ekle (eğer varsa)
  const tagsToUse = tags.slice(0, 2).filter(Boolean);
  
  let slug = baseSlug;
  
  // Etiketleri ekle
  if (tagsToUse.length > 0) {
    const tagsPart = tagsToUse
      .map(tag => generateSlug(tag))
      .join('-');
    slug = `${slug}-${tagsPart}`;
  }
  
  // Slug çok uzunsa kısalt (SEO için 60-70 karakter ideal)
  if (slug.length > 70) {
    slug = slug.substring(0, 70).replace(/-+$/, '');
  }
  
  // ID eklemek için (benzersiz slug'lar için gerekebilir)
  if (id) {
    // ID'nin son 6 karakterini kullan (kısaltmak için)
    const shortId = id.slice(-6);
    slug = `${slug}-${shortId}`;
  }
  
  return slug;
}
