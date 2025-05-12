import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { authenticateUser, checkAdminAuthWithTwoFactor } from '@/middleware/authMiddleware';
import { UserRole } from '@/models/User';
import mongoose from 'mongoose';
import { encryptedJson } from '@/lib/response';
import Board from '@/models/Board';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Board üyeleri sıralamasını güncelle
export async function POST(req: NextRequest) {
  try {
    // Admin işlemi olduğu için 2FA kontrolü
    const adminCheck = await checkAdminAuthWithTwoFactor(req);
    if (adminCheck) return adminCheck;
    
    // Normal token kontrolü
    const token = await authenticateUser(req);
    if (!token) {
      return encryptedJson(
        { success: false, message: 'Giriş yapmalısınız' },
        { status: 401 }
      );
    }
    
    // Admin yetkisi kontrolü
    if (token.role !== UserRole.ADMIN && token.role !== UserRole.SUPERADMIN) {
      return encryptedJson(
        { success: false, message: 'Bu işlem için admin yetkisi gereklidir' },
        { status: 403 }
      );
    }

    // İstek gövdesinden sıralama verisini al
    const body = await req.json();
    const { items } = body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return encryptedJson(
        { success: false, message: 'Geçerli sıralama verisi sağlanmadı' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    
    // Her bir üye için sıralama bilgisini güncelle
    for (const item of items) {
      if (!item.id || !mongoose.Types.ObjectId.isValid(item.id)) {
        continue; // Geçersiz ID'leri atla
      }

      await Board.findByIdAndUpdate(item.id, { order: item.order });
    }

    return encryptedJson({
      success: true,
      message: 'Sıralama başarıyla güncellendi'
    });
    
  } catch (error: any) {
    console.error("Board sıralama hatası:", error);
    return encryptedJson(
      { success: false, message: 'Sıralama güncellenirken bir hata oluştu' },
      { status: 500 }
    );
  }
}
