import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { articleSlugExists, getPublishedArticleBySlug } from '@/lib/data/articles';
import ArticleDetailClient from './ArticleDetailClient';

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://turkiyeninkivilcimlari.com';

export const revalidate = 3600;

// Build'de yol üretilmez; tüm slug'lar ilk istekte render edilip ISR
// önbelleğine alınır. Bu export olmadan Next rotayı her istekte dinamik
// render ediyor, revalidate devre dışı kalıyor ve notFound() akış
// başladığı için 404 durum kodu döndüremiyordu.
export function generateStaticParams() {
  return [];
}

interface Props {
  params: { slug: string };
}

// İlk metin bloğundan HTML'siz, ~160 karakterlik özet çıkarır.
function extractDescription(article: any): string | undefined {
  const textBlock = (article.blocks || []).find(
    (b: any) => b.type === 'text' && b.content
  );
  if (!textBlock) return undefined;

  const plain = textBlock.content
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!plain) return undefined;
  return plain.length > 160 ? `${plain.slice(0, 157)}...` : plain;
}

function authorName(article: any): string | undefined {
  const name = [article.author?.name, article.author?.lastname]
    .filter(Boolean)
    .join(' ')
    .trim();
  return name || undefined;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await getPublishedArticleBySlug(params.slug);

  if (!article) {
    // notFound() burada (generateMetadata'da) çağrılmalı: sayfa gövdesinde
    // çağrılırsa streaming başladığı için durum kodu 200 olarak gitmiş oluyor.
    if (!(await articleSlugExists(params.slug))) {
      notFound();
    }
    // Taslak/onay bekleyen makaleler (yazarına istemci tarafında gösterilir)
    // dizine eklenmemeli.
    return { robots: { index: false, follow: false } };
  }

  const description = extractDescription(article);
  const url = `/articles/${article.slug}`;

  return {
    title: article.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: article.title,
      description,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: authorName(article) ? [authorName(article)!] : undefined,
      images: article.thumbnail ? [article.thumbnail] : undefined,
      tags: article.tags?.length ? article.tags : undefined,
    },
    twitter: {
      card: article.thumbnail ? 'summary_large_image' : 'summary',
      title: article.title,
      description,
    },
  };
}

export default async function ArticleDetailPage({ params }: Props) {
  const article = await getPublishedArticleBySlug(params.slug);

  // Hiç var olmayan slug'lar gerçek 404 döner; yayında olmayan ama var olan
  // makaleler (taslak/onay bekleyen) istemcide oturum yetkisiyle açılabilsin
  // diye 404'e düşürülmez.
  if (!article && !(await articleSlugExists(params.slug))) {
    notFound();
  }

  const jsonLd = article
    ? {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.title,
        description: extractDescription(article),
        image: article.thumbnail || undefined,
        datePublished: article.publishedAt,
        dateModified: article.updatedAt,
        url: `${BASE}/articles/${article.slug}`,
        mainEntityOfPage: `${BASE}/articles/${article.slug}`,
        author: {
          '@type': 'Person',
          name: authorName(article) || 'Anonim',
          url: article.author?.slug ? `${BASE}/u/${article.author.slug}` : undefined,
        },
        publisher: {
          '@type': 'Organization',
          name: "Türkiye'nin Kıvılcımları",
          url: BASE,
        },
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ArticleDetailClient slug={params.slug} initialArticle={article} />
    </>
  );
}
