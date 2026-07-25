import type { MetadataRoute } from 'next';
import { getPublishedArticleSlugs } from '@/lib/data/articles';
import { getApprovedEventSlugs } from '@/lib/data/events';

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

  // Veri katmanı DB hatasında boş liste döndürür; sitemap her durumda
  // en azından statik sayfaları içerir.
  const [articles, events] = await Promise.all([
    getPublishedArticleSlugs(),
    getApprovedEventSlugs(),
  ]);

  const articleRoutes: MetadataRoute.Sitemap = articles.map((a: { slug: string; updatedAt: Date }) => ({
    url: `${BASE}/articles/${a.slug}`,
    lastModified: a.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  const eventRoutes: MetadataRoute.Sitemap = events.map((e) => ({
    url: `${BASE}/events/${e.slug}`,
    lastModified: e.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...articleRoutes, ...eventRoutes];
}
