import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import {CommunityTeamMember} from '@/models/CommunityTeam';
import { authenticateUser, checkAdminAuthWithTwoFactor } from '@/middleware/authMiddleware';
import { UserRole } from '@/models/User';
import { encryptedJson } from '@/lib/response';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Takım üyelerinin sırasını değiştir
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
    
    if (!items || !Array.isArray(items)) {
      return encryptedJson(
        { success: false, message: 'Geçersiz sıralama verisi' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    
    // Her bir elemanın sırasını güncelle
    for (const item of items) {
      if (!item.id || !item.order) continue;
      
      await CommunityTeamMember.findByIdAndUpdate(item.id, { order: item.order });
    }
    
    return encryptedJson({
      success: true,
      message: 'Sıralama başarıyla güncellendi'
    });
    
  } catch (error) {
    return encryptedJson(
      { success: false, message: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}
