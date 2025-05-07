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
          if ((a.order === undefined && b.order === undefined) || a.order === b.order) {
            // ID karşılaştırmasını güvenli hale getir (id veya _id olabilir, ikisi de undefined olabilir)
            const idA = a.id || a._id || '';
            const idB = b.id || b._id || '';
            return String(idA).localeCompare(String(idB)); // String'e çevirerek güvenli karşılaştırma
          }
          
          // Order değeri varsa ona göre sırala (küçükten büyüğe)
          // Undefined değerler için varsayılan yüksek değer ata
          const orderA = a.order !== undefined ? a.order : Number.MAX_SAFE_INTEGER;
          const orderB = b.order !== undefined ? b.order : Number.MAX_SAFE_INTEGER;
          return orderA - orderB;
        });
        
        setBoardMembers(sortedMembers);
      } catch (err) {
        console.error("Board üyeleri yüklenirken hata oluştu:", err);
        setError("Board üyeleri yüklenemedi");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBoardMembers();
  }, []);

  if (isLoading) {
    return <div className="space-y-4 mx-auto py-12 px-4">
      <Skeleton className="h-40 w-full rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>;
  }

  if (error) {
    return <div className="text-center text-red-500 py-4">{error}</div>;
  }

  return <AnimatedTestimonials testimonials={boardMembers} />;
}

export { Staff };
