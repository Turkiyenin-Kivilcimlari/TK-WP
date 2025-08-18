import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function useTwoFactor() {
  const queryClient = useQueryClient();
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();

  // Admin kontrolü
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPERADMIN";

  // 2FA durumunu kontrol et
  const twoFactorStatus = useQuery({
    queryKey: ['2fa-status'],
    queryFn: async () => {
      try {
        // Oturum yoksa veya oturumsuzsa boş yanıt döndür
        if (!session || !session.user) {
          return { enabled: false, verified: false, required: false, isAdmin: false };
        }
        
        // API'den güncel 2FA durumunu al 
        const response = await api.get('/auth/2fa/status');
        const statusData = response.data.data;
        
        // Doğrulama süresi kontrolü - API yanıtındaki verileri kullan
        if (isAdmin && statusData.enabled && statusData.verified && statusData.lastVerification) {
          const now = new Date();
          const lastVerification = new Date(statusData.lastVerification);
          const diffMs = now.getTime() - lastVerification.getTime();
          const diffMins = Math.floor(diffMs / (1000 * 60));
          const timeoutMins = statusData.sessionTimeoutMins || 180; // Varsayılan 3 saat
          
          
        }
        
        // 2FA durumunu cookie olarak sakla - API'den gelen güncel veri ile
        if (typeof window !== 'undefined') {
          document.cookie = `two-factor-status=${JSON.stringify(statusData)}; path=/; max-age=10800; SameSite=Lax`;
        }
        
        return statusData;
      } catch (error: any) {
        // 401 - Yetkisiz hatası durumunda oturum sorununu ele al
        if (error.response?.status === 401) {
          // Varsayılan değerleri döndür - oturum yok
          return { enabled: false, verified: false, required: false, isAdmin: false };
        }
        
        // Diğer hata durumlarında varsayılan değerleri döndür
        return { enabled: false, verified: false, required: false, isAdmin: false };
      }
    },
    // Admin kullanıcıları için daha sık yenile
    refetchInterval: isAdmin ? 1000 * 30 : 1000 * 60 * 5, // Admin: 30 saniye, normal: 5 dakika
    refetchOnWindowFocus: true,
    // Oturum değiştiğinde yeniden sorgula
    enabled: !!session?.user,
    staleTime: isAdmin ? 1000 * 15 : 1000 * 60, // Admin: 15 saniye, normal: 1 dakika
  });

  // 2FA kurulum mutasyonu
  const setupTwoFactorMutation = useMutation({
    mutationFn: async () => {
      try {
        const response = await api.post('/auth/2fa/setup');
        return response.data;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: (data) => {
      // Burada sadece başarılı mesajını gösteriyoruz, component içinde QR kodu gösterilecek
      toast.success('2FA kurulumu başlatıldı', {
        description: 'Lütfen kimlik doğrulayıcı uygulamanızla QR kodunu tarayın'
      });
      
      // Tüm ilgili sorguları geçersiz kıl ki durumu yenilesin
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
    },
    onError: (error: any) => {
      toast.error('2FA kurulumu başarısız', {
        description: 'İşlem sırasında bir hata oluştu'
      });
    }
  });

  // 2FA etkinleştirme mutasyonu
  const enableTwoFactorMutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await api.post('/auth/2fa/enable', { token });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
      toast.success('2FA etkinleştirildi', {
        description: 'İki faktörlü kimlik doğrulama başarıyla etkinleştirildi'
      });
      router.push('/'); // Ana sayfaya yönlendir
    },
    onError: (error: any) => {
      toast.error('2FA etkinleştirme başarısız', {
        description: 'Doğrulama kodu geçersiz'
      });
    }
  });

  // 2FA devre dışı bırakma mutasyonu
  const disableTwoFactorMutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await api.post('/auth/2fa/disable', { token });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
      toast.success('2FA devre dışı bırakıldı', {
        description: 'İki faktörlü kimlik doğrulama başarıyla devre dışı bırakıldı'
      });
    },
    onError: (error: any) => {
      toast.error('2FA devre dışı bırakma başarısız', {
        description: 'İşlem sırasında bir hata oluştu'
      });
    }
  });

  // 2FA doğrulama mutasyonu - bu fonksiyonu değiştirip response'u döndürüyoruz
  const verifyTwoFactorMutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await api.post('/auth/2fa/verify', { token });
      
      // Başarılı doğrulama sonrası cookie'yi güncelle - API yanıtına güven
      if (response.data.success && typeof window !== 'undefined') {
        try {
          // API'den dönen veriyi kullan, kendi başımıza yapılandırmaktan kaçın
          await refreshStatus(); // API'den en güncel durumu al
        } catch (err) {

        }
      }
      
      return response.data;
    },
    onSuccess: (data) => {
      // Sorguyu hemen yenile
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
      
      // Başarılı sonuç dön
      return data;
    },
    onError: (error: any) => {
      toast.error('Doğrulama başarısız', {
        description: 'Doğrulama kodu geçersiz'
      });
      throw error; // Hatayı yeniden fırlat
    }
  });
  
  // 2FA durumunu yenilemek için fonksiyon - daha kapsamlı
  const refreshStatus = async () => {
    try {
      // Sorguyu geçersiz kıl - API'den en güncel veriyi al
      await queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
      return true;
    } catch (error) {
      return false;
    }
  };

  return {
    twoFactorStatus: twoFactorStatus.data,
    isLoading: twoFactorStatus.isLoading,
    setupTwoFactor: setupTwoFactorMutation.mutateAsync,
    enableTwoFactor: enableTwoFactorMutation.mutate,
    disableTwoFactor: disableTwoFactorMutation.mutate,
    verifyTwoFactor: verifyTwoFactorMutation.mutateAsync, // mutateAsync kullanıyoruz ki Promise döndürsün
    isSettingUp: setupTwoFactorMutation.isPending,
    isEnabling: enableTwoFactorMutation.isPending,
    isDisabling: disableTwoFactorMutation.isPending,
    isVerifying: verifyTwoFactorMutation.isPending,
    isAdmin: isAdmin,
    refreshStatus // 2FA durumunu yenilemek için fonksiyonu return objesine ekle
  };
}
