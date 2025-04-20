"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ArticleCard } from "@/components/HomePage/articlesCard";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api";

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
    return (
      <div className="flex flex-col gap-4 items-center max-w-7xl mx-auto px-4 pt-4">
        <div className="w-full flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
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
    <div className="w-full py-6"> {/* Üst marjini biraz azalttım */}
      <h1 className="text-2xl md:text-3xl font-bold mb-4 text-center"> {/* Marjini azalttım */}
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
                        ? "w-full max-w-[80%] mx-auto" // Mobil görünümü korundu
                        : "w-[300px]" // Web için genişliği arttırdım
                    }`}
                    key={article.id}
                  >
                    <ArticleCard article={article} />
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 w-full"> {/* Padding azalttım */}
                <p className="text-muted-foreground">Henüz makale bulunmuyor.</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-center items-center gap-4 mt-4 mb-2"> {/* Marjinleri azalttım */}
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
