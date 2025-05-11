"use client";

import Image from "next/image";
import Link from "next/link";
import { Eye, Tag, ThumbsUp, ThumbsDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ARTICLE_TAGS } from "@/lib/constants";

interface ArticleCardProps {
  article: {
    id: string;
    slug: string;
    title: string;
    description: string;
    thumbnail: string;
    author: {
      name: string;
      lastname: string;
      avatar: string;
      slug: string;
    };
    likeCount: number;
    dislikeCount: number;
    date: string;
    tags?: string[];
    views?: number;
  };
}

export function ArticleCard({ article }: ArticleCardProps) {
  // Tarih formatı
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "d MMM yyyy", { locale: tr });
    } catch (e) {
      return dateString;
    }
  };

  // Yazar adını formatla
  const getAuthorName = (author: any) => {
    if (!author) return "Anonim";
    if (author.name && author.lastname)
      return `${author.name} ${author.lastname}`;
    if (author.name) return author.name;
    return "Anonim";
  };

  // Yazar baş harfleri
  const getAuthorInitials = (author: any) => {
    if (!author) return "?";

    let initials = "";
    if (author.name) initials += author.name.charAt(0).toUpperCase();
    if (author.lastname) initials += author.lastname.charAt(0).toUpperCase();

    return initials || "?";
  };

  // Tag değerinin label karşılığını bul
  const getTagLabel = (tagValue: string): string => {
    const tag = ARTICLE_TAGS.find((t) => t.value === tagValue);
    return tag ? tag.label : tagValue;
  };

  return (
    <div className="w-full h-full border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="p-3 flex flex-col h-full">
        {/* Yazar ve tarih */}
        <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
          <Link
            href={`/u/${article.author.slug}`}
            className="flex items-center gap-1"
          >
            <Avatar className="h-5 w-5">
              <AvatarImage
                src={article.author?.avatar || ""}
                alt={getAuthorName(article.author)}
              />
              <AvatarFallback>
                {getAuthorInitials(article.author)}
              </AvatarFallback>
            </Avatar>
            <span>{getAuthorName(article.author)}</span>
          </Link>
          <span>{formatDate(article.date)}</span>
        </div>

        {/* Başlık ve içerik önizlemesi */}
        <Link href={`/articles/${article.slug}`} className="group">
          <div className="h-[48px] mb-1">
            {" "}
            {/* Başlık için yüksekliği azalttım */}
            <h3 className="text-base font-semibold line-clamp-2 group-hover:text-primary transition-colors">
              {article.title}
            </h3>
          </div>
          <div className="h-[54px]">
            {" "}
            {/* Açıklama için yüksekliği azalttım */}
            <p className="text-muted-foreground text-xs line-clamp-3">
              {article.description}
            </p>
          </div>

          {/* Makale resmi */}
          {article.thumbnail && (
            <div className="relative w-full aspect-[16/9] rounded-md overflow-hidden bg-muted my-2">
              <Image
                src={article.thumbnail}
                alt={article.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          )}
        </Link>

        {/* İstatistikler - beğeni/beğenmeme sayıları */}
        <div className="flex items-center justify-between text-xs text-muted-foreground gap-4 mt-auto mb-2">
          <div className="flex items-center">
            <Eye className="h-3 w-3 mr-1 text-muted-foreground" />
            <span>{article.views || 0}</span>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center">
              <ThumbsUp className="h-3 w-3 mr-1 text-primary" />
              <span>{article.likeCount || 0}</span>
            </div>
            <div className="flex items-center">
              <ThumbsDown className="h-3 w-3 mr-1 text-destructive" />
              <span>{article.dislikeCount || 0}</span>
            </div>
          </div>
        </div>

        {/* Etiketler ve okuma butonu */}
        <div className="flex flex-col gap-2">
          {/* Etiketler */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <Tag className="h-3 w-3 text-muted-foreground" />
              {article.tags.slice(0, 3).map((tag: string) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-[10px] py-0 px-1 h-4 hover:bg-secondary cursor-pointer"
                >
                  {getTagLabel(tag)}
                </Badge>
              ))}
              {article.tags.length > 3 && (
                <Badge
                  variant="secondary"
                  className="text-[10px] py-0 px-1 h-4"
                >
                  +{article.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            asChild
            className="w-full h-7 text-xs"
          >
            <Link href={`/articles/${article.slug}`}>
              <Eye className="h-3 w-3 mr-1" /> Okumaya Başla
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
