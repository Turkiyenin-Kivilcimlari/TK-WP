import type { MetadataRoute } from 'next';
import { connectToDatabase } from '@/lib/mongodb';
import Article, { ArticleStatus } from '@/models/Article';
import Event, { EventStatus } from '@/models/Event';

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://turkiyeninkivilcimlari.com';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    '',
    '/about',
    '/articles',
    '/events',
    '/contact',
    '/privacy',
    '/terms',
    '/cookies',
  ].map((path) => ({
    url: `${BASE}${path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: path === '' ? 1 : 0.7,
  }));

  try {
    await connectToDatabase();

    const [articles, events] = await Promise.all([
      Article.find({ status: ArticleStatus.PUBLISHED, slug: { $ne: null } })
        .select('slug updatedAt publishedAt')
        .lean(),
      Event.find({ status: EventStatus.APPROVED })
        .select('slug updatedAt')
        .lean(),
    ]);

    const articleRoutes: MetadataRoute.Sitemap = articles
      .filter((a: any) => a.slug)
      .map((a: any) => ({
        url: `${BASE}/articles/${a.slug}`,
        lastModified: a.updatedAt || a.publishedAt || new Date(),
        changeFrequency: 'monthly',
        priority: 0.6,
      }));

    const eventRoutes: MetadataRoute.Sitemap = events
      .filter((e: any) => e.slug)
      .map((e: any) => ({
        url: `${BASE}/events/${e.slug}`,
        lastModified: e.updatedAt || new Date(),
        changeFrequency: 'monthly',
        priority: 0.6,
      }));

    return [...staticRoutes, ...articleRoutes, ...eventRoutes];
  } catch {
    // DB unavailable at build/request time — still serve static routes
    return staticRoutes;
  }
}
