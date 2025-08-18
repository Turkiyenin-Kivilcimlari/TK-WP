import { useState, useEffect } from "react";
import { toast } from "sonner";
import api from "@/lib/api";

interface UserStats {
  totalUsers: number;
  newUsers: {
    count: number;
    percentChange: number;
  };
  activeProjects: {
    count: number;
    change: number;
  };
  contentCount: {
    count: number;
    change: number;
  };
}

export function useUserStats() {
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    newUsers: { count: 0, percentChange: 0 },
    activeProjects: { count: 0, change: 0 },
    contentCount: { count: 0, change: 0 },
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 saniye timeout

    const fetchUserStats = async () => {
      setIsLoading(true);
      try {
        // API'den kullanıcı istatistiklerini al - fetch yerine api.get kullanıyoruz
        const response = await api.get("/api/admin/stats", {
          signal: controller.signal,
        });

        setStats(response.data);
        setError(null);
      } catch (error: any) {
        // İstek iptal edildiğinde veya bileşen kaldırıldığında hata gösterme
        if (error.name === "CanceledError" || error.code === "ERR_CANCELED") {
          // Bileşen unmount olduysa veya istek iptal edildiyse sessizce çık
          return;
        }

        // Diğer hataları işle
        let errorMessage = "Bir hata oluştu";
        if (error.name === "AbortError") {
          errorMessage = "İstek zaman aşımına uğradı";
        } else if (error.code === "ECONNRESET") {
          errorMessage = "Sunucu bağlantısı beklenmedik şekilde kapandı";
        } else {
          errorMessage = "İstatistikler alınamadı";
        }

        setError(errorMessage);

        toast.error("İstatistikler alınamadı", {
          description: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserStats();

    // Temizleme fonksiyonu - bileşen unmount olduğunda çalışır
    return () => {
      clearTimeout(timeoutId);
      controller.abort(); // İsteği iptal et
    };
  }, []);

  return { stats, isLoading, error };
}
