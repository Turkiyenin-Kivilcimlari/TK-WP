import { connectToDatabase } from '@/lib/mongodb';
import Event, { EventStatus } from '@/models/Event';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/middleware/authMiddleware';
import { UserRole } from '@/models/User';

// Etkinliği reddetme API endpoint'i
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // Kullanıcı kimlik doğrulaması
    const token = await authenticateUser(req);
    if (!token) {
      return NextResponse.json({ success: false, message: 'Yetkilendirme hatası' }, { status: 401 });
    }

    // Admin rolü kontrolü
    if (token.role !== UserRole.ADMIN && token.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ success: false, message: 'Bu işlem için yetkiniz bulunmuyor' }, { status: 403 });
    }

    await connectToDatabase();

    const { slug } = params;
    
    // Etkinliği bul
    const event = await Event.findOne({ slug });
    
    if (!event) {
      return NextResponse.json({ success: false, message: 'Etkinlik bulunamadı' }, { status: 404 });
    }

    // İstek gövdesinden ret sebebini al
    const { reason } = await req.json();
    
    // Etkinliği reddet
    event.status = EventStatus.REJECTED;
    event.rejectionReason = reason || 'İçerik politikalarına uygun değil';
    
    await event.save();

    return NextResponse.json({
      success: true,
      message: 'Etkinlik başarıyla reddedildi'
    });
    
  } catch (error: any) {
    
    return NextResponse.json({
      success: false,
      message: 'Etkinlik reddedilirken bir hata oluştu'
    }, { status: 500 });
  }
}
