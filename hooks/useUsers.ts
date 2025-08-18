import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { User } from './useAuth';
import { UserRole } from '@/models/User';

// Kullanıcı listesi parametreleri
export interface UsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
}

// API yanıtı türü
interface UsersResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  users: Array<User & { _id?: string }>; // MongoDB _id'sini de kabul edelim
}

export function useUsers(params: UsersParams = {}) {
  const queryClient = useQueryClient();
  
  // Tüm kullanıcıların listesini getirme (sayfalama ve filtreleme ile)
  const usersQuery = useQuery({
    queryKey: ['users', params],
    queryFn: async () => {
      try {
        // URL parametreleri oluştur
        const queryParams = new URLSearchParams();
        
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.search) queryParams.append('search', params.search);
        if (params.role) queryParams.append('role', params.role);
        
        const query = queryParams.toString();
        const url = `/users${query ? `?${query}` : ''}`;
        
        const response = await api.get(url);
        const data = response.data as UsersResponse;
        
        // MongoDB _id alanını id olarak normalize et
        if (data.users && Array.isArray(data.users)) {
          data.users = data.users.map(user => {
            // MongoDB'den _id geliyorsa bunu id'ye kopyala
            if (user._id && !user.id) {
              return { ...user, id: user._id };
            }
            return user;
          });
        }
        
        return data;
      } catch (error: any) {
        // 2FA ile ilgili hataları özel olarak işle
        if (error.response?.data?.errorType === '2fa_setup_required') {
          toast.error('İki faktörlü doğrulama gerekli', {
            description: 'Admin paneline erişmek için lütfen iki faktörlü doğrulamayı etkinleştirin.'
          });
        } else if (error.response?.data?.errorType === '2fa_verification_required') {
          toast.error('Doğrulama gerekli', {
            description: 'Admin paneline erişmek için lütfen iki faktörlü doğrulama kodunu giriniz.'
          });
        } else {
          toast.error('Kullanıcılar yüklenirken hata oluştu');
        }
        throw error;
      }
    }
  });
  
  // Kullanıcı silme mutasyonu
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      
      // ID validasyonu
      if (!userId) {
        throw new Error('Geçerli bir kullanıcı ID\'si bulunamadı');
      }
      
      // ID'nin string olup olmadığını kontrol et
      const id = String(userId).trim();
      
      if (!id || id === 'undefined' || id === 'null') {
        throw new Error('Geçerli bir kullanıcı ID\'si bulunamadı');
      }

      // API isteği
      try {
        const response = await api.delete(`/admin/users/${id}`);
        return response.data;
      } catch (error: any) {
        
        // API hata mesajlarını yakala
        const errorMessage = error.response?.data?.message || 'Kullanıcı silme işlemi başarısız oldu';
        throw new Error(errorMessage);
      }
    },
    onSuccess: (_, userId) => {
      toast.success('Kullanıcı silindi!', {
        description: 'Kullanıcı başarıyla silindi'
      });
      
      // Kullanıcı listesini yenile
      queryClient.invalidateQueries({ queryKey: ['users'] });
      
      // Silinen kullanıcının önbelleğini temizle
      queryClient.removeQueries({ queryKey: ['user', userId] });
    },
    onError: (error: any) => {
      toast.error('Silme işlemi başarısız!');
    }
  });
  
  // Kullanıcı rolünü güncelleme
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string, role: UserRole }) => {
      try {
        const response = await api.put(`/admin/users/${userId}`, { role });
        return response.data;
      } catch (error: any) {
        // API'den gelen hata mesajını yakala
        const errorMessage = 'Rol güncelleme işlemi başarısız oldu';
        throw new Error(errorMessage);
      }
    },
    onSuccess: (_, { userId }) => {
      toast.success('Kullanıcı rolü güncellendi!', {
        description: 'Kullanıcı yetkisi başarıyla değiştirildi'
      });
      
      // Kullanıcı listesini ve ilgili kullanıcının detaylarını yenile
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
    onError: (error: any) => {
      toast.error('Rol güncelleme başarısız!');
    }
  });
  
  return {
    users: usersQuery.data?.users || [],
    totalUsers: usersQuery.data?.total || 0,
    currentPage: usersQuery.data?.page || 1,
    totalPages: usersQuery.data?.pages || 0,
    isLoading: usersQuery.isLoading,
    error: usersQuery.error,
    deleteUser: deleteUserMutation.mutate,
    isDeleting: deleteUserMutation.isPending,
    deleteError: deleteUserMutation.error,
    updateUserRole: updateUserRoleMutation.mutate,
    isUpdatingRole: updateUserRoleMutation.isPending,
    updateRoleError: updateUserRoleMutation.error
  };
}
