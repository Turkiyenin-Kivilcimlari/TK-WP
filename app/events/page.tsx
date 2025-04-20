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

interface EventCardProps {
  id: string;
  title: string;
  slug: string;
  description: string;
  eventDate: string | Date;
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

  const userRole = session?.user?.role;
  const isAdmin =
    userRole === UserRole.ADMIN || userRole === UserRole.SUPERADMIN;
  const canCreateEvent =
    userRole === UserRole.ADMIN ||
    userRole === UserRole.SUPERADMIN ||
    userRole === UserRole.REPRESENTATIVE;

  const isUserAuthor = (event: EventCardProps) => {
    return (
      session?.user?.id === event.author?.id ||
      session?.user?.id === event.organizer?.id
    );
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
      tab === "my" ? undefined : statusFilter !== "all" ? statusFilter : undefined,
    eventType: typeFilter !== "all" ? typeFilter : undefined,
    search: searchTerm,
  });

  const events = eventsData?.events || [];

  const isEventPast = (eventDate: string | Date) => {
    const date = new Date(eventDate);
    const oneHourAfterEvent = new Date(date.getTime() + 60 * 60 * 1000);
    return oneHourAfterEvent < new Date();
  };

  const renderEventLocation = (event: EventCardProps) => {
    if (event.eventType === EventType.IN_PERSON || event.location) {
      return (
        <div className="flex items-start text-xs">
          <MapPin className="h-3 w-3 mr-1 mt-0.5 shrink-0" />
          <span className="line-clamp-1">{event.location}</span>
        </div>
      );
    }
    return null;
  };

  const renderOnlineLink = (event: EventCardProps) => {
    if (
      (event.eventType === EventType.ONLINE || event.eventType === EventType.HYBRID) &&
      event.onlineUrl &&
      !isEventPast(event.eventDate)
    ) {
      return (
        <div className="flex items-start text-xs">
          <LinkIcon className="h-3 w-3 mr-1 mt-0.5 shrink-0" />
          <span className="line-clamp-1 text-primary">
            <a href={event.onlineUrl} target="_blank" rel="noopener noreferrer">
              Online Bağlantı
            </a>
          </span>
        </div>
      );
    }
    return null;
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

  return (
    <div className="container mx-auto py-8 px-4">
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
          {canCreateEvent && <TabsTrigger value="my">Etkinliklerim</TabsTrigger>}
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
                {(isAdmin || tab === "my") && event.status !== EventStatus.APPROVED && (
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
                <div className="flex items-center text-xs text-muted-foreground gap-1 mb-2">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {format(new Date(event.eventDate), "d MMM yyyy", {
                      locale: tr,
                    })}
                  </span>
                  <span>•</span>
                  <Clock className="h-3 w-3" />
                  <span>
                    {format(new Date(event.eventDate), "HH:mm", { locale: tr })}
                  </span>
                </div>

                <CardTitle className="text-base mb-1 line-clamp-2">
                  {event.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="px-4 py-2">
                <p className="line-clamp-2 text-xs text-muted-foreground h-[40px]">
                  {event.description}
                </p>

                <div className="mt-2 space-y-1">
                  {renderEventLocation(event)}
                  {renderOnlineLink(event)}
                </div>
              </CardContent>

              <CardFooter className="mt-auto p-4 pt-2 flex flex-col gap-2">
                <Button asChild className="w-full h-7 text-xs">
                  <Link href={`/events/${event.slug}`}>Detayları Gör</Link>
                </Button>

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