import { connectToDatabase } from '@/lib/mongodb';
import Event, { EventStatus } from '@/models/Event';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, checkAdminAuthWithTwoFactor } from '@/middleware/authMiddleware';
import mongoose from 'mongoose';
import { UserRole } from '@/models/User';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Etkinliği reddetme (admin için)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ID kontrolü eklendi
    const { id } = params;
    
    if (!id || id === 'undefined') {
      return NextResponse.json(
        { success: false, message: "Geçersiz etkinlik ID'si" },
        { status: 400 }
      );
    }

    // MongoDB ObjectId doğrulaması
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Geçersiz etkinlik ID formatı" },
        { status: 400 }
      );
    }

    // Kullanıcı doğrulama - standart auth ekle
    let user;
    
    try {
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
    
    user = token; // Save user info
    } catch (error: any) {
      return NextResponse.json(
        { success: false, message: 'Doğrulama hatası.' },
        { status: 401 }
      );
    }

    await connectToDatabase();
    const body = await req.json();
    
    const { rejectionReason } = body;


    if (!rejectionReason) {
      return NextResponse.json(
        { success: false, message: "Reddetme nedeni belirtilmelidir" },
        { status: 400 }
      );
    }

    const event = await Event.findById(id);

    if (!event) {
      return NextResponse.json(
        { success: false, message: "Etkinlik bulunamadı" },
        { status: 404 }
      );
    }

    // Etkinliğin durumunu güncelle
    event.status = EventStatus.REJECTED;
    event.rejectionReason = rejectionReason;
    await event.save();

    return NextResponse.json(
      { success: true, message: "Etkinlik reddedildi" },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: "Bir hata oluştu" },
      { status: 500 }
    );
  }
}
