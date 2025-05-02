import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Event, { EventStatus, EventType } from '@/models/Event';
import { authenticateUser } from '@/middleware/authMiddleware';
import { UserRole } from '@/models/User';
import { encryptedJson } from '@/lib/response';

export const dynamic = 'force-dynamic';

// Belirli bir etkinliği getir
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    await connectToDatabase();
    
    const event = await Event.findOne({ slug: params.slug })
      .populate('author', 'name lastname avatar'); // email kaldırıldı
    
    if (!event) {
      return encryptedJson({ success: false, message: 'Etkinlik bulunamadı' }, { status: 404 });
    }
    
    return encryptedJson({
      success: true,
      event: {
        id: event._id ? event._id.toString() : '',
        title: event.title,
        slug: event.slug,
        description: event.description,
        eventDate: event.eventDate,
        eventType: event.eventType,
        location: event.location,
        onlineUrl: event.onlineUrl,
        coverImage: event.coverImage,
        status: event.status,
        author: event.author ? {
          name: (event.author as any).name,
          lastname: (event.author as any).lastname,
          avatar: (event.author as any).avatar
          // email alanı kaldırıldı
        } : null,
        rejectionReason: event.rejectionReason,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt
      }
    });
  } catch (error) {
    return encryptedJson({ success: false, message: 'Etkinlik getirilemedi' }, { status: 500 });
  }
}

// Etkinlik güncelleme
export async function PUT(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // Kimlik doğrulama kontrolü
    const token = await authenticateUser(req);
    if (!token) {
      return encryptedJson(
        { success: false, message: 'Giriş yapmalısınız' },
        { status: 401 }
      );
    }

    const userId = typeof token === 'string' ? null : token.id;
    const userRole = typeof token === 'string' ? null : token.role;
    const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.SUPERADMIN;

    const { slug } = params;
    const body = await req.json();

    await connectToDatabase();

    // Etkinliği bul
    const event = await Event.findOne({ slug });

    if (!event) {
      return encryptedJson(
        { success: false, message: 'Etkinlik bulunamadı' },
        { status: 404 }
      );
    }

    // Etkinlik sahibi mi veya admin mi kontrol et
    const authorId = event.author ? event.author.toString() : null;
    
    if (!isAdmin && authorId !== userId) {
      return encryptedJson(
        { success: false, message: 'Bu etkinliği düzenleme yetkiniz yok' },
        { status: 403 }
      );
    }

    // Güncelleme verilerini hazırla
    const updateData: any = { ...body };
    
    // Admin değilse, durumu otomatik olarak PENDING_APPROVAL olarak ayarla
    // Reddedilmiş bir etkinliği düzenliyorsa da PENDING_APPROVAL'a geçsin
    if (!isAdmin || event.status === EventStatus.REJECTED) {
      updateData.status = EventStatus.PENDING_APPROVAL;
    }

    // Etkinliği güncelle
    const updatedEvent = await Event.findOneAndUpdate(
      { slug },
      { $set: updateData },
      { new: true }
    ).populate('author');

    if (!updatedEvent) {
      return encryptedJson(
        { success: false, message: 'Etkinlik güncellenemedi' },
        { status: 500 }
      );
    }

    return encryptedJson({
      success: true,
      message: 'Etkinlik başarıyla güncellendi',
      event: updatedEvent
    });
  } catch (error: any) {
    return encryptedJson(
      { success: false, message: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}

// Etkinliği sil
export async function DELETE(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // Kimlik doğrulama kontrolü
    const token = await authenticateUser(req);
    if (!token) {
      return encryptedJson(
        { success: false, message: 'Giriş yapmalısınız' },
        { status: 401 }
      );
    }
    
    const slug = params.slug;
    
    await connectToDatabase();
    
    // Etkinliği bul
    const event = await Event.findOne({ slug });
    
    if (!event) {
      return encryptedJson(
        { success: false, message: 'Etkinlik bulunamadı' },
        { status: 404 }
      );
    }
    
    // Sadece yazar, admin ve süper admin kullanıcılar silebilir
    const isAuthor = token.id === event.author.toString();
    const isAdmin = token.role === UserRole.ADMIN || token.role === UserRole.SUPERADMIN;
    
    if (!isAuthor && !isAdmin) {
      return encryptedJson(
        { success: false, message: 'Bu işlem için yetkiniz bulunmamaktadır' },
        { status: 403 }
      );
    }
    
    // Etkinliği sil
    await Event.deleteOne({ _id: event._id });
    
    return encryptedJson({
      success: true,
      message: 'Etkinlik başarıyla silindi'
    });
    
  } catch (error: any) {
    return encryptedJson(
      { success: false, message: 'Etkinlik silinirken bir hata oluştu' },
      { status: 500 }
    );
  }
}
