"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Calendar, Clock, MapPin, Link as LinkIcon, User, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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

export default function EventDetailPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const router = useRouter();
  const { data: session } = useSession();
  const [event, setEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Kullanıcı rolünü kontrol et
  const userRole = session?.user?.role;
  const userId = session?.user?.id;
  
  // Kullanıcı admin mi?
  const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.SUPERADMIN;
  
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(`/api/events/${slug}`);
        setEvent(response.data.event);
        setIsLoading(false);
      } catch (error: any) {;
        setError("Etkinlik bulunamadı");
        setIsLoading(false);
      }
    };

    fetchEvent();
  }, [slug]);

  // Etkinliği silme işlevi
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

  // Kullanıcı etkinlik sahibi mi?
  const isAuthor = userId && event?.author?.id === userId;
  
  // Düzenleme yetkisi
  const canEdit = isAdmin || isAuthor;

  // Silme yetkisi
  const canDelete = isAdmin || isAuthor;

  // Online link gösterimi için kontrol
  const isLinkVisible = () => {
    if (isAdmin || isAuthor) {
      // Admin ve etkinlik sahibi her zaman linki görebilir
      return true;
    }
    
    if (!event.eventDate) return false;
    
    const eventDate = new Date(event.eventDate);
    const now = new Date();
    
    // Etkinliğe kalan süre (milisaniye cinsinden)
    const timeRemaining = eventDate.getTime() - now.getTime();
    
    // Üç saat = 3 * 60 * 60 * 1000 = 10800000 milisaniye
    return timeRemaining <= 10800000 && timeRemaining > 0;
  };
  
  // Etkinliğe ne kadar süre kaldığını hesapla
  const getRemainingTimeText = () => {
    if (!event.eventDate) return "";
    
    const eventDate = new Date(event.eventDate);
    const now = new Date();
    
    // Etkinliğe kalan süre (milisaniye cinsinden)
    const timeRemaining = eventDate.getTime() - now.getTime();
    
    if (timeRemaining <= 0) {
      return "Etkinlik sona erdi";
    }
    
    // Üç saat = 3 * 60 * 60 * 1000 = 10800000 milisaniye
    if (timeRemaining > 10800000) {
      return `Link etkinliğe 3 saat kala görünür olacaktır`;
    }
    
    return "";
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-4">Etkinlik yükleniyor...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <h1 className="text-2xl font-bold mb-6">Etkinlik Bulunamadı</h1>
        <p className="mb-6">Bu etkinlik mevcut değil veya yüklenirken bir hata oluştu.</p>
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
          {/* Düzenleme butonu - sadece admin ve etkinlik sahibi görebilir */}
          {canEdit && (
            <Button asChild variant="outline">
              <Link href={`/events/${slug}/edit`} className="flex items-center">
                <Edit className="mr-2 h-4 w-4" />
                Düzenle
              </Link>
            </Button>
          )}
          
          {/* Silme butonu - sadece admin ve etkinlik sahibi görebilir */}
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
                    Bu etkinliği silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>İptal</AlertDialogCancel>
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
      
      {/* Başlık ve durum bilgisini en üste taşı */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
        
        {/* Durum badge - admin ve etkinliği oluşturan için */}
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
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            <span>{format(new Date(event.eventDate), "d MMMM yyyy", { locale: tr })}</span>
          </div>
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            <span>{format(new Date(event.eventDate), "HH:mm", { locale: tr })}</span>
          </div>
          {event.author && (
            <div className="flex items-center">
              <User className="h-4 w-4 mr-2" />
              <span>{event.author.name} {event.author.lastname}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          {/* Başlık kısmını kaldırdık, yukarı taşındı */}
          
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
          
          {/* Reddedilme nedeni - sadece admin ve etkinliği oluşturan için */}
          {(isAdmin || isAuthor) && event.status === EventStatus.REJECTED && event.rejectionReason && (
            <div className="mt-6 p-4 border border-red-200 bg-red-50 rounded-lg">
              <h3 className="text-lg font-medium text-red-800 mb-2">Reddedilme Nedeni</h3>
              <p className="text-red-600">{event.rejectionReason}</p>
            </div>
          )}
        </div>
        
        <div>
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Etkinlik Bilgileri</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Tarih ve Saat</h3>
                <p className="font-medium">
                  {format(new Date(event.eventDate), "d MMMM yyyy, EEEE", { locale: tr })}
                </p>
                <p>{format(new Date(event.eventDate), "HH:mm", { locale: tr })}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Etkinlik Türü</h3>
                <Badge variant="outline" className={
                  event.eventType === EventType.IN_PERSON 
                  ? "bg-blue-50 text-blue-700 border-blue-200" 
                  : event.eventType === EventType.ONLINE 
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-purple-50 text-purple-700 border-purple-200"
                }>
                  {event.eventType === EventType.IN_PERSON 
                  ? "Fiziksel" 
                  : event.eventType === EventType.ONLINE 
                  ? "Online" 
                  : "Hibrit"}
                </Badge>
              </div>
              
              {(event.eventType === EventType.IN_PERSON || event.eventType === EventType.HYBRID) && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Konum</h3>
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 mr-2 mt-1 shrink-0" />
                    <p>{event.location}</p>
                  </div>
                </div>
              )}
              
              {(event.eventType === EventType.ONLINE || event.eventType === EventType.HYBRID) && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Online Bağlantı</h3>
                  <div className="flex items-start">
                    <LinkIcon className="h-4 w-4 mr-2 mt-1 shrink-0" />
                    {isLinkVisible() ? (
                      <a 
                        href={event.onlineUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline break-all"
                      >
                        {event.onlineUrl}
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
            
            {/* Burada katılma butonları eklenebilir */}
          </Card>
        </div>
      </div>
    </div>
  );
}
