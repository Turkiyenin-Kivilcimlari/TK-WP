import { cache } from 'react';
import { connectToDatabase } from '@/lib/mongodb';
import EventModel, { EventStatus } from '@/models/Event';

// Katılımcı listesi kişisel veri içerdiği için (isim + e-posta) SSR
// yanıtına asla dahil edilmez; istemci sayısı participantCount'tan okur.
function serializeEvent(doc: any): any {
  const event = JSON.parse(JSON.stringify(doc));

  event.id = event._id;
  delete event._id;
  delete event.participants;

  if (event.author && event.author._id) {
    event.author.id = event.author._id;
    delete event.author._id;
  }

  return event;
}

/**
 * Onaylanmış bir etkinliği slug ile getirir; bulunamazsa null döner.
 */
export const getApprovedEventBySlug = cache(async (slug: string) => {
  if (!slug) return null;

  try {
    await connectToDatabase();

    const event = await EventModel.findOne({
      slug,
      status: EventStatus.APPROVED,
    })
      .select('-participants')
      .populate('author', 'name lastname avatar slug')
      .lean();

    return event ? serializeEvent(event) : null;
  } catch {
    return null;
  }
});

/**
 * Onaylanmış etkinlikleri listeler (liste sayfası SSR'ı için).
 */
export const getApprovedEvents = cache(async (limit = 50) => {
  try {
    await connectToDatabase();

    const events = await EventModel.find({ status: EventStatus.APPROVED })
      .select('-participants')
      .populate('author', 'name lastname avatar slug')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return events.map(serializeEvent);
  } catch {
    return [];
  }
});

/**
 * Sitemap için onaylanmış etkinliklerin slug ve tarih bilgileri.
 */
export const getApprovedEventSlugs = cache(async () => {
  try {
    await connectToDatabase();

    const events = await EventModel.find({ status: EventStatus.APPROVED })
      .select('slug updatedAt')
      .lean();

    return events
      .filter((e: any) => e.slug)
      .map((e: any) => ({
        slug: e.slug as string,
        updatedAt: (e.updatedAt || new Date()) as Date,
      }));
  } catch {
    return [];
  }
});
