import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { EventStatus } from '@/models/Event';

// Etkinlik tipi
interface Event {
  id: string;
  title: string;
  description: string;
  slug: string;
  eventDate: Date;
  eventType: string;
  location?: string;
  onlineUrl?: string;
  coverImage: string;
  status: EventStatus;
  author?: {
    id: string;
    name: string;
    lastname: string;
    avatar?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Etkinlik sorgu parametreleri
interface EventsQueryParams {
  upcoming?: boolean;
  past?: boolean;
  my?: boolean;
  status?: string;
  eventType?: string;
  search?: string;
  grace?: number; // Eklenen yeni parametre: etkinlik sonrası geçiş süresi (dakika cinsinden)
}

// Etkinlik oluşturma fonksiyonu
export function useCreateEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (eventData: any) => {
      const response = await api.post('/api/events', eventData);
      return response.data;
    },
    onSuccess: () => {
      // Etkinlikler listesi ve ilgili verileri güncelle
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (error: any) => {
      toast.error('Etkinlik oluşturulamadı', {
        description: 'Bir hata oluştu. Lütfen tekrar deneyin.'
      });
    }
  });
}

// Etkinlik güncelleme fonksiyonu
export function useUpdateEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ slug, eventData }: { slug: string, eventData: any }) => {
      try {
        // Etkinlik güncellemesi için API isteği yap
        const response = await api.put(`/api/events/${slug}`, eventData);
        return response.data;
      } catch (error: any) {
        // Hatayı logla ve üst katmana at
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      // Tüm ilgili etkinlik verilerini güncelle
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', variables.slug] });
      queryClient.invalidateQueries({ queryKey: ['admin-events'] });
      queryClient.invalidateQueries({ queryKey: ['my-events'] });
      
      // Başarılı güncelleme mesajı göster
      const updatedStatus = data.event?.status;
      
      if (updatedStatus === 'PENDING_APPROVAL') {
        toast.success('Etkinlik onay için gönderildi', {
          description: 'Etkinliğiniz admin onayına gönderildi. İncelendikten sonra yayınlanacaktır.'
        });
      } else if (updatedStatus === 'APPROVED') {
        toast.success('Etkinlik onaylandı', {
          description: 'Etkinliğiniz başarıyla onaylandı ve yayınlandı.'
        });
      } else {
        toast.success('Etkinlik güncellendi', {
          description: 'Etkinlik bilgileri başarıyla güncellendi.'
        });
      }
    },
    onError: (error: any) => {
      toast.error('Etkinlik güncellenemedi', {
        description: 'Bir hata oluştu. Lütfen tekrar deneyin.'
      });
    }
  });
}

// Etkinlikleri getirme fonksiyonu
export function useEvents({
  upcoming = false,
  past = false,
  my = false,
  status,
  eventType,
  search = "",
  grace = 60 // Varsayılan olarak 60 dakika (1 saat) 
}: EventsQueryParams) {
  return useQuery({
    queryKey: ['events', { upcoming, past, my, status, eventType, search, grace }],
    queryFn: async () => {
      let url = `/events?`;
      if (upcoming) url += `upcoming=true&`;
      if (past) url += `past=true&`;
      if (my) url += `my=true&`;
      if (status) url += `status=${status}&`;
      if (eventType) url += `eventType=${eventType}&`;
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (grace !== 60) url += `grace=${grace}&`; // Grace period parametresini ekle

      const response = await api.get(url);
      return response.data;
    }
  });
}

// Admin etkinlikleri getirme fonksiyonu
export function useAdminEvents(params: Record<string, any> = {}) {
  return useQuery({
    queryKey: ['admin-events', params],
    queryFn: async () => {
      const response = await api.get('/api/admin/events', { params });
      return response.data;
    }
  });
}

// Tek etkinliği getirme fonksiyonu
export function useEvent(slug: string) {
  return useQuery({
    queryKey: ['event', slug],
    queryFn: async () => {
      if (!slug) return null;
      const response = await api.get(`/api/events/${slug}`);
      return response.data.event;
    },
    enabled: !!slug // slug varsa sorguyu çalıştır
  });
}

// Admin etkinlik yönetimi fonksiyonları
export function useApproveEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (eventId: string) => {
      const response = await api.post(`/api/admin/events/${eventId}/approve`);
      if (!response.data.success) {
        throw new Error('Failed to approve event');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useRejectEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ eventId, rejectionReason }: { eventId: string, rejectionReason: string }) => {
      const response = await api.post(`/api/admin/events/${eventId}/reject`, {
        rejectionReason
      });
      
      if (!response.data.success) {
        throw new Error('Failed to reject event');
      }
      
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (eventId: string) => {
      const response = await api.delete(`/api/admin/events/${eventId}`);
      if (!response.data.success) {
        throw new Error('Failed to delete event');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

