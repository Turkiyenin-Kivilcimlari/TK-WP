import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function useApplications() {
  const queryClient = useQueryClient();

  // Get user's applications
  const {
    data: applicationsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['userApplications'],
    queryFn: async () => {
      const response = await api.get('/api/applications/my');
      return response.data;
    },
    retry: 1,
  });

  // Submit a new application
  const submitApplication = useMutation({
    mutationFn: async (applicationData: any) => {
      const response = await api.post('/api/applications', applicationData);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Başvurunuz başarıyla alındı');
      queryClient.invalidateQueries({ queryKey: ['userApplications'] });
    },
    onError: (error: any) => {
      toast.error('Başvuru gönderilirken bir hata oluştu', {
        description: 'Lütfen daha sonra tekrar deneyin'
      });
    }
  });

  return {
    applications: applicationsData?.applications || [],
    isLoading,
    error,
    submitApplication: submitApplication.mutate,
    isSubmitting: submitApplication.isPending,
  };
}
