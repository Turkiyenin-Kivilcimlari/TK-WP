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
        
        const response = await api.get('/auth/2fa/status');
        
        // 2FA durumunu cookie olarak sakla (sadece client tarafında)
        if (typeof window !== 'undefined') {
          document.cookie = `two-factor-status=${JSON.stringify(response.data.data)}; path=/; max-age=3600; SameSite=Lax`;
        }
        
        return response.data.data;
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
      
      // Başarılı doğrulama sonrası cookie güncelle
      if (response.data.success && typeof window !== 'undefined') {
        const updatedStatus = { 
          ...twoFactorStatus.data, 
          verified: true 
        };
        document.cookie = `two-factor-status=${JSON.stringify(updatedStatus)}; path=/; max-age=3600; SameSite=Lax`;
      }
      
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
      toast.success('Doğrulama başarılı', {
        description: 'İki faktörlü kimlik doğrulama başarılı'
      });
      return data; // Veriyi döndür
    },
    onError: (error: any) => {
      toast.error('Doğrulama başarısız', {
        description: 'Doğrulama kodu geçersiz'
      });
      throw error; // Hatayı yeniden fırlat
    }
  });

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
    isAdmin: isAdmin
  };
}
