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
      .populate('author', 'name lastname avatar');
    
    if (!event) {
      return encryptedJson({ success: false, message: 'Etkinlik bulunamadı' }, { status: 404 });
    }
    
    // Etkinlik verilerini yeni modele göre hazırla
    const eventData = {
      id: event._id ? event._id.toString() : '',
      title: event.title,
      slug: event.slug,
      description: event.description,
      // Etkinlik günleri varsa ilk günü eventDate'e ata, yoksa null
      eventDate: Array.isArray(event.eventDays) && event.eventDays.length > 0
        ? event.eventDays[0].date
        : null,
      // Tek günlü etkinlikler için genel eventType kullan
      // Çok günlü etkinlikler için eventDays içindeki her günün kendi eventType'ı kullanılacak
      eventType: event.eventType,
      // Yeni model için eventDays alanını ekleyelim
      eventDays: Array.isArray(event.eventDays) ? event.eventDays.map((day: any) => ({
        date: day.date,
        startTime: day.startTime,
        endTime: day.endTime || "",
        // Her günün kendi tipini kullan
        eventType: day.eventType || event.eventType, // Eğer gün tipi yoksa etkinliğin genel tipini kullan
        location: day.location || "",
        onlineUrl: day.onlineUrl || "",
      })) : [],
      location: event.eventDays && event.eventDays.length > 0 ? event.eventDays[0].location || "" : "",
      onlineUrl: event.eventDays && event.eventDays.length > 0 ? event.eventDays[0].onlineUrl || "" : "",
      participants: event.participants?.map((p: any) => ({
        userId: p.userId.toString(),
        name: p.name,
        lastname: p.lastname,
        email: p.email,
        registeredAt: p.registeredAt,
      })) || [],
      participantCount: event.participantCount || event.participants?.length || 0,
      coverImage: event.coverImage || "",
      status: event.status,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      author: event.author && typeof event.author === 'object' && 'name' in event.author ? {
        id: event.author._id.toString(),
        name: event.author.name,
        lastname: 'lastname' in event.author ? event.author.lastname : '',
        avatar: 'avatar' in event.author ? event.author.avatar || null : null
      } : null
    };
    
    return encryptedJson({ success: true, event: eventData });
  } catch (error) {
    return encryptedJson({ success: false, message: 'Bir hata oluştu' }, { status: 500 });
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

    // Eğer eventDays bir günden fazla ise, eventType'ı eventDays'deki her günün tipinden belirle
    if (updateData.eventDays && Array.isArray(updateData.eventDays) && updateData.eventDays.length > 1) {
      // Çok günlü etkinlikler için, her gün kendi tipine sahip olmalı (eventDays zaten bu bilgiyi içeriyor)
      // eventType alanı genel etkinlik tipi olarak belirlenir - çok günlü etkinliklerde bu genellikle HYBRID olabilir
      
      // Etkinlik tiplerini kontrol et
      const hasInPerson = updateData.eventDays.some((day: any) => day.eventType === EventType.IN_PERSON);
      const hasOnline = updateData.eventDays.some((day: any) => day.eventType === EventType.ONLINE);
      const hasHybrid = updateData.eventDays.some((day: any) => day.eventType === EventType.HYBRID);
      
      // Etkinlik tipini belirle
      if (hasHybrid || (hasInPerson && hasOnline)) {
        updateData.eventType = EventType.HYBRID;
      } else if (hasInPerson) {
        updateData.eventType = EventType.IN_PERSON;
      } else if (hasOnline) {
        updateData.eventType = EventType.ONLINE;
      }
    } 
    // Eğer tek günlük etkinlik ise, günün tipini etkinlik tipi olarak kullan
    else if (updateData.eventDays && Array.isArray(updateData.eventDays) && updateData.eventDays.length === 1) {
      // Tek günlük etkinliklerde günün tipi genel etkinlik tipi olur
      updateData.eventType = updateData.eventDays[0].eventType;
    }
    
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
      { success: false, message: 'Bir hata oluştu.' },
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
