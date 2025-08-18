import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface Application {
  _id: string;
  status: 'pending' | 'approved' | 'rejected' | 'draft' | 'deleted';
  [key: string]: any;
}

interface UpdateStatusParams {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'draft' | 'deleted';
  adminNotes?: string;
}

export default function useAdminApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Use the correct API endpoint for admin applications
      const response = await api.get('/api/admin/applications');
      setApplications(response.data.applications || []);
    } catch (err: any) {
      setError('Başvurular yüklenirken bir hata oluştu');
      toast.error('Hata!', {
        description: 'Başvurular yüklenirken bir hata oluştu.'
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateApplicationStatus = useCallback(async (params: UpdateStatusParams) => {
    try {
      setIsUpdating(true);
      
      
      // Make the API call to update status using the correct path
      const response = await api.put(`/api/admin/applications/${params.id}`, {
        status: params.status,
        adminNotes: params.adminNotes
      });
      
      if (response.data.success) {
        // Update local state to reflect the change
        setApplications(prev => prev.map(app => 
          app._id === params.id 
            ? { ...app, status: params.status, adminNotes: params.adminNotes || app.adminNotes }
            : app
        ));
        
        toast.success('Başarılı!', {
          description: 'Başvuru durumu güncellendi.'
        });
        
        return true;
      } else {
        throw new Error('Durum güncellenirken bir hata oluştu');
      }
    } catch (err: any) {
      toast.error('Hata!', {
        description: 'Durum güncellenirken bir hata oluştu.'
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  // Load applications on initial render
  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  return {
    applications,
    isLoading,
    isUpdating,
    error,
    fetchApplications,
    updateApplicationStatus,
  };
}
