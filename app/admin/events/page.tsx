"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserRole } from "@/models/User";
import { EventStatus, EventType } from "@/models/Event";
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  Filter,
  Loader2,
  Mail,
  Search,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EventManagement } from "@/components/admin/EventManagement";
import { useAdminEvents } from "@/hooks/useEvents";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import api from "@/lib/api";

interface AdminEventDay {
  date?: string;
  eventType: EventType;
}

interface AdminAuthor {
  name?: string;
  lastname?: string;
}

interface AdminEvent {
  id: string;
  _id: string;
  slug: string;
  title: string;
  status: EventStatus;
  eventType?: EventType;
  eventDays?: AdminEventDay[];
  eventDate?: string;
  author?: AdminAuthor;
  coverImage?: string;
  rejectionReason?: string;
  description?: string; // Açıklama ekledik, mail içeriğinde kullanılabilir
}

export default function AdminEventsPage() {
  const { data: session, status } = useSession();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [emailSending, setEmailSending] = useState<{ [key: string]: boolean }>(
    {}
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, isError, refetch } = useAdminEvents({
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: debouncedSearchQuery || undefined,
  });

  const events = data?.events || [];

  // Yükleniyor durumu
  if (status === "loading") {
    return (
      <div className="container mx-auto max-w-7xl py-8 px-4">
        {/* Geri dönüş butonu bölümü */}
        <div className="mb-6">
          <Skeleton className="h-10 w-40 bg-primary/20" />
        </div>
        
        {/* Başlık ve filtreleme bölümü */}
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-56 bg-primary/20" />
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <Skeleton className="h-10 flex-1 bg-primary/20" />
            <Skeleton className="h-10 w-44 bg-primary/20" />
          </div>
        </div>
        
        {/* Etkinlik kart bölümü */}
        <div className="mt-6 border rounded-lg">
          {/* Kart başlığı */}
          <div className="p-4 border-b">
            <Skeleton className="h-6 w-40 bg-primary/20 mb-2" />
            <Skeleton className="h-4 w-60 bg-primary/20" />
          </div>
          
          {/* Etkinlik listesi */}
          <div className="divide-y">
            {Array(3)
              .fill(0)
              .map((_, index) => (
                <div key={index} className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                    <div className="space-y-3 w-full md:w-3/4">
                      {/* Başlık ve etiketler */}
                      <div className="flex flex-wrap gap-2 items-center">
                        <Skeleton className="h-6 w-1/3 bg-primary/20" />
                        <Skeleton className="h-5 w-20 rounded-full bg-primary/20" />
                        <Skeleton className="h-5 w-20 rounded-full bg-primary/20" />
                      </div>
                      
                      {/* Tarih bilgisi */}
                      <div className="flex items-center gap-1">
                        <Skeleton className="h-4 w-4 rounded-full bg-primary/20" />
                        <Skeleton className="h-4 w-36 bg-primary/20" />
                      </div>
                      
                      {/* Oluşturan bilgisi */}
                      <div className="flex items-center gap-1">
                        <Skeleton className="h-4 w-24 bg-primary/20" />
                        <Skeleton className="h-4 w-32 bg-primary/20" />
                      </div>
                      
                      {/* Butonlar */}
                      <div className="pt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Skeleton className="h-8 w-full bg-primary/20" />
                        <Skeleton className="h-8 w-full bg-primary/20" />
                        <Skeleton className="h-8 w-full bg-primary/20" />
                      </div>
                    </div>
                    
                    {/* Kapak görseli */}
                    <Skeleton className="relative w-full md:w-48 h-32 rounded-md bg-primary/20" />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  }

  // Oturum yoksa giriş sayfasına yönlendir
  if (status === "unauthenticated") {
    redirect("/signin");
    return null;
  }

  // Kullanıcı yetkisi kontrol edilir
  const userRole = session?.user?.role as UserRole;
  if (userRole !== UserRole.ADMIN && userRole !== UserRole.SUPERADMIN) {
    redirect("/");
    return null;
  }

  // Durum arkaplan rengi
  const getStatusBadge = (status: string) => {
    switch (status) {
      case EventStatus.PENDING_APPROVAL:
        return (
          <Badge
            variant="secondary"
            className="bg-yellow-500 hover:bg-yellow-700"
          >
            Onay Bekliyor
          </Badge>
        );
      case EventStatus.APPROVED:
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-700">
            Onaylandı
          </Badge>
        );
      case EventStatus.REJECTED:
        return (
          <Badge variant="destructive" className="bg-red-500 hover:bg-red-700">
            Reddedildi
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Etkinlik türü etiketi
  const getEventTypeBadge = (type: string) => {
    switch (type) {
      case EventType.IN_PERSON:
        return (
          <Badge
            variant="outline"
            className="bg-green-500 hover:bg-green-700 text-white"
          >
            Fiziksel
          </Badge>
        );
      case EventType.ONLINE:
        return (
          <Badge
            variant="outline"
            className="bg-blue-500 hover:bg-blue-700 text-white"
          >
            Online
          </Badge>
        );
      case EventType.HYBRID:
        return (
          <Badge
            variant="outline"
            className="bg-purple-500 hover:bg-purple-700 text-white"
          >
            Hibrit
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Etkinlik tarihini formatla
  const formatEventDate = (dateString: string | Date | undefined): string => {
    if (!dateString) return "Belirtilmemiş";

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Geçersiz tarih";
      }
      return format(date, "dd MMMM yyyy, HH:mm", { locale: tr });
    } catch (error) {
      return "Geçersiz tarih";
    }
  };

  // Etkinlik tarihini al (eventDays'den veya eventDate'den)
  const getEventDate = (event: any): string => {
    // Önce eventDays array'ini kontrol et
    if (event.eventDays && event.eventDays.length > 0) {
      // İlk günün tarihini ve saatini al
      const firstDay = event.eventDays[0];
      if (firstDay.date) {
        try {
          const date = new Date(firstDay.date);
          if (!isNaN(date.getTime())) {
            return formatEventDate(date);
          }
        } catch (error) {
          return "Geçersiz tarih";
        }
      }
    }

    // eventDate'i fallback olarak kullan
    if (event.eventDate) {
      return formatEventDate(event.eventDate);
    }

    return "Tarih belirtilmemiş";
  };

  // Etkinlik tipini belirle (eventDays varsa ona göre)
  const getEffectiveEventType = (event: any): string => {
    // Tek bir eventType varsa onu kullan
    if (event.eventType) {
      return event.eventType;
    }

    // eventDays varsa günlerin tiplerini kontrol et
    if (event.eventDays && event.eventDays.length > 0) {
      const types = new Set<string>(
        event.eventDays.map((day: any) => String(day.eventType))
      );

      if (types.size > 1) {
        return EventType.HYBRID; // Farklı tipler varsa HYBRID
      }

      if (types.size === 1) {
        return Array.from(types)[0]; // Tek tip varsa o tip
      }
    }

    return "Belirtilmemiş";
  };

  // E-posta gönderme işlevi
  const handleSendEmail = async (event: AdminEvent) => {
    if (emailSending[event.id]) return; // Zaten gönderiliyor ise işlemi durdur

    try {
      setEmailSending((prev) => ({ ...prev, [event.id]: true }));

      // API'ye istek gönder - yeni API yolunu kullan
      const response = await api.post(`/api/admin/events/send-notification`, {
        eventId: event._id,
        slug: event.slug,
        title: event.title,
        description: event.description,
        eventDate: getEventDate(event),
        eventType: getEffectiveEventType(event),
      });

      if (response.data.success) {
        toast.success("E-postalar gönderildi", {
          description: `${response.data.sentCount || 0} kullanıcıya bildirim gönderildi.`,
        });
      } else {
        toast.error("E-posta gönderilemedi", {
          description: response.data.message || "Bir hata oluştu.",
        });
      }
    } catch (error: any) {
      toast.error("E-posta gönderilemedi", {
        description: error.message || "Bir hata oluştu.",
      });
    } finally {
      setEmailSending((prev) => ({ ...prev, [event.id]: false }));
    }
  };

  return (
    <div className="container mx-auto max-w-7xl py-8 px-4">
      <div className="mb-6">
        <Button variant="outline" asChild>
          <Link href="/admin/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Yönetim Paneline Dön
          </Link>
        </Button>
      </div>

      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Etkinlik Yönetimi</h1>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
            <Input
              placeholder="Etkinlik Ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="min-w-[180px]">
                <SelectValue placeholder="Durum Filtresi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Etkinlikler</SelectItem>
                <SelectItem value={EventStatus.PENDING_APPROVAL}>
                  Onay Bekleyenler
                </SelectItem>
                <SelectItem value={EventStatus.APPROVED}>
                  Onaylananlar
                </SelectItem>
                <SelectItem value={EventStatus.REJECTED}>
                  Reddedilenler
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle>Etkinlik Listesi</CardTitle>
          <CardDescription>
            {statusFilter === "all"
              ? "Tüm etkinlikler"
              : statusFilter === EventStatus.PENDING_APPROVAL
              ? "Onay bekleyen etkinlikler"
              : statusFilter === EventStatus.APPROVED
              ? "Onaylanmış etkinlikler"
              : "Reddedilmiş etkinlikler"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {Array(3)
                .fill(0)
                .map((_, index) => (
                  <div key={index} className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                      <div className="space-y-3 w-full md:w-3/4">
                        {/* Başlık ve etiketler */}
                        <div className="flex flex-wrap gap-2 items-center">
                          <Skeleton className="h-6 w-1/3 bg-primary/20" />
                          <Skeleton className="h-5 w-20 rounded-full bg-primary/20" />
                          <Skeleton className="h-5 w-20 rounded-full bg-primary/20" />
                        </div>
                        
                        {/* Tarih bilgisi */}
                        <div className="flex items-center gap-1">
                          <Skeleton className="h-4 w-4 rounded-full bg-primary/20" />
                          <Skeleton className="h-4 w-36 bg-primary/20" />
                        </div>
                        
                        {/* Oluşturan bilgisi */}
                        <div className="flex items-center gap-1">
                          <Skeleton className="h-4 w-24 bg-primary/20" />
                          <Skeleton className="h-4 w-32 bg-primary/20" />
                        </div>
                        
                        {/* Butonlar */}
                        <div className="pt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <Skeleton className="h-8 w-full bg-primary/20" />
                          <Skeleton className="h-8 w-full bg-primary/20" />
                          <Skeleton className="h-8 w-full bg-primary/20" />
                        </div>
                      </div>
                      
                      {/* Kapak görseli */}
                      <Skeleton className="relative w-full md:w-48 h-32 rounded-md bg-primary/20" />
                    </div>
                  </div>
                ))}
            </div>
          ) : events.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-muted-foreground">Etkinlik bulunamadı.</p>
            </div>
          ) : (
            <div className="divide-y">
              {events.map((event: AdminEvent) => (
                <div key={event.slug} className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2 items-center">
                        <h3 className="text-lg font-semibold">{event.title}</h3>
                        {getStatusBadge(event.status)}
                        {getEventTypeBadge(getEffectiveEventType(event))}
                      </div>

                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{getEventDate(event)}</span>
                        </div>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Oluşturan: </span>
                        {event.author?.name} {event.author?.lastname}
                      </div>

                      {event.status === EventStatus.REJECTED &&
                        event.rejectionReason && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded-md text-sm">
                            <span className="font-medium text-red-600">
                              Reddedilme nedeni:{" "}
                            </span>
                            <span className="text-red-600">
                              {event.rejectionReason}
                            </span>
                          </div>
                        )}

                      {event.eventDays && event.eventDays.length > 1 && (
                        <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md inline-block">
                          {event.eventDays.length} günlük etkinlik
                        </div>
                      )}

                      <div className="pt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1 bg-blue-100 text-blue-700 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <Link href={`/events/${event.slug}`} target="_blank">
                            <ExternalLink className="h-4 w-4" />
                            Görüntüle
                          </Link>
                        </Button>

                        <EventManagement
                          eventId={event._id}
                          status={event.status}
                          onActionComplete={refetch}
                        />

                        {/* E-posta gönder butonu */}
                        {event.status === EventStatus.APPROVED && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1 text-xs "
                            onClick={() => handleSendEmail(event)}
                            disabled={emailSending[event.id]}
                          >
                            <Mail className="h-4 w-4" />
                            {emailSending[event.id] ? (
                              <>
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                Gönderiliyor...
                              </>
                            ) : (
                              "E-posta Gönder"
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {event.coverImage && (
                      <div
                        className={cn(
                          "relative w-full md:w-48 h-32 rounded-md overflow-hidden",
                          "border border-border"
                        )}
                      >
                        <img
                          src={event.coverImage}
                          alt={event.title}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
