import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Cloudinary'den görsel URL'sini kullanarak public_id çıkarma fonksiyonu
export const extractPublicId = (url: string): string | null => {
  try {
    if (!url) return null;
    
    // URL'deki public_id kısmını ayıklama
    let publicId = '';
    
    // Regex ile en son / ile . arasındaki kısmı al
    const matched = url.match(/\/([^\/]+)\.([^\.]+)$/);
    
    if (matched && matched[1]) {
      // Son kısımda dosya adı
      const filename = matched[1];
      
      // URL'de klasör (folder) var mı kontrol et
      if (url.includes('/user_avatars/')) {
        publicId = 'user_avatars/' + filename;
      } else if (url.includes('/article_thumbnails/')) {
        publicId = 'article_thumbnails/' + filename;
      } else if (url.includes('/board_members/')) {
        publicId = 'board_members/' + filename;
      } else {
        publicId = filename;
      }
    } else {
      // Alternatif yaklaşım: URL'yi parçalara böl
      const parts = url.split('/');
      const filename = parts[parts.length - 1].split('.')[0]; // Uzantıyı kaldır
      
      // İki parça yukarıda klasör adı olabilir
      if (parts.length > 2 && parts[parts.length - 2] !== 'upload') {
        publicId = parts[parts.length - 2] + '/' + filename;
      } else {
        publicId = filename;
      }
    }
    
    return publicId || null;
  } catch (error) {
    return null;
  }
};

// Cloudinary'den görsel silme fonksiyonu
export const deleteCloudinaryImage = async (url: string): Promise<boolean> => {
  try {
    if (!url) return false;
    
    const publicId = extractPublicId(url);
    if (!publicId) {
      return false;
    }
    
    const result = await cloudinary.uploader.destroy(publicId);
    
    return result.result === 'ok' || result.result === 'not found';
  } catch (error) {
    return false;
  }
};

// Toplu görsel silme fonksiyonu
export const deleteMultipleImages = async (urls: string[]): Promise<{
  success: boolean;
  deleted: number;
  failed: number;
  errors: string[];
}> => {
  const result = {
    success: true,
    deleted: 0,
    failed: 0,
    errors: [] as string[]
  };
  
  if (!urls || urls.length === 0) {
    return result;
  }
  
  // Her URL için silme işlemi yap
  for (const url of urls) {
    try {
      if (!url) continue;
      
      const isDeleted = await deleteCloudinaryImage(url);
      if (isDeleted) {
        result.deleted++;
      } else {
        result.failed++;
        result.errors.push(`${url} silinemedi`);
      }
    } catch (error) {
      result.failed++;
      result.errors.push(`${url} için hata: ${error}`);
    }
  }
  
  // En az bir başarılı silme varsa ve hiç başarısız yoksa genel başarı true
  result.success = result.deleted > 0 && result.failed === 0;
  
  return result;
};

export default cloudinary;