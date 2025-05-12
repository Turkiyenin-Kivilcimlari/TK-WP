"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ArticleCard } from "@/components/HomePage/articlesCard";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { SafeHTML } from "@/components/SafeHTML";

interface Article {
  id: string;
  title: string;
  slug: string;
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
}

export function Articles() {
  const [currentPage, setCurrentPage] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState(0); // -1 for left, 1 for right

  // Ekran boyutunu izleme
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768); // 768px genişliği mobil/masaüstü eşiği olarak belirledik
    };

    // Başlangıçta kontrol et
    checkIfMobile();

    // Pencere boyutu değiştiğinde kontrol et
    window.addEventListener("resize", checkIfMobile);

    // Cleanup
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  // API'den makaleleri çekme
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        const response = await api.get("/api/public/articles");

        if (response.status !== 200) {
          toast.error("Makale yüklenirken bir hata oluştu.");
        }

        const data = response.data;

        // API yanıtı bir nesne ve articles dizisini içeriyor
        if (!data || !data.success || !Array.isArray(data.articles)) {
          toast.error("Makale verisi alınamadı.");
          return;
        }

        // API'den gelen veriyi daha güvenli bir şekilde dönüştürelim
        const formattedArticles = data.articles.map((item: any) => {
          // İlk metin bloğunu bul
          let description = "İçerik bulunamadı";
          if (item.blocks && Array.isArray(item.blocks)) {
            // Metin tipinde olan ilk bloğu bul
            // Define interface for block structure
            interface Block {
              type: string;
              content?: string;
            }

            const firstTextBlock: Block | undefined = item.blocks.find(
              (block: Block) => block.type === "text"
            );
            if (firstTextBlock && firstTextBlock.content) {
              // HTML etiketlerini temizle
              const tempDiv = document.createElement("div");
              tempDiv.innerHTML = firstTextBlock.content;
              description =
                tempDiv.textContent || tempDiv.innerText || "İçerik bulunamadı";

              // Çok uzunsa kısalt
              if (description.length > 150) {
                description = description.substring(0, 147) + "...";
              }
            }
          }

          return {
            id: item._id,
            title: item.title,
            description: description, // İlk metin bloğundan çıkardığımız açıklamayı kullan
            thumbnail: item.thumbnail,
            slug: item.slug,
            author: {
              name: item.author?.name,
              lastname: item.author?.lastname, // Soyadı bilgisini ekleyelim
              avatar: item.author?.avatar,
              slug: item.author?.slug,
            },
            // API'den farklı şekillerde gelebilecek beğeni sayılarını kontrol edelim
            likeCount: item.likeCount,
            dislikeCount: item.dislikeCount,
            date: item.publishedAt,
            tags: item.tags,
            views: item.views,
          };
        });

        if (formattedArticles.length === 0) {
        }

        setArticles(formattedArticles);
      } catch (error) {
        // Hata durumunda boş dizi yerine örnek makaleler gösterebiliriz
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  // Ekran boyutuna göre görüntülenecek makale sayısını belirle
  const ITEMS_PER_PAGE = isMobile ? 1 : 4; // Masaüstünde tekrar 3 kart gösterelim
  const totalPages = Math.ceil(articles.length / ITEMS_PER_PAGE);

  // Sayfa değiştiğinde veya ekran boyutu değiştiğinde, geçerli sayfayı kontrol et
  useEffect(() => {
    if (currentPage >= totalPages) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [totalPages, currentPage]);

  // Geçerli sayfadaki makaleleri hesapla
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const displayedArticles = articles.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  // Sayfa değiştirme işleyicileri
  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setDirection(1); // Sağa doğru animasyon
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 0) {
      setDirection(-1); // Sola doğru animasyon
      setCurrentPage(currentPage - 1);
    }
  };

  if (loading) {
    // Skeleton bileşeni göster
    return (
      <div className="w-full py-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 text-center">
          Son Eklenen İçerikler
        </h1>

        <div className="flex flex-row flex-wrap gap-4 justify-center w-full">
          {/* Mobilde 1, desktop'ta 4 skeleton göster */}
          {Array.from({ length: isMobile ? 1 : 4 }).map((_, index) => (
            <div
              key={index}
              className={`${
                isMobile
                  ? "w-full max-w-[80%] mx-auto"
                  : "w-[300px]"
              }`}
            >
              <div className="w-full h-full border rounded-lg overflow-hidden shadow-sm p-3">
                {/* Yazar ve tarih skeleton */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-5 w-5 rounded-full bg-primary/25" />
                    <Skeleton className="h-3 w-20 bg-primary/20" />
                  </div>
                  <Skeleton className="h-3 w-16 bg-primary/20" />
                </div>

                {/* Başlık skeleton */}
                <div className="h-[48px] mb-1">
                  <Skeleton className="h-4 w-full bg-primary/20 mb-2" />
                  <Skeleton className="h-4 w-3/4 bg-primary/20" />
                </div>

                {/* Açıklama skeleton */}
                <div className="h-[54px]">
                  <Skeleton className="h-3 w-full bg-primary/20 mb-1.5" />
                  <Skeleton className="h-3 w-full bg-primary/20 mb-1.5" />
                  <Skeleton className="h-3 w-2/3 bg-primary/20" />
                </div>

                {/* Resim skeleton */}
                <Skeleton className="w-full aspect-[16/9] bg-primary/15 my-2" />

                {/* İstatistikler skeleton */}
                <div className="flex items-center justify-between mb-2 mt-auto">
                  <Skeleton className="h-3 w-10 bg-primary/20" />
                  <div className="flex gap-2">
                    <Skeleton className="h-3 w-10 bg-primary/20" />
                    <Skeleton className="h-3 w-10 bg-primary/20" />
                  </div>
                </div>

                {/* Etiketler skeleton */}
                <div className="flex gap-1 mb-2">
                  <Skeleton className="h-4 w-12 bg-primary/20" />
                  <Skeleton className="h-4 w-12 bg-primary/20" />
                </div>

                {/* Buton skeleton */}
                <Skeleton className="h-7 w-full bg-primary/25" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Animasyon varyantları
  const variants = {
    enter: (direction: number) => {
      return {
        x: direction > 0 ? 1000 : -1000,
        opacity: 0
      };
    },
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => {
      return {
        x: direction < 0 ? 1000 : -1000,
        opacity: 0
      };
    }
  };

  return (
    <div className="w-full py-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-4 text-center">
        Son Eklenen İçerikler
      </h1>

      <div className="relative overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div 
            key={currentPage}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            className="flex flex-row flex-wrap gap-4 justify-center w-full" 
          >
            {displayedArticles.length > 0 ? (
              displayedArticles.map((article) => {
                return (
                  <div
                    className={`${
                      isMobile
                        ? "w-full max-w-[80%] mx-auto"
                        : "w-[300px]" 
                    }`}
                    key={article.id}
                  >
                    <ArticleCard article={article} />
                    <SafeHTML html={article.description || ""} />
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 w-full">
                <p className="text-muted-foreground">Henüz makale bulunmuyor.</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-center items-center gap-4 mt-4 mb-2">
        <Button
          onClick={goToPrevPage}
          className="p-1.5 rounded-full h-8 w-8" 
          variant="outline"
          disabled={currentPage === 0}
          aria-label="Önceki sayfa"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="text-xs font-medium">
          {currentPage + 1} / {totalPages}
        </span>

        <Button
          onClick={goToNextPage}
          className="p-1.5 rounded-full h-8 w-8" 
          variant="outline"
          disabled={currentPage === totalPages - 1}
          aria-label="Sonraki sayfa"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
