import type { Metadata } from 'next';
import { getPublishedArticles } from '@/lib/data/articles';
import ArticlesClient from './ArticlesClient';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Yazılar',
  description:
    "Türkiye'nin Kıvılcımları topluluğunun paylaştığı teknoloji, bilim ve " +
    'üretim odaklı yazıları keşfedin.',
  alternates: { canonical: '/articles' },
};

export default async function ArticlesPage() {
  const initialArticles = await getPublishedArticles();

  return <ArticlesClient initialArticles={initialArticles} />;
}
