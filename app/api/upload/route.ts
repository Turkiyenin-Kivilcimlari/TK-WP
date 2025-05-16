import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/middleware/authMiddleware';
import cloudinary from '@/lib/cloudinary';
import { encryptedJson } from '@/lib/response';

export async function POST(req: NextRequest) {
  try {
    // Kimlik doğrulama kontrolü
    const token = await authenticateUser(req);
    if (!token) {
      return encryptedJson(
        { success: false, message: 'Giriş yapmalısınız' },
        { status: 401 }
      );
    }

    // İstek gövdesini alalım
    const data = await req.json();
    const { image, folder = 'user_avatars' } = data;
    

    if (!image) {
      return encryptedJson(
        { success: false, message: 'Resim verisi eksik' },
        { status: 400 }
      );
    }

    // Klasör doğrulama - board_members klasörü için destek ekleyelim
    const allowedFolders = ['user_avatars', 'article_thumbnails', 'board_members'];
    const uploadFolder = allowedFolders.includes(folder) ? folder : 'user_avatars';
    
    
    // Cloudinary'ye yükleme ayarları
    const uploadOptions: {
      folder: string;
      transformation: Array<Record<string, any>>;
    } = {
      folder: uploadFolder,
      transformation: [
        { quality: 99 }
      ]
    };
    
    // Thumbnail özelliklerine göre ayarları değiştir
    if (uploadFolder === 'article_thumbnails') {
      uploadOptions.transformation.push(
        { width: 600, height: 450, crop: 'fill', gravity: 'auto', quality: 99 },
      );
    }
    
    // Board üyeleri için özel boyutlandırma
    if (uploadFolder === 'board_members') {
      uploadOptions.transformation.push(
        { width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 99 },
      );
    }
    
    
    // Cloudinary'ye yükleme
    const uploadResponse = await cloudinary.uploader.upload(image, uploadOptions);
    

    return encryptedJson({
      success: true,
      url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id
    });
  } catch (error: any) {
    return encryptedJson(
      { success: false, message: 'Resim yüklenemedi' },
      { status: 500 }
    );
  }
}
