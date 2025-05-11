"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Edit,
  Calendar,
  Clock,
  MapPin,
  Link as LinkIcon,
  User,
  Trash2,
  Loader2,
  UserCheck,
  CalendarPlus,
  CalendarClock,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserRole } from "@/models/User";
import { EventStatus, EventType } from "@/models/Event";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import api from "@/lib/api";
import { isEventPast } from "@/lib/eventHelpers";

interface LocationSectionProps {
  eventDays?: EventDay[];
  eventType?: EventType;
  location?: string;
}

interface EventDay {
  date: string;
  startTime: string;
  endTime?: string;
  eventType: EventType;
  location?: string;
  onlineUrl?: string;
}

export default function EventDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  const router = useRouter();
  const { data: session } = useSession();
  const [event, setEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userRole = session?.user?.role;
  const userId = session?.user?.id;

  const isAdmin =
    userRole === UserRole.ADMIN || userRole === UserRole.SUPERADMIN;

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(`/api/events/${slug}`);
        setEvent(response.data.event);
        setIsLoading(false);
      } catch (error: any) {
        setError("Etkinlik bulunamadı");
        setIsLoading(false);
      }
    };

    fetchEvent();
  }, [slug]);

  const isUserRegistered = () => {
    if (!userId || !event?.participants) return false;
    return event.participants.some(
      (participant: any) => participant.userId === userId
    );
  };

  const isUserAuthor = () => {
    return userId && event?.author?.id === userId;
  };

  const handleRegister = async () => {
    if (!session?.user) {
      toast.error("Etkinliğe katılabilmek için giriş yapmalısınız");
      router.push(`/signin?callbackUrl=/events/${slug}`);
      return;
    }

    if (event && isEventPast(event)) {
      toast.error("Bu etkinliğin tarihi geçmiş, katılamazsınız");
      return;
    }

    try {
      setIsRegistering(true);
      const response = await api.post(`/api/events/${slug}/register`);

      if (response.data.success) {
        toast.success("Etkinliğe başarıyla kaydoldunuz");

        const eventResponse = await api.get(`/api/events/${slug}`);
        setEvent(eventResponse.data.event);

      } else {
        toast.error("Kayıt işlemi başarısız");
      }
    } catch (error: any) {
      toast.error("Bir hata oluştu");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleUnregister = async () => {
    try {
      setIsRegistering(true);
      const response = await api.delete(`/api/events/${slug}/register`);

      if (response.data.success) {
        toast.success("Etkinlik kaydınız iptal edildi");

        const eventResponse = await api.get(`/api/events/${slug}`);
        setEvent(eventResponse.data.event);
      } else {
        toast.error("İptal işlemi başarısız");
      }
    } catch (error: any) {
      toast.error("Bir hata oluştu");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleAddToCalendar = () => {
    try {
      if (!event) {
        toast.error("Etkinlik bilgileri eksik, takvim olayı oluşturulamadı");
        return;
      }

      if (isEventPast(event)) {
        toast.error("Bu etkinliğin tarihi geçmiş, takvime ekleyemezsiniz");
        return;
      }

      const firstDay = getFirstEventDay();
      if (!firstDay) {
        toast.error("Etkinlik gün bilgileri eksik, takvim olayı oluşturulamadı");
        return;
      }

      const normalizeDate = (dateStr: string): string => {
        try {
          if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
            return dateStr.split("T")[0];
          }

          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split("T")[0];
          }

          return dateStr;
        } catch (err) {
          return dateStr;
        }
      };

      let dateStr = normalizeDate(firstDay.date);

      const startTime = firstDay.startTime;
      if (!startTime) {
        toast.error("Etkinlik başlangıç saati eksik");
        return;
      }

      let startDateTime;
      try {
        startDateTime = new Date(`${dateStr}T${startTime}:00`);

        if (isNaN(startDateTime.getTime())) {

          const [year, month, day] = dateStr.split(/[-T]/);
          const [hours, minutes] = startTime.split(":");

          if (!year || !month || !day || !hours || !minutes) {
            throw new Error("Invalid date/time components");
          }

          startDateTime = new Date(
            parseInt(year, 10),
            parseInt(month, 10) - 1,
            parseInt(day, 10),
            parseInt(hours, 10),
            parseInt(minutes, 10)
          );

          if (isNaN(startDateTime.getTime())) {
            throw new Error("Method 2 failed to produce a valid date");
          }
        }
      } catch (e) {
        toast.error(
          "Geçersiz başlangıç tarihi veya saati. Lütfen etkinlik bilgilerini kontrol ediniz."
        );
        return;
      }

      if (isNaN(startDateTime.getTime())) {
        toast.error("Geçersiz başlangıç tarihi veya saati");
        return;
      }

      let endDateTime;
      try {
        if (firstDay.endTime) {
          endDateTime = new Date(`${dateStr}T${firstDay.endTime}:00`);

          if (isNaN(endDateTime.getTime())) {
            const [year, month, day] = dateStr.split(/[-T]/);
            const [hours, minutes] = firstDay.endTime.split(":");

            endDateTime = new Date(
              parseInt(year, 10),
              parseInt(month, 10) - 1,
              parseInt(day, 10),
              parseInt(hours, 10),
              parseInt(minutes, 10)
            );
          }
        } else {
          endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000);
        }
      } catch (e) {
        endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000);
      }

      if (isNaN(endDateTime.getTime())) {
        endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000);
      }

      const formatGoogleCalendarDate = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, "").replace(/\.\d+/g, "");
      };

      const startDate = formatGoogleCalendarDate(startDateTime);
      const endDate = formatGoogleCalendarDate(endDateTime);

      let location = "";
      if (
        firstDay.eventType === EventType.IN_PERSON ||
        firstDay.eventType === EventType.HYBRID
      ) {
        location = firstDay.location || event.location || "";
      }

      let details = event.description || "";

      if (firstDay.eventType === EventType.IN_PERSON) {
        details += location ? `\n\nKonum: ${location}` : "\n\nFiziksel Etkinlik";
      } else if (firstDay.eventType === EventType.ONLINE) {
        details += firstDay.onlineUrl
          ? `\n\nÇevrimiçi Bağlantı: ${firstDay.onlineUrl}`
          : "\n\nÇevrimiçi Etkinlik";
      } else if (firstDay.eventType === EventType.HYBRID) {
        if (location) details += `\n\nKonum: ${location}`;
        if (firstDay.onlineUrl)
          details += `\n\nÇevrimiçi Bağlantı: ${firstDay.onlineUrl}`;
        details +=
          "\n\nHibrit Etkinlik (Hem fiziksel hem çevrimiçi katılım mümkündür)";
      }

      const eventUrl = `${window.location.origin}/events/${slug}`;
      details += `\n\nEtkinlik Detayları: ${eventUrl}`;

      const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
        event.title
      )}&dates=${startDate}/${endDate}&details=${encodeURIComponent(
        details
      )}&location=${encodeURIComponent(location)}`;

      window.open(googleCalendarUrl, "_blank");
    } catch (error) {
      toast.error("Takvim olayı oluşturulamadı");
    }
  };

  const handleDeleteEvent = async () => {
    try {
      setIsDeleting(true);
      await api.delete(`/api/events/${slug}`);
      toast.success("Etkinlik başarıyla silindi");
      router.push("/events");
    } catch (error: any) {
      toast.error("Etkinlik silinemedi");
      setIsDeleting(false);
    }
  };

  const isAuthor = userId && event?.author?.id === userId;

  const canEdit = isAdmin || isAuthor;

  const canDelete = isAdmin || isAuthor;

  const registered = isUserRegistered();

  const canRegister = !isAuthor && event?.status === EventStatus.APPROVED;

  const getFirstEventDay = () => {
    if (event?.eventDays && event.eventDays.length > 0) {
      return event.eventDays[0];
    }
    return null;
  };

  const getLastEventDay = () => {
    if (event?.eventDays && event.eventDays.length > 0) {
      return event.eventDays[event.eventDays.length - 1];
    }
    return null;
  };

  const formatDate = (
    dateStr: string | undefined | null,
    formatStr: string
  ) => {
    if (!dateStr) return "Belirtilmemiş";

    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return "Geçersiz tarih";
      }
      return format(date, formatStr, { locale: tr });
    } catch (error) {
      return "Geçersiz tarih";
    }
  };

  const isLinkVisible = () => {
    if (isAdmin || isAuthor) {
      return true;
    }

    const firstDay = getFirstEventDay();
    if (!firstDay) return false;

    try {
      const eventDate = new Date(firstDay.date);
      const now = new Date();

      const timeRemaining = eventDate.getTime() - now.getTime();

      return timeRemaining <= 10800000 && timeRemaining > 0;
    } catch (error) {
      return false;
    }
  };

  const getRemainingTimeText = () => {
    const firstDay = getFirstEventDay();
    if (!firstDay) return "";

    try {
      const eventDate = new Date(firstDay.date);
      const now = new Date();

      const timeRemaining = eventDate.getTime() - now.getTime();

      if (timeRemaining <= 0) {
        return "Etkinlik sona erdi";
      }

      if (timeRemaining > 10800000) {
        return `Link etkinliğe 3 saat kala görünür olacaktır`;
      }

      return "";
    } catch (error) {
      return "";
    }
  };

  const renderEventDateInfo = () => {
    if (!event?.eventDays || event.eventDays.length === 0) {
      if (event?.eventDate) {
        return (
          <>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              <span>{formatDate(event.eventDate, "d MMMM yyyy")}</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              <span>{formatDate(event.eventDate, "HH:mm")}</span>
            </div>
          </>
        );
      }
      return null;
    }

    if (event.eventDays.length === 1) {
      const day = event.eventDays[0];
      return (
        <>
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            <span>{formatDate(day.date, "d MMMM yyyy, EEEE")}</span>
          </div>
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            <span>
              {day.startTime}
              {day.endTime && ` - ${day.endTime}`}
            </span>
          </div>
          <div className="flex items-center mt-1">
            <Badge
              variant="outline"
              className={
                day.eventType === EventType.IN_PERSON
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : day.eventType === EventType.ONLINE
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-purple-50 text-purple-700 border-purple-200"
              }
            >
              {day.eventType === EventType.IN_PERSON
                ? "Fiziksel"
                : day.eventType === EventType.ONLINE
                ? "Online"
                : "Hibrit"}
            </Badge>
          </div>
        </>
      );
    }

    const firstDay = event.eventDays[0];
    const lastDay = event.eventDays[event.eventDays.length - 1];

    return (
      <>
        <div className="flex items-center">
          <Calendar className="h-4 w-4 mr-2" />
          <span>
            {formatDate(firstDay.date, "d MMMM yyyy")} -{" "}
            {formatDate(lastDay.date, "d MMMM yyyy")}
          </span>
        </div>
        <div className="flex items-center">
          <Badge className="mr-2">
            {event.eventDays.length} Günlük Etkinlik
          </Badge>
        </div>
      </>
    );
  };

  const renderEventDays = () => {
    if (!event?.eventDays || event.eventDays.length <= 1) return null;

    return (
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Etkinlik Programı</h3>
        <div className="space-y-4">
          {event.eventDays.map((day: EventDay, index: number) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h4 className="font-medium">
                  {formatDate(day.date, "d MMMM yyyy, EEEE")}
                </h4>

                <Badge
                  variant="outline"
                  className={
                    day.eventType === EventType.IN_PERSON
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : day.eventType === EventType.ONLINE
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-purple-50 text-purple-700 border-purple-200"
                  }
                >
                  {day.eventType === EventType.IN_PERSON
                    ? "Fiziksel"
                    : day.eventType === EventType.ONLINE
                    ? "Online"
                    : "Hibrit"}
                </Badge>
              </div>

              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Saat</p>
                  <p>
                    {day.startTime}
                    {day.endTime && ` - ${day.endTime}`}
                  </p>
                </div>

                {(day.eventType === EventType.IN_PERSON ||
                  day.eventType === EventType.HYBRID) &&
                  day.location && (
                    <div>
                      <p className="text-sm text-muted-foreground">Konum</p>
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 mr-2 mt-1 shrink-0" />
                        <p>{day.location}</p>
                      </div>
                    </div>
                  )}

                {(day.eventType === EventType.ONLINE ||
                  day.eventType === EventType.HYBRID) &&
                  day.onlineUrl && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Online Bağlantı
                      </p>
                      <div className="flex items-start">
                        <LinkIcon className="h-4 w-4 mr-2 mt-1 shrink-0" />
                        {isLinkVisible() ? (
                          <a
                            href={day.onlineUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline break-all inline-flex items-center gap-1"
                          >
                            Katıl
                            <span className="inline-block text-xs bg-primary/10 text-primary px-1 py-0.5 rounded">
                              Online
                            </span>
                          </a>
                        ) : (
                          <p className="text-muted-foreground">
                            {getRemainingTimeText()}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderEventDetails = () => {
    const LocationSection = ({
      eventDays,
      eventType,
      location,
    }: LocationSectionProps) => {
      const hasInPersonOrHybrid =
        (eventDays &&
          eventDays.some(
            (day) =>
              day.eventType === EventType.IN_PERSON ||
              day.eventType === EventType.HYBRID
          )) ||
        eventType === EventType.IN_PERSON ||
        eventType === EventType.HYBRID;

      if (!hasInPersonOrHybrid) {
        return null;
      }

      return (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">
            Konum
          </h3>
          {eventDays && eventDays.length > 0 ? (
            eventDays.length === 1 ? (
              eventDays[0].location ? (
                <div className="flex items-start">
                  <MapPin className="h-4 w-4 mr-2 mt-1 shrink-0" />
                  <p>{eventDays[0].location}</p>
                </div>
              ) : (
                <p>Konum belirtilmemiş</p>
              )
            ) : (
              <div className="space-y-2">
                {eventDays
                  .filter(
                    (day) =>
                      day.eventType === EventType.IN_PERSON ||
                      day.eventType === EventType.HYBRID
                  )
                  .map((day, index) => (
                    <div key={index} className="flex items-start">
                      <div className="flex items-center mr-2">
                        <MapPin className="h-4 w-4 mr-1 shrink-0" />
                        <span className="text-xs text-muted-foreground">
                          {formatDate(day.date, "d MMM")}:
                        </span>
                      </div>
                      <p>{day.location || "Konum belirtilmemiş"}</p>
                    </div>
                  ))}
              </div>
            )
          ) : location ? (
            <div className="flex items-start">
              <MapPin className="h-4 w-4 mr-2 mt-1 shrink-0" />
              <p>{location}</p>
            </div>
          ) : (
            <p>Konum belirtilmemiş</p>
          )}
        </div>
      );
    };

    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Etkinlik Bilgileri</h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              Etkinlik Organizatörü
            </h3>
            <Link
              href={`/users/${event.author?.slug}`} className="flex items-center"
            >
              <User className="h-4 w-4 mr-2" />
              <p>
                {event.author
                  ? `${event.author.name} ${event.author.lastname}`
                  : "Belirtilmemiş"}
              </p>
            </Link>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              Etkinlik Tipi
            </h3>
            {event.eventDays && event.eventDays.length > 0 ? (
              event.eventDays.length === 1 ? (
                <Badge
                  variant="outline"
                  className={
                    event.eventDays[0].eventType === EventType.IN_PERSON
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : event.eventDays[0].eventType === EventType.ONLINE
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-purple-50 text-purple-700 border-purple-200"
                  }
                >
                  {event.eventDays[0].eventType === EventType.IN_PERSON
                    ? "Fiziksel"
                    : event.eventDays[0].eventType === EventType.ONLINE
                    ? "Online"
                    : "Hibrit"}
                </Badge>
              ) : (
                <div className="space-y-1">
                  {event.eventDays.map((day: EventDay, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(day.date, "d MMM")}:
                      </span>
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{
                          backgroundColor:
                            day.eventType === EventType.IN_PERSON
                              ? "rgba(59, 130, 246, 0.1)"
                              : day.eventType === EventType.ONLINE
                              ? "rgba(34, 197, 94, 0.1)"
                              : "rgba(168, 85, 247, 0.1)",
                          color:
                            day.eventType === EventType.IN_PERSON
                              ? "rgb(29, 78, 216)"
                              : day.eventType === EventType.ONLINE
                              ? "rgb(21, 128, 61)"
                              : "rgb(126, 34, 206)",
                          borderColor:
                            day.eventType === EventType.IN_PERSON
                              ? "rgb(147, 197, 253)"
                              : day.eventType === EventType.ONLINE
                              ? "rgb(134, 239, 172)"
                              : "rgb(216, 180, 254)",
                        }}
                      >
                        {day.eventType === EventType.IN_PERSON
                          ? "Fiziksel"
                          : day.eventType === EventType.ONLINE
                          ? "Online"
                          : "Hibrit"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )
            ) : event.eventType ? (
              <Badge
                variant="outline"
                className={
                  event.eventType === EventType.IN_PERSON
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : event.eventType === EventType.ONLINE
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-purple-50 text-purple-700 border-purple-200"
                }
              >
                {event.eventType === EventType.IN_PERSON
                  ? "Fiziksel"
                  : event.eventType === EventType.ONLINE
                  ? "Online"
                  : "Hibrit"}
              </Badge>
            ) : (
              <p>Belirtilmemiş</p>
            )}
          </div>

          {event.eventDays && event.eventDays.length > 1 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Etkinlik Süresi
              </h3>
              <p>{event.eventDays.length} günlük etkinlik</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              Tarih ve Saat
            </h3>
            {event.eventDays && event.eventDays.length > 0 ? (
              <div className="space-y-2">
                {event.eventDays.map((day: EventDay, index: number) => (
                  <div key={index} className="border-l-2 border-primary pl-3">
                    <p className="font-medium">
                      {formatDate(day.date, "d MMMM yyyy, EEEE")}
                    </p>
                    <p>
                      {day.startTime}
                      {day.endTime && ` - ${day.endTime}`}
                    </p>
                  </div>
                ))}
              </div>
            ) : event.eventDate ? (
              <div>
                <p className="font-medium">
                  {formatDate(event.eventDate, "d MMMM yyyy, EEEE")}
                </p>
                <p>{formatDate(event.eventDate, "HH:mm")}</p>
              </div>
            ) : (
              <p>Belirtilmemiş</p>
            )}
          </div>

          <LocationSection
            eventDays={event.eventDays}
            eventType={event.eventType}
            location={event.location}
          />

          {event.eventDays?.some(
            (day: EventDay) =>
              day.eventType === EventType.ONLINE ||
              day.eventType === EventType.HYBRID
          ) ||
          event.eventType === EventType.ONLINE ||
          event.eventType === EventType.HYBRID ? (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Online Bağlantı
              </h3>

              {event.eventDays && event.eventDays.length > 0 ? (
                event.eventDays.length === 1 ? (
                  event.eventDays[0].onlineUrl ? (
                    <div className="flex items-start">
                      <LinkIcon className="h-4 w-4 mr-2 mt-1 shrink-0" />
                      {isLinkVisible() ? (
                        <a
                          href={event.eventDays[0].onlineUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline break-all inline-flex items-center gap-1"
                        >
                          Katıl
                          <span className="inline-block text-xs bg-primary/10 text-primary px-1 py-0.5 rounded">
                            Online
                          </span>
                        </a>
                      ) : (
                        <p className="text-muted-foreground">
                          {getRemainingTimeText()}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p>Bağlantı belirtilmemiş</p>
                  )
                ) : (
                  <div className="space-y-2">
                    {(event.eventDays as EventDay[])
                      .filter(
                        (day: EventDay): boolean =>
                          day.eventType === EventType.ONLINE ||
                          day.eventType === EventType.HYBRID
                      )
                      .map((day: EventDay, index: number) => (
                        <div key={index} className="flex items-start">
                          <div className="flex items-center mr-2">
                            <LinkIcon className="h-4 w-4 mr-1 shrink-0" />
                            <span className="text-xs text-muted-foreground">
                              {formatDate(day.date, "d MMM")}:
                            </span>
                          </div>
                          {day.onlineUrl ? (
                            isLinkVisible() ? (
                              <a
                                href={day.onlineUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline break-all inline-flex items-center gap-1"
                              >
                                Katıl
                                <span className="inline-block text-xs bg-primary/10 text-primary px-1 py-0.5 rounded">
                                  Online
                                </span>
                              </a>
                            ) : (
                              <p className="text-muted-foreground">
                                {getRemainingTimeText()}
                              </p>
                            )
                          ) : (
                            <span>Bağlantı belirtilmemiş</span>
                          )}
                        </div>
                      ))}
                  </div>
                )
              ) : event.onlineUrl ? (
                <div className="flex items-start">
                  <LinkIcon className="h-4 w-4 mr-2 mt-1 shrink-0" />
                  {isLinkVisible() ? (
                    <a
                      href={event.onlineUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline break-all inline-flex items-center gap-1"
                    >
                      Katıl
                      <span className="inline-block text-xs bg-primary/10 text-primary px-1 py-0.5 rounded">
                        Online
                      </span>
                    </a>
                  ) : (
                    <p className="text-muted-foreground">
                      {getRemainingTimeText()}
                    </p>
                  )}
                </div>
              ) : (
                <p>Bağlantı belirtilmemiş</p>
              )}
            </div>
          ) : null}
        </div>
      </Card>
    );
  };

  const renderParticipants = () => {
    if (!event || !event.participants) return null;

    const count = event.participantCount || event.participants.length;
    if (count === 0) return null;

    return (
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-2">Katılımcılar ({count})</h3>
        <Badge variant="outline" className="text-sm py-1 px-2">
          <UserCheck className="h-4 w-4 mr-1" />
          {count} kişi katılıyor
        </Badge>

        {isAdmin && (
          <div className="mt-4 p-4 bg-muted rounded-md">
            <h4 className="text-sm font-medium mb-2">
              Katılımcı Listesi (Admin)
            </h4>
            <div className="space-y-2">
              {event.participants.map((participant: any, index: number) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" />
                  <span>
                    {participant.name} {participant.lastname} (
                    {participant.email})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const EventDetailSkeleton = () => {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <Skeleton className="h-10 w-32 bg-primary/10" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24 bg-primary/10" />
          </div>
        </div>

        <div className="mb-6">
          <Skeleton className="h-9 w-3/4 mb-2 bg-primary/10" />
          <div className="flex flex-wrap items-center gap-4">
            <Skeleton className="h-5 w-40 bg-primary/10" />
            <Skeleton className="h-5 w-32 bg-primary/10" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <Skeleton className="h-[400px] w-full mb-6 bg-primary/10 rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-6 w-full bg-primary/10" />
              <Skeleton className="h-6 w-5/6 bg-primary/10" />
              <Skeleton className="h-6 w-full bg-primary/10" />
              <Skeleton className="h-6 w-4/6 bg-primary/10" />
            </div>

            <div className="mt-8">
              <Skeleton className="h-7 w-48 mb-4 bg-primary/10" />
              <div className="space-y-4">
                <div>
                  <Skeleton className="h-[120px] w-full bg-primary/10 rounded-lg" />
                </div>
                <div>
                  <Skeleton className="h-[120px] w-full bg-primary/10 rounded-lg" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <Card className="p-6">
              <Skeleton className="h-7 w-40 mb-4 bg-primary/10" />
              <div className="space-y-4">
                <div>
                  <Skeleton className="h-5 w-32 mb-1 bg-primary/10" />
                  <Skeleton className="h-6 w-48 bg-primary/10" />
                </div>
                <div>
                  <Skeleton className="h-5 w-32 mb-1 bg-primary/10" />
                  <Skeleton className="h-6 w-24 bg-primary/10" />
                </div>
                <div>
                  <Skeleton className="h-5 w-32 mb-1 bg-primary/10" />
                  <Skeleton className="h-6 w-full bg-primary/10" />
                </div>
                <div>
                  <Skeleton className="h-5 w-32 mb-1 bg-primary/10" />
                  <Skeleton className="h-6 w-full bg-primary/10" />
                </div>
              </div>
            </Card>

            <Card className="p-6 mt-6">
              <Skeleton className="h-7 w-40 mb-4 bg-primary/10" />
              <div className="space-y-3">
                <Skeleton className="h-10 w-full bg-primary/10" />
                <Skeleton className="h-10 w-full bg-primary/10" />
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <EventDetailSkeleton />;
  }

  if (error || !event) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <h1 className="text-2xl font-bold mb-6">Etkinlik Bulunamadı</h1>
        <p className="mb-6">
          Bu etkinlik mevcut değil veya yüklenirken bir hata oluştu.
        </p>
        <Button asChild>
          <Link href="/events">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Etkinlikler Sayfasına Dön
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <Button variant="outline" asChild>
          <Link href="/events">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Etkinlikler
          </Link>
        </Button>

        <div className="flex gap-2">
          {canEdit && (
            <Button asChild variant="outline">
              <Link href={`/events/${slug}/edit`} className="flex items-center">
                <Edit className="mr-2 h-4 w-4" />
                Düzenle
              </Link>
            </Button>
          )}

          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Sil
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Etkinliği Sil</AlertDialogTitle>
                  <AlertDialogDescription>
                    Bu etkinliği silmek istediğinizden emin misiniz? Bu işlem
                    geri alınamaz.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>
                    İptal
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteEvent}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Siliniyor...
                      </>
                    ) : (
                      "Etkinliği Sil"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{event.title}</h1>

        {(isAdmin || isAuthor) &&
          event.status === EventStatus.REJECTED &&
          event.rejectionReason && (
            <div className="mt-6 mb-6 p-4 border border-red-200 bg-red-50 rounded-lg">
              <h3 className="text-lg font-medium text-red-800 mb-2">
                Reddedilme Nedeni
              </h3>
              <p className="text-red-600">{event.rejectionReason}</p>
            </div>
          )}

        {(isAdmin || isAuthor) && event.status !== EventStatus.APPROVED && (
          <Badge
            variant={
              event.status === EventStatus.PENDING_APPROVAL
                ? "warning"
                : event.status === EventStatus.REJECTED
                ? "destructive"
                : "outline"
            }
            className="mb-3"
          >
            {event.status === EventStatus.PENDING_APPROVAL
              ? "Onay Bekliyor"
              : event.status === EventStatus.REJECTED
              ? "Reddedildi"
              : event.status}
          </Badge>
        )}

        <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
          {renderEventDateInfo()}
          {event.author && (
            <Link
              href={`/u/${event.author.slug}`}
              className="flex items-center">
              <User className="h-4 w-4 mr-2" />
              <span>
                {event.author.name} {event.author.lastname}
              </span>
              </Link>
          )}
        </div>
        {event.participants &&
          event.participants.length > 0 &&
          (isAdmin || isAuthor) && (
            <div className="mb-6">
              <Badge variant="outline" className="text-sm py-1 px-2">
                <UserCheck className="h-4 w-4 mr-1" />
                {event.participants.length} kişi katılıyor
              </Badge>
            </div>
          )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <div className="relative w-full rounded-lg overflow-hidden mb-6">
            <div className="max-h-[400px] relative">
              <Image
                src={event.coverImage || "/images/placeholder-event.jpg"}
                alt={event.title}
                width={1200}
                height={675}
                className="object-contain w-full h-auto max-h-[400px]"
                priority
              />
            </div>
          </div>

          <div className="prose max-w-none">
            <p className="whitespace-pre-line">{event.description}</p>
          </div>

          {renderEventDays()}

          
        </div>

        <div>
          {renderEventDetails()}

          {!isLoading &&
            !error &&
            event &&
            !isUserAuthor() &&
            event?.status === EventStatus.APPROVED && (
              <Card className="p-6 mt-6">
                <h3 className="text-lg font-semibold mb-4">Etkinlik Katılımı</h3>
                <div className="space-y-3 w-full">
                  {!isEventPast(event) ? (
                    <Button
                      className="w-full justify-start"
                      onClick={isUserRegistered() ? handleUnregister : handleRegister}
                      disabled={isRegistering}
                    >
                      {isRegistering ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : isUserRegistered() ? (
                        <UserCheck className="mr-2 h-4 w-4" />
                      ) : (
                        <CalendarPlus className="mr-2 h-4 w-4" />
                      )}
                      {isUserRegistered() ? "Kaydı İptal Et" : "Etkinliğe Katıl"}
                    </Button>
                  ) : (
                    <Button
                      className="w-full justify-start" 
                      variant="outline" 
                      disabled
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Etkinlik tarihi geçmiş
                    </Button>
                  )}

                  {!isEventPast(event) && (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={handleAddToCalendar}
                    >
                      <CalendarClock className="mr-2 h-4 w-4" />
                      Takvime Ekle
                    </Button>
                  )}
                </div>
                {isUserRegistered() && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Etkinliğe kaydolduğunuz için teşekkürler!
                  </p>
                )}
              </Card>
            )}
        </div>
      </div>

      {renderParticipants()}
    </div>
  );
}
