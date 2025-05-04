import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { signIn, signOut, useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { UserRole } from '@/models/User';
import { create } from 'zustand';

// Kullanıcı türü
export interface User {
  id: string;
  name: string;
  lastname: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  allowEmails?: boolean;  // Yeni alan eklendi
}

// Kayıt formu girdileri türü
export interface RegisterFormData {
  name: string;
  lastname: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  turnstileToken?: string; // turnstileToken alanı ekleyin
  allowEmails?: boolean;  // Yeni alan eklendi
}

// Giriş formu girdileri türü
export interface LoginFormData {
  email: string;
  password: string;
  turnstileToken?: string; // Cloudflare token'ı eklendi
}

// Global state store for auth
interface AuthState {
  show2FA: boolean;
  email2FA: string;
  password2FA: string;
  setShow2FA: (show: boolean) => void;
  setEmail2FA: (email: string) => void;
  setPassword2FA: (password: string) => void;
  reset2FAState: () => void;
}

// Global zustand store for managing 2FA state
export const useAuthStore = create<AuthState>((set) => ({
  show2FA: false,
  email2FA: '',
  password2FA: '',
  setShow2FA: (show) => set({ show2FA: show }),
  setEmail2FA: (email) => set({ email2FA: email }),
  setPassword2FA: (password) => set({ password2FA: password }),
  reset2FAState: () => set({ show2FA: false, email2FA: '', password2FA: '' }),
}));

export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  
  // Kayıt olma işlemi
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      const response = await api.post('/auth/register', data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Kayıt başarılı!', {
        description: 'E-posta doğrulama sayfasına yönlendiriliyorsunuz...'
      });
      
      // E-posta doğrulama sayfasına yönlendir
      setTimeout(() => {
        // Eğer redirectUrl varsa onu kullan, yoksa login sayfasına git
        if (data.redirectUrl) {
          router.push(data.redirectUrl);
        } else {
          router.push('/signin');
        }
      }, 1500);
    },
    onError: (error: any) => {
      toast.error('Kayıt başarısız!');
    }
  });
  
  // Giriş yapma işlemi (NextAuth kullanarak)
  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      // İlk olarak sadece giriş kontrolü yapalım
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false
      });
      
      
      // Eğer URL varsa ve error içermiyorsa yönlendir
      if (result?.url && !result.error) {
        return result;
      }
      
      // Giriş sonucunda hata varsa kontrol edelim
      if (result?.error) {
        
        // 2FA gerekiyorsa özel hata döndür ve global state'i güncelle
        if (result.error === "TwoFactorRequired" || result.error.includes("TwoFactorRequired")) {
          // Global state'e 2FA bilgilerini kaydet
          useAuthStore.setState({
            show2FA: true,
            email2FA: data.email,
            password2FA: data.password
          });
          
          throw new Error("2FA_REQUIRED");
        } 
        // Email doğrulama gerekiyorsa özel hata döndür  
        else if (result.error.includes("EmailNotVerified")) {
          throw new Error(`EMAIL_NOT_VERIFIED|${data.email}`);
        }
        // Diğer hatalar için normal hata döndür
        else {
          throw new Error(result.error);
        }
      }
      
      // Hata yoksa, başarılı giriş
      return result;
    },
    onSuccess: (data) => {
      // Giriş başarılı - kullanıcıyı ana sayfaya yönlendir
      toast.success('Giriş başarılı', {
        description: 'Ana sayfaya yönlendiriliyorsunuz...'
      });
      
      // 2FA state'i temizle
      useAuthStore.getState().reset2FAState();
      
      // Ana sayfaya yönlendir
      router.push('/');
      router.refresh();
    },
    onError: (error: any) => {
      if (error.message === "2FA_REQUIRED") {
        // 2FA gerektiğinde özel işlem yapma
        // Global state zaten güncellenmiş durumda
      } 
      else if (error.message && error.message.startsWith('EMAIL_NOT_VERIFIED')) {
        // E-posta adresini hata mesajından çıkartma veya store'dan alma
        let verifyEmail = '';
        
        // Hata mesajından e-posta adresini çıkart (EMAIL_NOT_VERIFIED:email@example.com formatı)
        if (error.message.includes('|')) {
          verifyEmail = error.message.split('|')[1];
        } else {
          // E-posta adresi hata mesajında yoksa, global state'den al
          verifyEmail = useAuthStore.getState().email2FA;
        }
        
        // E-posta adresinin geçerli olduğundan emin ol
        if (verifyEmail && verifyEmail !== "undefined") {
          toast.error('Bu mailin doğrulaması yapılmamış.', {
            description: 'Lütfen e-posta kutunuzu kontrol edin'
          });
          
          // Doğrulama e-postası gönder
          api.post('/auth/send-verification', { 
            email: verifyEmail,
            forceNew: true
          })
            .then(() => {
              // Doğrulama sayfasına yönlendir
              router.push(`/verify-email?email=${encodeURIComponent(verifyEmail)}`);
            })
            .catch(() => {
              toast.error('Doğrulama e-postası gönderilemedi');
            });
        } else {
          toast.error('E-posta doğrulaması gerekiyor', {
            description: 'Geçerli bir e-posta adresi sağlanamadı'
          });
        }
      } else {
        toast.error(`Giriş başarısız`,{description:"Kullanıcı adı veya şifre hatalı"});
      }
    },
  });
  
  // Çıkış yapma işlemi
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const result = await signOut({ redirect: false });
      await api.post('/auth/logout');
      return result;
    },
    onSuccess: () => {
      toast.success('Çıkış yapıldı', {
        description: 'Oturumunuz sonlandırıldı'
      });
      
      // Kullanıcı verilerini temizle
      queryClient.clear();
      
      // Ana sayfaya yönlendir
      router.push('/');
      router.refresh();
    }
  });

  // Kullanıcı silme işlemi
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!userId) {
        throw new Error('Kullanıcı ID bulunamadı');
      }
      const response = await api.delete(`/api/users/${userId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Kullanıcı başarıyla silindi');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      toast.error(`Kullanıcı silinemedi.`);
    }
  });
  
  // Profil bilgilerini güncellemek için yeni bir fonksiyon ekleyelim
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.put('/users/me', data);
      return response.data;
    },
    onSuccess: async (data) => {
      // Önbelleği temizle
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      
      // Session'ı güncelle
      if (session?.user) {
        await updateSession({
          ...session,
          user: {
            ...session.user,
            ...data.user
          }
        });
      }
      
      toast.success('Profil güncellendi', {
        description: 'Profil bilgileriniz başarıyla güncellendi.'
      });
    },
    onError: (error: any) => {
      toast.error('Güncelleme başarısız!', {
        description: 'Profil güncellenemedi.'
      });
    }
  });
  
  return {
    register: registerMutation.mutate,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    deleteUser: deleteUserMutation.mutate,
    updateProfile: updateProfileMutation.mutate,
    isRegistering: registerMutation.isPending,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isDeleting: deleteUserMutation.isPending,
    isUpdatingProfile: updateProfileMutation.isPending,
    registerError: registerMutation.error,
    loginError: loginMutation.error
  };
}
