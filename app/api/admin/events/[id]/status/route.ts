import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Event, { EventStatus } from '@/models/Event';
import { authenticateUser } from '@/middleware/authMiddleware';
import { UserRole } from '@/models/User';
import { checkAdminAuthWithTwoFactor } from '@/middleware/authMiddleware';

// Etkinlik durumunu güncelleme (admin için)
export async function PATCH(
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
      return NextResponse.json(
        { success: false, message: 'Giriş yapmalısınız' },
        { status: 401 }
      );
    }
    
    // Admin yetkisi kontrolü
    if (token.role !== UserRole.ADMIN && token.role !== UserRole.SUPERADMIN) {
      return NextResponse.json(
        { success: false, message: 'Bu işlem için admin yetkisi gereklidir' },
        { status: 403 }
      );
    }

    const eventId = params.id;
    const { status } = await req.json();
    
    await connectToDatabase();
    
    // ID'ye göre etkinliği bul
    const event = await Event.findById(eventId);
    
    if (!event) {
      return NextResponse.json(
        { success: false, message: 'Etkinlik bulunamadı' },
        { status: 404 }
      );
    }
    
    // Etkinlik durumunu güncelle
    event.status = status;
    await event.save();
    
    return NextResponse.json({
      success: true,
      message: 'Etkinlik durumu güncellendi',
      event
    });
    
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Bir hata oluştu'},
      { status: 500 }
    );
  }
}
