import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/middleware/authMiddleware';
import { deleteCloudinaryImage } from '@/lib/cloudinary';

export async function POST(req: NextRequest) {
  try {
    // Kullanıcı kimlik doğrulaması
    const authResult = await authenticateUser(req);
    if (!authResult || !authResult.success) {
      return NextResponse.json(
        { success: false, message: 'Kimlik doğrulama başarısız' },
        { status: 401 }
      );
    }
    
    // İstek gövdesinden URL alınır
    const data = await req.json();
    const { url } = data;


    if (!url) {
      return NextResponse.json(
        { success: false, message: 'Resim URL\'si eksik' },
        { status: 400 }
      );
    }

    // Silme işlemini gerçekleştir
    const isDeleted = await deleteCloudinaryImage(url);
    
    // İşlem sonucuna göre yanıt dön
    if (isDeleted) {
      return NextResponse.json({
        success: true,
        message: 'Resim başarıyla silindi'
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Resim silinemedi' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}
