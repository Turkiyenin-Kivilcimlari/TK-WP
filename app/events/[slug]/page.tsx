import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { eventSlugExists, getApprovedEventBySlug } from '@/lib/data/events';
import { EventType } from '@/models/Event';
import EventDetailClient from './EventDetailClient';

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://turkiyeninkivilcimlari.com';

export const revalidate = 3600;

// Build'de yol üretilmez; tüm slug'lar ilk istekte render edilip ISR
// önbelleğine alınır. Bu export olmadan Next rotayı her istekte dinamik
// render ediyor, revalidate devre dışı kalıyor ve notFound() akış
// başladığı için 404 durum kodu döndüremiyordu.
export function generateStaticParams() {
  return [];
}

interface Props {
  params: { slug: string };
}

function plainDescription(event: any): string | undefined {
  const plain = (event.description || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!plain) return undefined;
  return plain.length > 160 ? `${plain.slice(0, 157)}...` : plain;
}

// "2026-08-01T00:00:00.000Z" + "19:30" → "2026-08-01T19:30:00" (yerel saat,
// schema.org tarih-saat biçimi; saat bilinmiyorsa yalnızca tarih döner).
function combineDateTime(date?: string, time?: string): string | undefined {
  if (!date) return undefined;
  const day = date.slice(0, 10);
  return time ? `${day}T${time}:00` : day;
}

function attendanceMode(eventType: string): string {
  switch (eventType) {
    case EventType.ONLINE:
      return 'https://schema.org/OnlineEventAttendanceMode';
    case EventType.HYBRID:
      return 'https://schema.org/MixedEventAttendanceMode';
    default:
      return 'https://schema.org/OfflineEventAttendanceMode';
  }
}

function eventLocation(event: any): any {
  const days: any[] = event.eventDays || [];
  const physical = days.find((d) => d.location)?.location;
  const online = days.find((d) => d.onlineUrl)?.onlineUrl;

  const locations = [];
  if (physical) {
    locations.push({
      '@type': 'Place',
      name: physical,
      address: physical,
    });
  }
  if (online) {
    locations.push({
      '@type': 'VirtualLocation',
      url: online,
    });
  }

  if (locations.length === 0) return undefined;
  return locations.length === 1 ? locations[0] : locations;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await getApprovedEventBySlug(params.slug);

  if (!event) {
    // notFound() burada (generateMetadata'da) çağrılmalı: sayfa gövdesinde
    // çağrılırsa streaming başladığı için durum kodu 200 olarak gitmiş oluyor.
    if (!(await eventSlugExists(params.slug))) {
      notFound();
    }
    return { robots: { index: false, follow: false } };
  }

  const description = plainDescription(event);
  const url = `/events/${event.slug}`;

  return {
    title: event.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title: event.title,
      description,
      images: event.coverImage ? [event.coverImage] : undefined,
    },
    twitter: {
      card: event.coverImage ? 'summary_large_image' : 'summary',
      title: event.title,
      description,
    },
  };
}

export default async function EventDetailPage({ params }: Props) {
  const event = await getApprovedEventBySlug(params.slug);

  // Hiç var olmayan slug'lar gerçek 404 döner; onaylı olmayan ama var olan
  // etkinlikler (taslak/onay bekleyen) istemcide oturum yetkisiyle açılabilsin
  // diye 404'e düşürülmez.
  if (!event && !(await eventSlugExists(params.slug))) {
    notFound();
  }

  const days: any[] = event?.eventDays || [];
  const firstDay = days[0];
  const lastDay = days[days.length - 1];

  const jsonLd = event
    ? {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: event.title,
        description: plainDescription(event),
        image: event.coverImage || undefined,
        startDate: combineDateTime(firstDay?.date, firstDay?.startTime),
        endDate: combineDateTime(lastDay?.date, lastDay?.endTime || lastDay?.startTime),
        eventAttendanceMode: attendanceMode(event.eventType),
        eventStatus: 'https://schema.org/EventScheduled',
        location: eventLocation(event),
        url: `${BASE}/events/${event.slug}`,
        organizer: {
          '@type': 'Organization',
          name: "Türkiye'nin Kıvılcımları",
          url: BASE,
        },
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <EventDetailClient slug={params.slug} initialEvent={event} />
    </>
  );
}
