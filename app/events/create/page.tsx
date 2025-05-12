"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { EventForm } from "@/components/events/EventForm";
import { UserRole } from "@/models/User";
import { Skeleton } from "@/components/ui/skeleton";

export default function CreateEventPage() {
  const { data: session, status } = useSession();
  
  // Oturum yükleniyor
  if (status === "loading") {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="space-y-6 max-w-3xl mx-auto">
          <Skeleton className="h-12 w-full bg-primary/20" />
          
          <div className="space-y-4">
            <Skeleton className="h-10 w-full bg-primary/20" />
            <Skeleton className="h-10 w-full bg-primary/20" />
            <Skeleton className="h-32 w-full bg-primary/20" />
            <Skeleton className="h-10 w-full bg-primary/20" />
            <Skeleton className="h-10 w-2/3 bg-primary/20" />
          </div>
          
          <div className="flex justify-end">
            <Skeleton className="h-10 w-32 bg-primary/20" />
          </div>
        </div>
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
