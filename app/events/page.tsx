"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useEvents } from "@/hooks/useEvents";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  MapPin,
  Link as LinkIcon,
  User,
  Plus,
  Search,
  Loader2,
  Filter,
  Trash2,
  CalendarPlus,
  UserCheck,
} from "lucide-react";
import { UserRole } from "@/models/User";
import { EventType, EventStatus } from "@/models/Event";
import { Badge } from "@/components/ui/badge";
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

interface EventDay {
  date: string;
  startTime: string;
  endTime?: string;
  eventType: EventType;
  location?: string;
  onlineUrl?: string;
}

interface EventCardProps {
  id: string;
  title: string;
  slug: string;
  description: string;
  eventDate?: string | Date;
  eventDays: EventDay[];
  coverImage?: string;
  status?: string;
  eventType: EventType;
  location?: string;
  onlineUrl?: string;
  author?: {
    id: string;
    name: string;
    lastname: string;
    email?: string;
    avatar?: string;
  };
  organizer?: {
    id: string;
    name: string;
    lastname: string;
    avatar?: string;
  };
  participants?: {
    userId: string;
    name: string;
    lastname: string;
    email: string;
  }[];
  participantCount?: number;
}

export default function EventsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [tab, setTab] = useState("upcoming");
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [registering, setRegistering] = useState<Record<string, boolean>>({});

  const userRole = session?.user?.role;
  const isAdmin =
    userRole === UserRole.ADMIN || userRole === UserRole.SUPERADMIN;
  const canCreateEvent =
    userRole === UserRole.ADMIN ||
    userRole === UserRole.SUPERADMIN ||
    userRole === UserRole.REPRESENTATIVE;

  const isUserAuthor = (event: EventCardProps) => {
    if (!session?.user?.id) return false;
    const currentUserId = session.user.id;
    const isAuthor = event.author?.id === currentUserId;
    const isOrganizer = event.organizer?.id === currentUserId;
    return isAuthor || isOrganizer;
  };

  const isRegistered = (event: EventCardProps) => {
    if (!session?.user?.id || !event.participants) return false;
    return event.participants.some((p) => p.userId === session.user.id);
  };

  const {
    data: eventsData,
    isLoading,
    isError,
    refetch,
  } = useEvents({
    upcoming: tab === "upcoming",
    past: tab === "past",
    my: tab === "my",
    status:
      tab === "my"
        ? undefined
        : statusFilter !== "all"
        ? statusFilter
        : undefined,
    eventType: typeFilter !== "all" ? typeFilter : undefined,
    search: searchTerm,
  });

  const events = eventsData?.events || [];

  const getFirstEventDay = (event: EventCardProps) => {
    if (event.eventDays && event.eventDays.length > 0) {
      return event.eventDays[0];
    }
    if (event.eventDate) {
      return {
        date: new Date(event.eventDate).toISOString(),
        startTime: format(new Date(event.eventDate), "HH:mm"),
        eventType: event.eventType,
        location: event.location,
        onlineUrl: event.onlineUrl,
      };
    }
    return null;
  };

  const renderEventDateInfo = (event: EventCardProps) => {
    if (!event.eventDays || event.eventDays.length === 0) {
      if (event.eventDate) {
        return (
          <div className="flex items-center text-xs text-muted-foreground gap-1 mb-2">
            <Calendar className="h-3 w-3" />
            <span>{formatEventDate(event.eventDate, "d MMM yyyy")}</span>
            <span>•</span>
            <Clock className="h-3 w-3" />
            <span>{formatEventDate(event.eventDate, "HH:mm")}</span>
          </div>
        );
      }
      return null;
    }

    if (event.eventDays.length === 1) {
      const day = event.eventDays[0];

      return (
        <div className="flex items-center text-xs text-muted-foreground gap-1 mb-2">
          <Calendar className="h-3 w-3" />
          <span>{formatEventDate(day.date, "d MMM yyyy")}</span>
          <span>•</span>
          <Clock className="h-3 w-3" />
          <span>
            {day.startTime}
            {day.endTime && ` - ${day.endTime}`}
          </span>
        </div>
      );
    }

    const firstDay = event.eventDays[0];
    const lastDay = event.eventDays[event.eventDays.length - 1];

    return (
      <div className="flex items-center text-xs text-muted-foreground gap-1 mb-2">
        <Calendar className="h-3 w-3" />
        <span>
          {formatEventDate(firstDay.date, "d MMM")} -{" "}
          {formatEventDate(lastDay.date, "d MMM yyyy")}
        </span>
        <span>•</span>
        <Badge variant="outline" className="text-xs py-0 px-1 h-4">
          {event.eventDays.length} gün
        </Badge>
      </div>
    );
  };

  const renderEventLocation = (event: EventCardProps) => {
    const firstDay = getFirstEventDay(event);

    if (!firstDay) return null;

    const eventTypeStr = String(firstDay.eventType || "").toUpperCase();

    if (
      eventTypeStr.includes("IN_PERSON") ||
      eventTypeStr.includes("HYBRID") ||
      firstDay.location
    ) {
      return (
        <div className="flex items-start text-xs">
          <MapPin className="h-3 w-3 mr-1 mt-0.5 shrink-0" />
          <span className="line-clamp-1">
            {firstDay.location || event.location}
          </span>
        </div>
      );
    }
    return null;
  };

  const formatEventDate = (dateString: string | Date, formatString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Geçersiz tarih";
      }
      return format(date, formatString, { locale: tr });
    } catch (error) {
      return "Geçersiz tarih";
    }
  };

  const renderOnlineLink = (event: EventCardProps) => {
    const firstDay = getFirstEventDay(event);

    if (!firstDay) return null;

    const eventTypeStr = String(firstDay.eventType || "").toUpperCase();

    if (
      (eventTypeStr.includes("ONLINE") || eventTypeStr.includes("HYBRID")) &&
      (firstDay.onlineUrl || event.onlineUrl) &&
      !isEventPast(event)
    ) {
      return (
        <div className="flex items-start text-xs">
          <LinkIcon className="h-3 w-3 mr-1 mt-0.5 shrink-0" />
          <span className="line-clamp-1 text-primary">
            <a
              href={firstDay.onlineUrl || event.onlineUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Online Bağlantı
            </a>
          </span>
        </div>
      );
    }
    return null;
  };

  const getEventType = (event: EventCardProps): string => {
    const safeEventType = String(event.eventType || "");

    if (event.eventDays && event.eventDays.length > 0) {
      if (event.eventDays.length > 1) {
        const typeSet = new Set(
          event.eventDays.map((day) => String(day.eventType || ""))
        );

        if (
          typeSet.has("HYBRID") ||
          (typeSet.has("IN_PERSON") && typeSet.has("ONLINE"))
        ) {
          return "HYBRID";
        }

        if (typeSet.has("IN_PERSON") && !typeSet.has("ONLINE")) {
          return "IN_PERSON";
        }

        if (typeSet.has("ONLINE") && !typeSet.has("IN_PERSON")) {
          return "ONLINE";
        }
      }
      return safeEventType;
    }
    return safeEventType;
  };

  const renderEventTypeInfo = (event: EventCardProps) => {
    const eventTypeStr = getEventType(event).toUpperCase();

    let label = "Fiziksel";
    let badgeClass = "bg-blue-50 text-blue-700 border-blue-200";

    if (eventTypeStr.includes("ONLINE")) {
      label = "Online";
      badgeClass = "bg-green-50 text-green-700 border-green-200";
    } else if (eventTypeStr.includes("HYBRID")) {
      label = "Hibrit";
      badgeClass = "bg-purple-50 text-purple-700 border-purple-200";
    }

    const hasMixedTypes =
      event.eventDays &&
      event.eventDays.length > 1 &&
      new Set(event.eventDays.map((day) => String(day.eventType || ""))).size >
        1;

    return (
      <div className="mt-1">
        <Badge variant="outline" className={`text-xs ${badgeClass}`}>
          {label}
        </Badge>
        {hasMixedTypes && (
          <div className="text-xs text-muted-foreground mt-1">
            * Günlere göre değişiklik gösterir
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      refetch();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, refetch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    refetch();
  };

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;

    setIsDeleting(true);

    try {
      const response = await api.delete(`/events/${eventToDelete}`);

      if (response.data.success) {
        toast.success("Etkinlik başarıyla silindi", {
          description: "Etkinlik listesi güncellendi.",
        });

        await refetch();
      } else {
        toast.error("Etkinlik silinemedi");
      }
    } catch (error: any) {
      toast.error("Etkinlik silinemedi");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setEventToDelete(null);
    }
  };

  const handleRegister = async (event: EventCardProps, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session?.user) {
      toast.error("Etkinliğe katılabilmek için giriş yapmalısınız");
      router.push(`/signin?callbackUrl=/events/${event.slug}`);
      return;
    }

    if (isEventPast(event)) {
      toast.error("Bu etkinliğin tarihi geçmiş, katılamazsınız");
      return;
    }

    try {
      setRegistering((prev) => ({ ...prev, [event.id]: true }));

      if (!event.slug) {
        toast.error("Etkinlik bilgileri eksik, kayıt yapılamadı");
        return;
      }

      if (!event.eventDays || event.eventDays.length === 0) {
        toast.error("Etkinlik gün bilgileri eksik, kayıt yapılamadı");
        console.error("Missing event days in event:", event.id, event.title);
        return;
      }

      console.log("Event registration details:", {
        slug: event.slug,
        title: event.title,
        eventDays: event.eventDays,
      });

      const response = await api.post(`/api/events/${event.slug}/register`);

      if (response.data.success) {
        toast.success("Etkinliğe başarıyla kaydoldunuz");
        await refetch();
      } else {
        toast.error(response.data.message || "Kayıt işlemi başarısız");
      }
    } catch (error: any) {
      console.error("Registration error:", error);

      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);

        try {
          const fallbackResponse = await api.post(
            `/api/events/${event.slug}/register`,
            {}
          );

          if (fallbackResponse.data.success) {
            toast.success("Etkinliğe başarıyla kaydoldunuz");
            await refetch();
            return;
          }
        } catch (fallbackError) {
          console.error("Fallback registration failed:", fallbackError);
          toast.error(
            "Etkinliğe kayıt yapılamadı. Lütfen daha sonra tekrar deneyin."
          );
        }
      } else {
        toast.error("Bir hata oluştu, lütfen daha sonra tekrar deneyin");
      }
    } finally {
      setRegistering((prev) => ({ ...prev, [event.id]: false }));
    }
  };

  const handleUnregister = async (
    event: EventCardProps,
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      setRegistering((prev) => ({ ...prev, [event.id]: true }));

      if (!event.slug) {
        toast.error("Etkinlik bilgileri eksik, kayıt iptali yapılamadı");
        return;
      }

      const response = await api.delete(`/api/events/${event.slug}/register`);

      if (response.data.success) {
        toast.success("Etkinlik kaydınız iptal edildi");
        await refetch();
      } else {
        toast.error(response.data.message || "İptal işlemi başarısız");
      }
    } catch (error: any) {
      console.error("Unregistration error:", error);

      if (error.response) {
        if (error.response.status === 400) {
          toast.error(
            error.response?.data?.message || "Bu etkinliğe kayıtlı değilsiniz"
          );
        } else {
          toast.error(
            error.response?.data?.message || "İptal işlemi başarısız"
          );
        }
      } else if (error.request) {
        toast.error(
          "Sunucudan yanıt alınamadı, lütfen internetinizi kontrol edin"
        );
      } else {
        toast.error("Bir hata oluştu, lütfen daha sonra tekrar deneyin");
      }
    } finally {
      setRegistering((prev) => ({ ...prev, [event.id]: false }));
    }
  };

  const addToGoogleCalendarSafe = (event: EventCardProps) => {
    try {
      if (isEventPast(event)) {
        toast.error("Bu etkinliğin tarihi geçmiş, takvime ekleyemezsiniz");
        return;
      }

      const firstDay = getFirstEventDay(event);
      if (!firstDay) {
        console.error("Missing event day information");
        return;
      }

      const normalizeDate = (dateStr: string): string => {
        try {
          if (dateStr.includes("T")) {
            return dateStr.split("T")[0];
          }

          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return dateStr;
          }

          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split("T")[0];
          }

          return dateStr;
        } catch (err) {
          console.error("Date normalization error:", err);
          return dateStr;
        }
      };

      const normalizeTime = (timeStr: string): string => {
        if (/^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/.test(timeStr)) {
          const [hours, minutes] = timeStr.split(":");
          return `${hours.padStart(2, "0")}:${minutes}`;
        }
        return timeStr;
      };

      let dateStr = normalizeDate(firstDay.date);
      const startTime = normalizeTime(firstDay.startTime);

      if (!dateStr || !startTime) {
        console.error("Missing date or start time");
        toast.error("Etkinlik tarih veya saat bilgisi eksik");
        return;
      }

      let startDateTime;
      try {
        startDateTime = new Date(`${dateStr}T${startTime}:00`);

        if (isNaN(startDateTime.getTime())) {
          const [year, month, day] = dateStr.split(/[-\/]/);
          const [hours, minutes] = startTime.split(":");

          if (!year || !month || !day) {
            console.error("Invalid date components:", { dateStr });
            throw new Error("Invalid date format");
          }

          if (!hours || !minutes) {
            console.error("Invalid time components:", { startTime });
            throw new Error("Invalid time format");
          }

          startDateTime = new Date(
            parseInt(year, 10),
            parseInt(month, 10) - 1,
            parseInt(day, 10),
            parseInt(hours, 10),
            parseInt(minutes, 10)
          );

          if (isNaN(startDateTime.getTime())) {
            throw new Error("Approach 2 failed to create valid date");
          }
        }
      } catch (e) {
        console.error("Date parsing failed for start time:", e, {
          dateStr,
          startTime,
        });
        toast.error("Geçersiz tarih veya saat formatı");
        return;
      }

      if (isNaN(startDateTime.getTime())) {
        console.error("Invalid start date/time after all attempts:", {
          dateStr,
          startTime,
        });
        toast.error("Geçersiz başlangıç tarihi veya saati");
        return;
      }

      let endDateTime;
      const endTime = firstDay.endTime ? normalizeTime(firstDay.endTime) : null;

      try {
        if (endTime) {
          endDateTime = new Date(`${dateStr}T${endTime}:00`);

          if (isNaN(endDateTime.getTime())) {
            const [year, month, day] = dateStr.split(/[-\/]/);
            const [hours, minutes] = endTime.split(":");

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
        console.warn("End time parsing failed, using default:", e);
        endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000);
      }

      if (isNaN(endDateTime.getTime())) {
        console.warn("Invalid end date/time, using default");
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
        details += location
          ? `\n\nKonum: ${location}`
          : "\n\nFiziksel Etkinlik";
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

      const eventUrl = `${window.location.origin}/events/${event.slug}`;
      details += `\n\nEtkinlik Detayları: ${eventUrl}`;

      const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
        event.title
      )}&dates=${startDate}/${endDate}&details=${encodeURIComponent(
        details
      )}&location=${encodeURIComponent(location)}`;

      window.open(googleCalendarUrl, "_blank");
    } catch (error) {
      console.error("Google Calendar error:", error);
      toast.error("Takvime eklenirken bir hata oluştu");
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Etkinlikler</h1>
          <p className="text-muted-foreground mt-1">
            Topluluğumuzun etkinliklerini keşfedin ve katılın
          </p>
        </div>

        {canCreateEvent && (
          <Button asChild className="self-start md:self-auto">
            <Link href="/events/create" className="flex items-center">
              <Plus className="mr-2 h-4 w-4" /> Etkinlik Oluştur
            </Link>
          </Button>
        )}
      </div>

      <Tabs
        defaultValue="upcoming"
        value={tab}
        onValueChange={setTab}
        className="mb-8"
      >
        <TabsList>
          <TabsTrigger value="upcoming">Yaklaşan Etkinlikler</TabsTrigger>
          <TabsTrigger value="past">Geçmiş Etkinlikler</TabsTrigger>
          {canCreateEvent && (
            <TabsTrigger value="my">Etkinliklerim</TabsTrigger>
          )}
          {isAdmin && <TabsTrigger value="all">Tüm Etkinlikler</TabsTrigger>}
        </TabsList>
      </Tabs>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Etkinlik ara..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button type="submit">Ara</Button>
        </form>

        <div className="flex flex-row gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Tür filtrele" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Etkinlikler</SelectItem>
              <SelectItem value={EventType.IN_PERSON}>Fiziksel</SelectItem>
              <SelectItem value={EventType.ONLINE}>Online</SelectItem>
              <SelectItem value={EventType.HYBRID}>Hibrit</SelectItem>
            </SelectContent>
          </Select>

          {isAdmin && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Durum filtrele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                <SelectItem value={EventStatus.PENDING_APPROVAL}>
                  Onay Bekleyen
                </SelectItem>
                <SelectItem value={EventStatus.APPROVED}>Onaylı</SelectItem>
                <SelectItem value={EventStatus.REJECTED}>
                  Reddedilmiş
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <div className="text-center p-8 bg-muted rounded-lg">
          <p className="text-lg font-medium">
            Etkinlikler yüklenirken bir hata oluştu
          </p>
          <p className="text-muted-foreground">
            Lütfen daha sonra tekrar deneyin
          </p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center p-12 bg-muted/30 rounded-lg">
          <p className="text-lg font-medium mb-2">Henüz etkinlik bulunmuyor</p>
          <p className="text-muted-foreground mb-4">
            Filtrelerinizi değiştirin veya daha sonra tekrar kontrol edin
          </p>
          {canCreateEvent && (
            <Button asChild>
              <Link href="/events/create">İlk Etkinliği Oluştur</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {events.map((event: EventCardProps) => (
            <Card
              key={event.id}
              className="overflow-hidden flex flex-col h-full"
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
                <Image
                  src={event.coverImage || "/images/placeholder-event.jpg"}
                  alt={event.title}
                  fill
                  className="object-cover transition-transform hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                {(isAdmin || tab === "my") &&
                  event.status !== EventStatus.APPROVED && (
                    <div className="absolute top-2 left-2">
                      <Badge
                        variant={
                          event.status === EventStatus.PENDING_APPROVAL
                            ? "warning"
                            : event.status === EventStatus.REJECTED
                            ? "destructive"
                            : "outline"
                        }
                      >
                        {event.status === EventStatus.PENDING_APPROVAL
                          ? "Onay Bekliyor"
                          : event.status === EventStatus.REJECTED
                          ? "Reddedildi"
                          : event.status}
                      </Badge>
                    </div>
                  )}
              </div>
              <CardHeader className="p-4 pb-2">
                {renderEventDateInfo(event)}
                <CardTitle className="text-base mb-1 line-clamp-2">
                  {event.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="px-4 py-2">
                <p className="line-clamp-2 text-xs text-muted-foreground h-[40px]">
                  {event.description}
                </p>

                <div className="mt-2 space-y-1">
                  {renderEventTypeInfo(event)}
                  {renderEventLocation(event)}
                  {renderOnlineLink(event)}
                </div>
              </CardContent>

              <CardFooter className="mt-auto p-4 pt-2 flex flex-col gap-2">
                {!isUserAuthor(event) &&
                  !isEventPast(event) &&
                  event.status === EventStatus.APPROVED && (
                    <div className="flex gap-2 w-full">
                      <Button
                        variant={isRegistered(event) ? "outline" : "secondary"}
                        className="flex-1 h-8 text-xs"
                        onClick={(e) =>
                          isRegistered(event)
                            ? handleUnregister(event, e)
                            : handleRegister(event, e)
                        }
                        disabled={registering[event.id]}
                      >
                        {registering[event.id] ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : isRegistered(event) ? (
                          <>
                            <UserCheck className="mr-1 h-4 w-4" /> Kayıtlısın
                          </>
                        ) : (
                          <>
                            <UserCheck className="mr-1 h-4 w-4" /> Katıl
                          </>
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        className="flex-1 h-8 text-xs"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          addToGoogleCalendarSafe(event);
                        }}
                      >
                        <Calendar className="mr-1 h-4 w-4" /> Takvime Ekle
                      </Button>
                    </div>
                  )}

                <div className="flex gap-2 w-full">
                  <Button asChild className="w-full h-9 text-xs">
                    <Link href={`/events/${event.slug}`}>Detayları Gör</Link>
                  </Button>
                </div>

                {(isAdmin || isUserAuthor(event)) && (
                  <div className="flex gap-2 w-full">
                    <Button
                      asChild
                      variant="outline"
                      className="w-full h-7 text-xs"
                    >
                      <Link href={`/events/${event.slug}/edit`}>Düzenle</Link>
                    </Button>

                    {tab === "my" && (
                      <AlertDialog
                        open={deleteDialogOpen && eventToDelete === event.slug}
                        onOpenChange={(open) => {
                          setDeleteDialogOpen(open);
                          if (!open) setEventToDelete(null);
                        }}
                      >
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setEventToDelete(event.slug)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Etkinliği Sil</AlertDialogTitle>
                            <AlertDialogDescription>
                              Bu etkinliği silmek istediğinizden emin misiniz?
                              Bu işlem geri alınamaz.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>
                              İptal
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={(e) => {
                                e.preventDefault();
                                handleDeleteEvent();
                              }}
                              disabled={isDeleting}
                              className="bg-destructive hover:bg-destructive/90"
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
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
