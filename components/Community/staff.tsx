"use client";

import { AnimatedTestimonials } from "@/components/Community/animated-testimonials";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

interface BoardMember {
  id?: string;
  _id?: string; // API'den _id olarak da gelebilir
  name: string;
  designation: string;
  quote: string;
  src: string;
  order?: number;
}

function Staff() {
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBoardMembers = async () => {
      try {
        setIsLoading(true);
        const response = await api.get("/api/board");

        // Veri kontrolü ekleyelim
        const members = response.data.boardMembers || [];

        // Üyeleri sıralamaya göre sırala - null/undefined değerleri için güvenlik kontrolleri eklenmiş
        const sortedMembers = members.sort((a: BoardMember, b: BoardMember) => {
          // Order değeri yoksa veya eşitse ID'ye göre sırala
          if (
            (a.order === undefined && b.order === undefined) ||
            a.order === b.order
          ) {
            // ID karşılaştırmasını güvenli hale getir (id veya _id olabilir, ikisi de undefined olabilir)
            const idA = a.id || a._id || "";
            const idB = b.id || b._id || "";
            return String(idA).localeCompare(String(idB)); // String'e çevirerek güvenli karşılaştırma
          }

          // Order değeri varsa ona göre sırala (küçükten büyüğe)
          // Undefined değerler için varsayılan yüksek değer ata
          const orderA =
            a.order !== undefined ? a.order : Number.MAX_SAFE_INTEGER;
          const orderB =
            b.order !== undefined ? b.order : Number.MAX_SAFE_INTEGER;
          return orderA - orderB;
        });

        setBoardMembers(sortedMembers);
      } catch (err) {
        setError("Board üyeleri yüklenemedi");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBoardMembers();
  }, []);

  if (isLoading) {
    return (
      <div className="md:max-w-4xl max-w-6xl mx-auto px-4 md:px-8 lg:px-12 py-20 relative z-0">
        <div className="relative grid grid-cols-1 md:grid-cols-2 gap-20">
          <div>
            <div className="relative h-80 w-full">
              <Skeleton className="h-full w-full rounded-3xl" />
            </div>
          </div>
          <div className="flex justify-between flex-col py-4">
            <div>
              <Skeleton className="h-8 w-2/3 mb-2" />
              <Skeleton className="h-4 w-1/3 mb-3" />
              <div className="space-y-2 mt-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
            <div className="flex gap-4 pt-12 mt-5 md:pt-0">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-7 w-7 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500 py-4">{error}</div>;
  }

  // Boş dizi kontrolü ekleyelim
  if (boardMembers.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-4">
        Henüz board üyesi bulunmamaktadır.
      </div>
    );
  }

  return <AnimatedTestimonials testimonials={boardMembers} />;
}

export { Staff };
