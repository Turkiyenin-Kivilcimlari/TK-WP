import { cache } from 'react';
import { connectToDatabase } from '@/lib/mongodb';
import Article, { ArticleStatus } from '@/models/Article';

// Mongoose dokümanını, API rotalarının döndürdüğü şekle (id + author.id,
// _id'siz, tarihler ISO string) çevirir; böylece SSR ile gelen initialArticle
// istemcinin API'den aldığı veriyle aynı yapıda olur.
function serializeArticle(doc: any): any {
  const article = JSON.parse(JSON.stringify(doc));

  article.id = article._id;
  delete article._id;

  if (article.author && article.author._id) {
    article.author.id = article.author._id;
    delete article.author._id;
  }

  return article;
}

/**
 * Yayında olan bir makaleyi slug ile getirir. Bulunamazsa veya DB'ye
 * ulaşılamazsa null döner — sayfa istemci tarafındaki API akışına düşer.
 */
export const getPublishedArticleBySlug = cache(async (slug: string) => {
  if (!slug) return null;

  try {
    await connectToDatabase();

    const article = await Article.findOne({
      slug,
      status: ArticleStatus.PUBLISHED,
    })
      .select('-reactions')
      .populate('author', 'name lastname avatar slug')
      .lean();

    return article ? serializeArticle(article) : null;
  } catch {
    return null;
  }
});

/**
 * Yayında olan makaleleri listeler (liste sayfası SSR'ı için).
 * /api/public/articles ile aynı şekli döndürür: _id korunur, author _id'siz
 * gelir; önizleme metni blocks'tan üretildiği için blocks dahildir.
 */
export const getPublishedArticles = cache(async (limit = 10) => {
  try {
    await connectToDatabase();

    const articles = await Article.find({ status: ArticleStatus.PUBLISHED })
      .select('-reactions')
      .populate('author', 'name lastname avatar slug -_id')
      .sort({ publishedAt: -1 })
      .limit(limit)
      .lean();

    return JSON.parse(JSON.stringify(articles));
  } catch {
    return [];
  }
});

/**
 * Slug'ın herhangi bir durumda (taslak dahil) var olup olmadığını söyler.
 * DB hatasında true döner (fail-open): geçerli bir makale DB
 * kesintisi yüzünden 404'e düşmemeli.
 */
export const articleSlugExists = cache(async (slug: string) => {
  if (!slug) return false;

  try {
    await connectToDatabase();
    const count = await Article.countDocuments({ slug }).limit(1);
    return count > 0;
  } catch {
    return true;
  }
});

/**
 * Sitemap için yayında olan makalelerin slug ve tarih bilgileri.
 */
export const getPublishedArticleSlugs = cache(async () => {
  try {
    await connectToDatabase();

    const articles = await Article.find({
      status: ArticleStatus.PUBLISHED,
      slug: { $ne: null },
    })
      .select('slug updatedAt publishedAt')
      .lean();

    return articles
      .filter((a: any) => a.slug)
      .map((a: any) => ({
        slug: a.slug as string,
        updatedAt: (a.updatedAt || a.publishedAt || new Date()) as Date,
      }));
  } catch {
    return [];
  }
});
