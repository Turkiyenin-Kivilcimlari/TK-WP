import { revalidatePath } from 'next/cache';

// İçerik yayınlandığında/güncellendiğinde/kaldırıldığında ISR önbelleğindeki
// ilgili sayfaları tazeler; böylece revalidate süresi beklenmeden liste,
// detay ve sitemap güncellenir. Hata durumunda sessiz kalır — önbellek en
// geç revalidate süresinde kendini zaten yeniler.
export function revalidateArticlePages(slug?: string | null) {
  try {
    revalidatePath('/articles');
    if (slug) revalidatePath(`/articles/${slug}`);
    revalidatePath('/sitemap.xml');
  } catch {
    // no-op
  }
}

export function revalidateEventPages(slug?: string | null) {
  try {
    revalidatePath('/events');
    if (slug) revalidatePath(`/events/${slug}`);
    revalidatePath('/sitemap.xml');
  } catch {
    // no-op
  }
}
