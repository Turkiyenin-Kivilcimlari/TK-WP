"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Loader2 } from "lucide-react";
import { EventForm } from "@/components/events/EventForm";
import { UserRole } from "@/models/User";

export default function CreateEventPage() {
  const { data: session, status } = useSession();
  
  // Oturum yükleniyor
  if (status === "loading") {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  // Oturum yoksa giriş sayfasına yönlendir
  if (status === "unauthenticated") {
    redirect("/signin?callbackUrl=/events/create");
    return null;
  }
  
  // Sadece ADMIN, SUPERADMIN ve REPRESENTATIVE roller etkinlik oluşturabilir
  const userRole = session?.user?.role as UserRole;
  if (userRole !== UserRole.ADMIN && userRole !== UserRole.SUPERADMIN && userRole !== UserRole.REPRESENTATIVE) {
    redirect("/events");
    return null;
  }
  
  return (
    <div className="container mx-auto py-10 px-4">
      <EventForm />
    </div>
  );
}
