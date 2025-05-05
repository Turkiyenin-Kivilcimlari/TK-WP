"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { SearchParamsProvider } from "@/components/utils/SearchParamsProvider";
import {
  Loader2,
  Edit,
  Eye,
  Filter,
  User,
  Search,
  ThumbsUp,
  ThumbsDown,
  Tag,
} from "lucide-react";
import Image from "next/image";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import api from "@/lib/api";
import { ArticleStatus } from "@/models/Article";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ARTICLE_TAGS } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Article {
  _id: string;
  title: string;
  status: ArticleStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  views: number;
  likeCount?: number;
  dislikeCount?: number; // Beğenilmeme sayısını ekle
  thumbnail?: string; // Thumbnail alanını ekledik
  author?: {
    id: string;
    name: string;
    lastname: string;
    avatar?: string;
    slug?: string; // Yazarın slug'ını ekledik
  };
  blocks?: any[];
  tags?: string[];
  coverImage?: string;
  slug?: string; // Slug alanını ekledik
}

// SearchParams kullanan bölüm
function ArticlesWithSearchParams() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { useSearchParams } = require("next/navigation");
  const searchParams = useSearchParams();

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  // Yeni filtre state'leri
  const [authorFilter, setAuthorFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  // Mevcut yazarlar listesini API'den alacağız - Tüm yazarları getiren yeni bir state ekleyelim
  const [allAuthors, setAllAuthors] = useState<any[]>([]);
  // Etiketler için yeni bir state ekleyelim
  const [allTags, setAllTags] = useState<any[]>([]);

  // API'den tüm yazarların listesini almak için yeni bir fonksiyon
  const fetchAllAuthors = async () => {
    try {
      const response = await api.get("/api/public/authors");
      if (response.data && response.data.success) {
        setAllAuthors(response.data.authors || []);
      }
    } catch (error) {
      toast.error("Yazarlar getirilemedi:");
    }
  };

  // API'den tüm etiketlerin listesini almak için yeni bir fonksiyon
  const fetchAllTags = async () => {
    try {
      const response = await api.get("/api/public/tags");
      if (response.data && response.data.success) {
        setAllTags(response.data.tags || []);
      }
    } catch (error) {
      toast.error("Etiketler getirilemedi:");
    }
  };

  // Görüntülenme sayısı formatı (1.5k, 2.3m şeklinde)
  const formatViews = (views: number): string => {
    if (views >= 1000000) {
      return (views / 1000000).toFixed(1) + "m";
    } else if (views >= 1000) {
      return (views / 1000).toFixed(1) + "k";
    }
    return views.toString();
  };

  // Mevcut yazarlar listesi (filtre için)
  const authors = Array.from(
    new Set(articles.filter((a) => a.author?.id).map((a) => a.author?.id))
  )
    .map((id) => articles.find((a) => a.author?.id === id)?.author)
    .filter(Boolean);

  // Mevcut tag'ler listesi (filtre için)
  const usedTags = Array.from(
    new Set(articles.flatMap((a) => a.tags || []))
  ).filter(Boolean);

  // Sayfa değiştiğinde makaleleri yeniden getir
  const handlePageChange = (page: number) => {
    fetchArticles(page);
  };

  // Arama kutusu değiştiğinde
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Timeout'u temizle ve yeni bir tane oluştur
    if (searchTimeout) clearTimeout(searchTimeout);

    const timeout = setTimeout(() => {
      fetchArticles(1, query);
    }, 500);

    setSearchTimeout(timeout);
  };

  // Yazar filtresi değiştiğinde
  const handleAuthorFilterChange = (value: string) => {
    setAuthorFilter(value);
    fetchArticles(1, searchQuery, value, tagFilter);
  };

  // Tag filtresi değiştiğinde
  const handleTagFilterChange = (value: string) => {
    setTagFilter(value);
    fetchArticles(1, searchQuery, authorFilter, value);
  };

  // Filtreleri sıfırla
  const resetFilters = () => {
    // Önce state'leri sıfırla
    setAuthorFilter("all");
    setTagFilter("all");
    setSearchQuery("");

    // Sonra temizlenmiş parametrelerle fetchArticles'ı çağır
    // Mevcut state değişkenleri yerine doğrudan "all" ve "" değerlerini kullan
    fetchArticles(1, "", "all", "all");
  };

  // Tarih formatla
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "d MMM yyyy", { locale: tr });
  };

  // Yazar adını görüntüle
  const getAuthorName = (author?: any) => {
    if (!author) return "Anonim";

    // Yazar bilgisi object veya string olabilir, kontrol et
    if (typeof author === "string") {
      return author;
    }

    // Yazar adı ve soyadını birleştir
    const firstName = author.name || "";
    const lastName = author.lastname || "";

    return `${firstName} ${lastName}`.trim() || "Anonim";
  };

  // Yazarın baş harflerini al
  const getAuthorInitials = (author?: any) => {
    if (!author) return "?";

    // Yazar bilgisi object veya string olabilir, kontrol et
    if (typeof author === "string") {
      const parts = author.split(" ");
      return parts.length > 0 ? parts[0].charAt(0).toUpperCase() : "?";
    }

    const firstName = author.name || "";
    const lastName = author.lastname || "";

    const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : "";
    const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : "";

    return firstInitial + lastInitial || "?";
  };

  // İçerik önizlemesi
  const getContentPreview = (article: Article) => {
    if (!article.blocks || !Array.isArray(article.blocks)) return "";

    // Tüm metin bloklarını bul
    const textBlocks = article.blocks.filter(
      (block) => block.type === "text" && block.content?.trim()
    );

    if (textBlocks.length > 0) {
      // İlk metin bloğunu al
      const firstBlock = textBlocks[0];
      const text = firstBlock.content;

      // HTML etiketlerini temizle ve düz metin olarak göster
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = text;
      const plainText = tempDiv.textContent || tempDiv.innerText || "";

      // Metni kısalt
      return plainText.length > 150
        ? plainText.substring(0, 75) + "..."
        : plainText;
    }

    return "";
  };

  // Makaleleri getir - filtreleri ekleyerek
  const fetchArticles = async (
    page = 1,
    query = searchQuery,
    author = authorFilter,
    tag = tagFilter
  ) => {
    setLoading(true);
    try {
      let url = `/api/public/articles?`;

      if (query) {
        url += `&search=${encodeURIComponent(query)}`;
      }

      if (author && author !== "all") {
        url += `&author=${encodeURIComponent(author)}`;
      }

      if (tag && tag !== "all") {
        url += `&tag=${encodeURIComponent(tag)}`;
      }


      const response = await api.get(url);
      const data = response.data;

      setArticles(data.articles || []);
      setTotalPages(data.pages || 1);
      setCurrentPage(data.page || 1);
    } catch (error) {
      toast.error("Makaleler yüklenirken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  // Etiket tıklama işleyicisi - kartlardaki etiketlere tıklandığında kullanılacak
  const handleTagClick = (tag: string) => {
    setTagFilter(tag);
    fetchArticles(1, searchQuery, authorFilter, tag);
  };

  // Sayfa yüklendiğinde makaleleri, yazarları ve etiketleri getir
  useEffect(() => {
    fetchArticles();
    fetchAllAuthors(); // Tüm yazarları getir
    fetchAllTags(); // Tüm etiketleri getir

    // Component unmount olurken timeout'u temizle
    return () => {
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  }, []);

  return (
    <div className="justify-center items-center flex">
      <div className="container py-8 px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Paylaşılan Yazılar</h1>
            <p className="text-muted-foreground mt-1">
              Topluluktaki tüm yazıları keşfedin
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-2 ">
            {session?.user && (
              <Button asChild variant="outline">
                <Link href="/my-articles">
                  <User className="mr-2 h-2 w-2 md:h-4 md:w-4" /> Yazılarım
                </Link>
              </Button>
            )}
            {session?.user && (
              <Button asChild>
                <Link href="/write">
                  <Edit className="mr-2 h-2 w-2 md:h-4 md:w-4" /> Yeni Yazı
                  Oluştur
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Filtreleme alanı */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Arama kutusu */}
            <div className="flex-grow max-w-md">
              <label className="text-xs text-muted-foreground mb-1 block">
                Yazılarda Ara
              </label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Başlık, içerik veya yazar..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-4 w-full sm:w-auto">
              {/* Yazar Filtresi - allAuthors kullanılacak */}
              <div className="w-full sm:w-40">
                <label className="text-xs text-muted-foreground mb-1 block">
                  Yazar
                </label>
                <Select
                  value={authorFilter}
                  onValueChange={handleAuthorFilterChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Yazar seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Yazarlar</SelectItem>
                    {allAuthors.map((author: any) => (
                      <SelectItem key={author.id} value={author.id}>
                        {author.fullname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tag Filtresi - allTags API kullanacak */}
              <div className="w-full sm:w-40">
                <label className="text-xs text-muted-foreground mb-1 block">
                  Etiket
                </label>
                <Select
                  value={tagFilter}
                  onValueChange={handleTagFilterChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Etiket seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Etiketler</SelectItem>
                    {allTags.map((tag) => (
                      <SelectItem key={tag.value} value={tag.value}>
                        {tag.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filtreleri Sıfırla */}
            {(authorFilter !== "all" || tagFilter !== "all" || searchQuery) && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Filtreleri Temizle
              </Button>
            )}
          </div>

          {/* Aktif filtre özeti */}
          {(authorFilter !== "all" || tagFilter !== "all" || searchQuery) && (
            <div className="bg-muted/30 p-2 rounded-md flex items-center text-sm">
              <Filter className="h-4 w-4 mr-2" />
              <span className="text-muted-foreground">
                Aktif filtreler:
                {searchQuery && (
                  <span className="font-medium ml-1">"{searchQuery}"</span>
                )}
                {authorFilter !== "all" && (
                  <span className="ml-1">
                    Yazar:{" "}
                    {allAuthors.find((a: any) => a.id === authorFilter)
                      ?.fullname || ""}
                  </span>
                )}
                {tagFilter !== "all" && (
                  <span className="ml-1">
                    Etiket:{" "}
                    {allTags.find((t: any) => t.value === tagFilter)?.label ||
                      tagFilter}
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Grid düzeni artık 4 kolon gösterecek */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {loading ? (
            <div className="col-span-full flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : articles.length === 0 ? (
            <div className="col-span-full text-center py-20">
              <p className="text-muted-foreground mb-4">
                Aramanıza uygun yazı bulunamadı
              </p>
              {session?.user && (
                <Button asChild>
                  <Link href="/write">
                    <Edit className="mr-2 h-4 w-4" /> Yeni Yazı Oluşturun
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            articles.map((article) => (
              <Card
                key={article._id}
                className="overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow"
              >
                <CardContent className="p-3 flex flex-col h-full">
                  {/* Yazar ve tarih - Boyutları küçültüldü */}
                  <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Link href={`/u/${article.author?.slug}`} className="flex items-center gap-1">
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
                    </div>
                    <span>
                      {formatDate(article.publishedAt || article.createdAt)}
                    </span>
                  </div>

                  {/* Başlık ve içerik önizlemesi - Sabit yükseklik ve boyut kısıtlamaları eklendi */}
                  <Link href={`/articles/${article.slug}`} className="group">
                    <div className="h-[48px] mb-1">
                      <h3 className="text-base font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                        {article.title}
                      </h3>
                    </div>
                    <div className="h-[54px]">
                      <p className="text-muted-foreground text-xs line-clamp-3">
                        {getContentPreview(article)}
                      </p>
                    </div>
                    
                    {/* Makale thumbnail'i - aspect ratio 16/9 olarak değiştirildi */}
                    {(article.thumbnail || article.coverImage) && (
                      <div className="relative w-full aspect-[16/9] rounded-md overflow-hidden bg-muted my-2">
                        <Image
                          src={article.thumbnail || article.coverImage || ""}
                          alt={article.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 25vw, 20vw"
                        />
                      </div>
                    )}
                  </Link>

                  {/* İstatistikler - Boyut ve aralıklar küçültüldü */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground gap-4 mt-auto mb-2">
                    <div className="flex items-center">
                      <Eye className="h-3 w-3 mr-1 text-muted-foreground" />
                      <span>{formatViews(article.views || 0)}</span>
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

                  {/* Etiketler ve okuma butonu - Boyutlar küçültüldü */}
                  <div className="flex flex-col gap-2">
                    {/* Etiketler - Daha küçük boyut ve aralık */}
                    {article.tags && article.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <Tag className="h-3 w-3 text-muted-foreground" />
                        {article.tags.slice(0, 3).map((tag: string) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-[10px] py-0 px-1 h-4 hover:bg-secondary cursor-pointer"
                            onClick={(e) => {
                              e.preventDefault();
                              handleTagClick(tag);
                            }}
                          >
                            {allTags.find((t) => t.value === tag)?.label ||
                              ARTICLE_TAGS.find((t) => t.value === tag)
                                ?.label ||
                              tag}
                          </Badge>
                        ))}
                        {article.tags.length > 3 && (
                          <Badge variant="secondary" className="text-[10px] py-0 px-1 h-4">
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
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Sayfalama */}
        {!loading && articles.length > 0 && totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => {
                      if (currentPage === 1) return;
                      handlePageChange(currentPage - 1);
                    }}
                    className={
                      currentPage === 1 ? "opacity-50 cursor-not-allowed" : ""
                    }
                  />
                </PaginationItem>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        isActive={page === currentPage}
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => {
                      if (currentPage === totalPages) return;
                      handlePageChange(currentPage + 1);
                    }}
                    className={
                      currentPage === totalPages
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  );
}

// Ana bileşen
export default function ArticlesPage() {
  return (
    <SearchParamsProvider>
      <ArticlesWithSearchParams />
    </SearchParamsProvider>
  );
}
