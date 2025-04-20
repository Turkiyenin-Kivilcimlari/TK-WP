import { useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';

// Resim yükleme hook'u
export function useUploadImage() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // Resim yükle
  const uploadImage = async (file: File, options?: { onSuccess?: (data: any) => void; folder?: string }) => {
    if (!file) return { success: false, message: 'Dosya bulunamadı' };

    // Görsel mi kontrol et
    if (!file.type.includes('image/')) {
      return { success: false, message: 'Sadece resim dosyaları yüklenebilir' };
    }

    setIsUploading(true);
    setProgress(0);

    try {
      // Base64 formatına dönüştür
      const base64 = await convertToBase64(file);
      
      // API isteği için veri hazırla
      const uploadData = {
        image: base64,
        folder: options?.folder || 'user_avatars'
      };

      // Resmi yükle - API yolunu düzelttik
      const response = await api.post('/api/upload', uploadData, {
        onUploadProgress: (progressEvent) => {
          const percentage = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
          setProgress(percentage);
        },
      });

      // Başarılı yükleme
      if (response.data.success && response.data.url) {
        if (options?.onSuccess) {
          options.onSuccess(response.data);
        }
        return response.data;
      }

      return { success: false, message: 'Görsel yüklenirken bir hata oluştu' };
    } catch (error: any) {
      return { 
        success: false, 
        message: 'Görsel yüklenirken bir hata oluştu' 
      };
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  // Base64'e dönüştürme yardımcı fonksiyonu
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Resim sil
  const deleteImage = async (url: string) => {
    if (!url) return { success: false, message: 'Silmek için URL gerekli' };
    
    setIsDeleting(true);
    
    try {
      // URL'den public_id'yi çıkar (cloudinary/folder/image.jpg)
      const urlParts = url.split('/');
      const filenameWithExt = urlParts[urlParts.length - 1]; // image.jpg
      const filename = filenameWithExt.split('.')[0]; // image
      
      // Son iki parçayı al (folder/image)
      const folder = urlParts[urlParts.length - 2]; // folder
      const public_id = `${folder}/${filename}`;
      
      // API yolunu düzelttik
      const response = await api.post('/api/upload/delete', { url });
      return response.data;
    } catch (error: any) {
      return { 
        success: false, 
        message: 'Görsel silinirken bir hata oluştu' 
      };
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    uploadImage,
    deleteImage,
    isUploading,
    isDeleting,
    progress
  };
}
