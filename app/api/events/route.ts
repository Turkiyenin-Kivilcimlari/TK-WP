import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Event, { EventStatus, EventType } from "@/models/Event";
import { authenticateUser } from "@/middleware/authMiddleware";
import { UserRole } from "@/models/User";
import { encryptedJson } from "@/lib/response";
import { Schema } from "mongoose";
import slugify from "slugify";
import { safeParseDate } from '@/lib/utils';

export const dynamic = "force-dynamic";

// Etkinlikleri getir
export async function GET(req: NextRequest) {
  try {
    // URL'den parametreleri alma
    const url = new URL(req.url);
    const searchParams = url.searchParams;

    const upcoming = searchParams.get("upcoming") === "true";
    const past = searchParams.get("past") === "true";
    const my = searchParams.get("my") === "true";
    const status = searchParams.get("status");
    const eventType = searchParams.get("eventType");
    const search = searchParams.get("search") || "";
    const grace = parseInt(searchParams.get("grace") || "60", 10); // Varsayılan 60 dakika (1 saat)

    await connectToDatabase();

    // Filtreleme kriterlerini oluştur
    const filter: any = {};

    // Kullanıcının kendi etkinliklerini getir
    if (my) {
      // Kullanıcının kimliğini doğrula
      const token = await authenticateUser(req);
      if (!token) {
        return encryptedJson(
          { success: false, message: "Yetkilendirme hatası" },
          { status: 401 }
        );
      }

      filter.author = token.id;

      if (status) {
        filter.status = status;
      }
    } else {
      // Yaklaşan/Geçmiş etkinlik filtrelemesi için etkinlik günlerini kontrol et
      const now = new Date();
      
      if (upcoming) {
        // Yaklaşan etkinlikler: Son günü henüz geçmemiş etkinlikler
        filter.$or = [
          { 
            "eventDays.date": { 
              $gte: safeParseDate(new Date(now.setHours(0, 0, 0, 0)))
            } 
          },
          {
            $and: [
              { "eventDays.date": { $eq: safeParseDate(new Date(now.setHours(0, 0, 0, 0))) } },
              { 
                $or: [
                  { "eventDays.endTime": { $exists: true, $ne: "" } },
                  { "eventDays.startTime": { $exists: true } }
                ]
              }
            ]
          }
        ];
      } else if (past) {
        // Geçmiş etkinlikler: Son günü geçmiş etkinlikler
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        
        filter["eventDays.date"] = { 
          $lt: safeParseDate(new Date(yesterday.setHours(23, 59, 59, 999)))
        };
      }

      if (status) {
        filter.status = status;
      } else {
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
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { "eventDays.location": { $regex: search, $options: "i" } },
      ];
    }

    // Etkinlikleri getir
    const events = await Event.find(filter)
      .sort({ "eventDays.0.date": upcoming ? 1 : -1 })
      .populate("author", "name lastname avatar")
      .lean();

    return encryptedJson({
      success: true,
      events: events.map(formatEvent),
    });
  } catch (error) {
    return encryptedJson(
      {
        success: false,
        message: "Etkinlikler getirilemedi",
      },
      { status: 500 }
    );
  }
}

// Etkinlik nesnesini formatla
function formatEvent(event: any) {
  return {
    id: event._id.toString(),
    title: event.title,
    slug: event.slug,
    description: event.description,
    eventType: event.eventType,
    eventDays: event.eventDays
      ? event.eventDays.map((day: any) => ({
          date: day.date,
          startTime: day.startTime,
          endTime: day.endTime,
          location: day.location || null,
          onlineUrl: day.onlineUrl || null,
          eventType: day.eventType || event.eventType,
        }))
      : [],
    coverImage: event.coverImage,
    status: event.status,
    organizer: event.author
      ? {
          name: event.author.name,
          lastname: event.author.lastname,
          avatar: event.author.avatar,
        }
      : null,
    author: event.author
      ? {
          id: event.author._id,
          name: event.author.name,
          lastname: event.author.lastname,
          avatar: event.author.avatar,
        }
      : null,
    participants: event.participants?.map((p: any) => ({
      userId: p.userId.toString(),
      name: p.name,
      lastname: p.lastname,
      email: p.email,
    })) || [],
    participantCount: event.participantCount || event.participants?.length || 0,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

// Yeni etkinlik oluştur
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const token = await authenticateUser(req);
    if (!token) {
      return encryptedJson(
        { success: false, message: "Yetkilendirme hatası" },
        { status: 401 }
      );
    }

    const eventData = await req.json();

    if (!eventData.slug && eventData.title) {
      eventData.slug = slugify(eventData.title);
    }

    if (
      token.role !== UserRole.ADMIN &&
      token.role !== UserRole.SUPERADMIN &&
      token.role !== UserRole.REPRESENTATIVE
    ) {
      return encryptedJson(
        { success: false, message: "Bu işlem için yetkiniz bulunmamaktadır" },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const { title, description, eventType, eventDays, coverImage } = eventData;

    if (!title || !description || !eventType || !eventDays || !coverImage) {
      return encryptedJson(
        {
          success: false,
          message: "Tüm zorunlu alanları doldurun",
          errors: {
            title: !title ? "Başlık zorunludur" : null,
            description: !description ? "Açıklama zorunludur" : null,
            eventType: !eventType ? "Etkinlik tipi zorunludur" : null,
            eventDays: !eventDays ? "En az bir etkinlik günü gereklidir" : null,
            coverImage: !coverImage ? "Kapak görseli zorunludur" : null,
          },
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(eventDays) || eventDays.length === 0) {
      return encryptedJson(
        { success: false, message: "En az bir etkinlik günü eklemelisiniz" },
        { status: 400 }
      );
    }

    const fixedEventDays = eventDays.map((day) => {
      const updatedDay = { ...day };

      if (updatedDay.eventType === EventType.ONLINE) {
        if (!updatedDay.endTime || updatedDay.endTime === "") {
          updatedDay.endTime = "23:59";
        }
      }

      return updatedDay;
    });

    const invalidDays = fixedEventDays.filter((day) => {
      try {
        if (day.eventType === EventType.IN_PERSON) {
          if (!day.location || (!day.endTime && day.endTime !== undefined))
            return true;
        }

        if (day.eventType === EventType.ONLINE && !day.onlineUrl) {
          return true;
        }

        if (day.eventType === EventType.HYBRID) {
          if (
            !day.location ||
            !day.onlineUrl ||
            (!day.endTime && day.endTime !== undefined)
          )
            return true;
        }

        return false;
      } catch (err) {
        return true;
      }
    });

    if (invalidDays.length > 0) {
      return encryptedJson(
        {
          success: false,
          message: "Etkinlik günleri için gerekli bilgiler eksik",
          errors: {
            eventDays:
              "Her etkinlik günü için ilgili alanların doldurulması gerekiyor",
          },
        },
        { status: 400 }
      );
    }

    let status = EventStatus.PENDING_APPROVAL;

    if (token.role === UserRole.ADMIN || token.role === UserRole.SUPERADMIN) {
      status = eventData.status || EventStatus.APPROVED;
    }

    try {
      const event = new Event({
        title,
        description,
        eventType,
        eventDays: fixedEventDays,
        coverImage,
        author: token.id,
        status,
        participants: [],
        slug: eventData.slug || undefined,
      });

      const savedEvent = await event.save();

      const populatedEvent = await Event.findById(savedEvent._id).populate(
        "author",
        "name lastname avatar"
      );

      return encryptedJson(
        {
          success: true,
          message: "Etkinlik başarıyla oluşturuldu",
          event: populatedEvent,
        },
        { status: 201 }
      );
    } catch (modelError: any) {
      if (modelError.name === "ValidationError") {
        const validationErrors: Record<string, string> = {};

        for (const path in modelError.errors) {
          validationErrors[path] = modelError.errors[path].message;
        }

        return encryptedJson(
          {
            success: false,
            message:
              "Validasyon hatası: " +
              Object.values(validationErrors).join(", "),
            validationErrors,
          },
          { status: 400 }
        );
      }

      throw modelError;
    }
  } catch (error: any) {
    return encryptedJson(
      {
        success: false,
        message: "Etkinlik oluşturulurken bir hata oluştu.",
        error: "Bilinmeyen hata",
      },
      { status: 500 }
    );
  }
}
