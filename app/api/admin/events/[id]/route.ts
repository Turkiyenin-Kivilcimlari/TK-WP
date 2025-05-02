import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Event from '@/models/Event';
import { authenticateUser } from '@/middleware/authMiddleware';
import { UserRole } from '@/models/User';
import { checkAdminAuthWithTwoFactor } from '@/middleware/authMiddleware';
import { encryptedJson } from '@/lib/response';

// Etkinlik silme (admin için)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin işlemi olduğu için 2FA kontrolü
    const adminCheck = await checkAdminAuthWithTwoFactor(req);
    if (adminCheck) return adminCheck;
    
    // Normal token kontrolünü de yapalım
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

    const eventId = params.id;
    
    await connectToDatabase();
    
    // Etkinliği ID'ye göre sil
    const result = await Event.findByIdAndDelete(eventId);
    
    if (!result) {
      return encryptedJson(
        { success: false, message: 'Etkinlik bulunamadı' },
        { status: 404 }
      );
    }
    
    return encryptedJson({
      success: true,
      message: 'Etkinlik başarıyla silindi'
    });
    
  } catch (error: any) {
    return encryptedJson(
      { success: false, message: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}
