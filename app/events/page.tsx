import type { Metadata } from 'next';
import { getApprovedEvents } from '@/lib/data/events';
import EventsClient from './EventsClient';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Etkinlikler',
  description:
    "Türkiye'nin Kıvılcımları topluluğunun yaklaşan buluşma, atölye ve " +
    'etkinliklerini keşfedin, katılın.',
  alternates: { canonical: '/events' },
};

// İstemcideki varsayılan sekme "yaklaşan etkinlikler" olduğundan SSR verisi de
// aynı kümeyi içermeli; son etkinlik günü dünden eski olanlar elenir.
function isUpcoming(event: any): boolean {
  const days: any[] = event.eventDays || [];
  if (days.length === 0) return true;

  const lastDay = days[days.length - 1]?.date;
  if (!lastDay) return true;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return new Date(lastDay) >= yesterday;
}

export default async function EventsPage() {
  const events = await getApprovedEvents();
  const initialEvents = events.filter(isUpcoming);

  return <EventsClient initialEvents={initialEvents} />;
}
