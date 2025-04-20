import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/middleware/authMiddleware';
import cloudinary from '@/lib/cloudinary';

export async function POST(req: NextRequest) {
  try {
    // Kimlik doğrulama kontrolü
    const token = await authenticateUser(req);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Giriş yapmalısınız' },
        { status: 401 }
      );
    }

    // İstek gövdesini alalım
    const data = await req.json();
    const { image, folder = 'user_avatars' } = data;
    

    if (!image) {
      return NextResponse.json(
        { success: false, message: 'Resim verisi eksik' },
        { status: 400 }
      );
    }

    // Klasör doğrulama
    const uploadFolder = folder === 'article_thumbnails' ? 'article_thumbnails' : 'user_avatars';
    
    
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
    
    
    // Cloudinary'ye yükleme
    const uploadResponse = await cloudinary.uploader.upload(image, uploadOptions);
    

    return NextResponse.json({
      success: true,
      url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Resim yüklenemedi' },
      { status: 500 }
    );
  }
}
