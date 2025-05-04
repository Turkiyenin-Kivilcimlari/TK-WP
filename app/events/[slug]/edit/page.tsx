"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { EventForm } from "@/components/events/EventForm";
import { UserRole } from "@/models/User";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import api from "@/lib/api";

export default function EditEventPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);

  // Kullanıcı rolünü kontrol et
  const userRole = session?.user?.role;
  const isAdmin =
    userRole === UserRole.ADMIN || userRole === UserRole.SUPERADMIN;

  // Etkinlik verilerini getir
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(`/api/events/${slug}`);
        const eventData = response.data.event;
        setEvent(eventData);
        setIsLoading(false);
      } catch (error: any) {
        toast.error("Etkinlik bulunamadı", {
          description:
            "Bu etkinlik mevcut değil veya yüklenirken bir hata oluştu.",
        });
        router.push("/events");
      }
    };

    if (session && slug) {
      fetchEvent();
    }
  }, [slug, session, router]);

  // Yükleniyor durumu
  if (status === "loading" || isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Etkinlik yükleniyor...</span>
      </div>
    );
  }

  // Oturum açılmamışsa giriş sayfasına yönlendir
  if (status === "unauthenticated") {
    router.push(
      "/signin?callbackUrl=" + encodeURIComponent(`/events/${slug}/edit`)
    );
    return null;
  }

  // Etkinlik bulunamadıysa
  if (!event) {
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

  // Yetki kontrolü
  const isAuthor = session?.user?.id === event?.author?.id;

  if (!isAdmin && !isAuthor) {
    router.push("/events");
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" asChild className="mb-6">
          <Link href={`/events/${slug}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Etkinliğe Dön
          </Link>
        </Button>
      </div>

      <EventForm event={event} isEdit={true} />
    </div>
  );
}
