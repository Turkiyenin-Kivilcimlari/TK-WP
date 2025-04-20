import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Event, { EventStatus, EventType } from '@/models/Event';
import { authenticateUser } from '@/middleware/authMiddleware';
import { UserRole } from '@/models/User';
import slugify from 'slugify';

export const dynamic = 'force-dynamic';

// Etkinlikleri getir
export async function GET(req: NextRequest) {
  try {
    // URL'den parametreleri alma
    const url = new URL(req.url);
    const searchParams = url.searchParams;

    const upcoming = searchParams.get('upcoming') === 'true';
    const past = searchParams.get('past') === 'true';
    const my = searchParams.get('my') === 'true';
    const status = searchParams.get('status');
    const eventType = searchParams.get('eventType');
    const search = searchParams.get('search') || '';
    const grace = parseInt(searchParams.get('grace') || '60', 10); // Varsayılan 60 dakika (1 saat)

    await connectToDatabase();

    // Filtreleme kriterlerini oluştur
    const filter: any = {};

    // Kullanıcının kendi etkinliklerini getir
    if (my) {
      // Kullanıcının kimliğini doğrula
      const token = await authenticateUser(req);
      if (!token) {
        return NextResponse.json({ success: false, message: 'Yetkilendirme hatası' }, { status: 401 });
      }

      // Burada önemli düzeltme: organizer yerine author kullanılmalı
      // Etkinlik oluşturma kısmında author: token.id olarak kaydedildiğinden, 
      // burada da author alanıyla filtreleme yapmalıyız
      filter.author = token.id;

      // Kullanıcı kendi etkinliklerini görüntülerken, tüm durumları göster
      // Durum filtresi olarak belirtilen bir değer varsa onu kullan
      if (status) {
        filter.status = status;
      }

    } else {
      // Gelecek/Geçmiş etkinlik filtrelemesi
      if (upcoming) {
        // Yaklaşan etkinlikler: Şu andan başlayıp, etkinlik saatinden grace dakika (varsayılan 60 dk) sonrasına kadar
        const now = new Date();
        filter.eventDate = {
          $gte: new Date(now.getTime() - grace * 60 * 1000) // Şimdi - grace period
        };
      } else if (past) {
        // Geçmiş etkinlikler: Etkinlik saatinden grace dakika sonrası geçmişse
        const now = new Date();
        filter.eventDate = {
          $lt: new Date(now.getTime() - grace * 60 * 1000) // Şimdi - grace period
        };
      }

      // Durum filtresi
      if (status) {
        filter.status = status;
      } else {
        // Kendi etkinlikleri dışında sadece onaylanmış etkinlikleri göster
        filter.status = EventStatus.APPROVED;
      }
    }

    // Etkinlik tipi filtresi
    if (eventType) {
      filter.eventType = eventType;
    }

    // Arama filtresi
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }


    // Etkinlikleri getir - populate'i author olarak değiştirdik
    const events = await Event.find(filter)
      .sort({ eventDate: upcoming ? 1 : -1 })
      .populate('author', 'name lastname avatar email')
      .lean();


    // İstemciye dön
    return NextResponse.json({
      success: true,
      events: events.map(formatEvent)
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Etkinlikler getirilemedi'
    }, { status: 500 });
  }
}

// Etkinlik nesnesini formatla
function formatEvent(event: any) {
  return {
    id: event._id.toString(),
    title: event.title,
    slug: event.slug,
    description: event.description,
    eventDate: event.eventDate,
    eventType: event.eventType,
    location: event.location,
    onlineUrl: event.onlineUrl,
    coverImage: event.coverImage,
    status: event.status,
    // Author kullanımını düzenle
    organizer: event.author ? {
      id: event.author._id.toString(),
      name: event.author.name,
      lastname: event.author.lastname,
      avatar: event.author.avatar
    } : null,
    author: event.author ? {
      id: event.author._id.toString(),
      name: event.author.name,
      lastname: event.author.lastname,
      avatar: event.author.avatar,
      email: event.author.email
    } : null,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt
  };
}

// Yeni etkinlik oluştur
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    // Kullanıcı kimlik doğrulaması
    const token = await authenticateUser(req);
    if (!token) {
      return NextResponse.json({ success: false, message: 'Yetkilendirme hatası' }, { status: 401 });
    }

    // İstek gövdesini al
    const eventData = await req.json();

    // Slug kontrolü - eğer slug yoksa başlıktan oluştur
    if (!eventData.slug && eventData.title) {
      eventData.slug = slugify(eventData.title);
    }

    // Yetki kontrolü - sadece admin ve temsilci kullanıcılar etkinlik oluşturabilir
    if (token.role !== UserRole.ADMIN && token.role !== UserRole.SUPERADMIN && token.role !== UserRole.REPRESENTATIVE) {
      return NextResponse.json(
        { success: false, message: 'Bu işlem için yetkiniz bulunmamaktadır' },
        { status: 403 }
      );
    }

    // Veritabanı bağlantısı
    await connectToDatabase();

    // İstek verilerini al
    const { title, description, eventDate, eventType, location, onlineUrl, coverImage } = eventData;

    // Zorunlu alan kontrolü
    if (!title || !description || !eventDate || !eventType || !coverImage) {
      return NextResponse.json(
        { success: false, message: 'Tüm zorunlu alanları doldurun' },
        { status: 400 }
      );
    }

    // Etkinlik türüne göre ek kontroller
    if ((eventType === EventType.IN_PERSON || eventType === EventType.HYBRID) && !location) {
      return NextResponse.json(
        { success: false, message: 'Fiziksel etkinlikler için konum zorunludur' },
        { status: 400 }
      );
    }

    if ((eventType === EventType.ONLINE || eventType === EventType.HYBRID) && !onlineUrl) {
      return NextResponse.json(
        { success: false, message: 'Online etkinlikler için bağlantı zorunludur' },
        { status: 400 }
      );
    }

    // Etkinlik durumunu belirle
    let status = EventStatus.PENDING_APPROVAL;

    // Admin ve süper admin kullanıcılar için direkt onaylı olarak oluşturabilirler
    if (token.role === UserRole.ADMIN || token.role === UserRole.SUPERADMIN) {
      status = eventData.status || EventStatus.APPROVED;
    }

    // Yeni etkinlik oluştur
    const event = new Event({
      title,
      description,
      eventDate,
      eventType,
      location,
      onlineUrl,
      coverImage,
      author: token.id,
      status,
      slug: eventData.slug
    });

    // Etkinliği kaydet
    const savedEvent = await event.save();

    // Detayları ile birlikte etkinliği döndür
    const populatedEvent = await Event.findById(savedEvent._id).populate('author', 'name lastname email avatar role');

    return NextResponse.json({
      success: true,
      message: 'Etkinlik başarıyla oluşturuldu',
      event: populatedEvent
    }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Etkinlik oluşturulurken bir hata oluştu' },
      { status: 500 }
    );
  }
}
