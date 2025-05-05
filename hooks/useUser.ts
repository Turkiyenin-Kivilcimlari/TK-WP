import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { User } from './useAuth';
import { UserRole } from '@/models/User';

// Kullanıcı güncelleme formu türü
export interface UpdateUserData {
  name?: string;
  lastname?: string;
  phone?: string;
  role?: UserRole;
  allowEmails?: boolean; // Yeni alan eklendi
}

export function useUser(userId?: string) {
  const queryClient = useQueryClient();
  
  // Belirli bir kullanıcının detaylarını getirme
  const userQuery = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await api.get(`/users/${userId}`);
      return response.data.user as User;
    },
    enabled: !!userId, // Sadece userId varsa çalıştır
  });
  
  // Kullanıcı bilgilerini güncelleme
  const updateUserMutation = useMutation({
    mutationFn: async (data: UpdateUserData) => {
      if (!userId) throw new Error('Kullanıcı ID\'si belirtilmemiş');
      const response = await api.put(`/users/${userId}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Bilgiler güncellendi!', {
        description: 'Kullanıcı bilgileriniz başarıyla güncellendi'
      });
      
      // Kullanıcı verilerini yenile
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
    onError: (error: any) => {
      toast.error('Güncelleme başarısız!');
    }
  });
  
  return {
    user: userQuery.data,
    isLoading: userQuery.isLoading,
    error: userQuery.error,
    updateUser: updateUserMutation.mutate,
    isUpdating: updateUserMutation.isPending,
    updateError: updateUserMutation.error
  };
}
