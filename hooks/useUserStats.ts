import { useState, useEffect } from 'react';
import { toast } from 'sonner';

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
    const fetchUserStats = async () => {
      setIsLoading(true);
      try {
        // AbortController ile zaman aşımı kontrolü ekliyoruz
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 saniye timeout

        // API'den kullanıcı istatistiklerini al
        const response = await fetch('/api/admin/stats', {
          signal: controller.signal,
          // Cache'i devre dışı bırak
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        }).finally(() => clearTimeout(timeoutId));
        
        if (!response.ok) {
          throw new Error('İstatistikler alınırken bir hata oluştu');
        }
        
        const data = await response.json();
        setStats(data);
        setError(null);
      } catch (error: any) {
        
        // Abort hatası mı yoksa connection reset hatası mı?
        let errorMessage = 'Bir hata oluştu';
        if (error.name === 'AbortError') {
          errorMessage = 'İstek zaman aşımına uğradı';
        } else if (error.code === 'ECONNRESET') {
          errorMessage = 'Sunucu bağlantısı beklenmedik şekilde kapandı';
        } else {
          errorMessage = 'İstatistikler alınamadı';
        }
        
        setError(errorMessage);
        
        toast.error('İstatistikler alınamadı', {
          description: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserStats();
  }, []);

  return { stats, isLoading, error };
}
