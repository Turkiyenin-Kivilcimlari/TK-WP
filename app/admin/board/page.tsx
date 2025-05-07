"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { UserRole } from "@/models/User";
import { BoardManagement } from "@/components/admin/BoardManagement";
import { useTwoFactor } from "@/hooks/useTwoFactor";

export default function AdminBoardPage() {
  const { data: session, status } = useSession();
  const { twoFactorStatus, isLoading: isTwoFactorLoading } = useTwoFactor();

  // Kullanıcı giriş yapmamışsa veya admin değilse yönlendir
  if (status === "unauthenticated") {
    redirect("/login");
  }

  // Admin değilse yönlendir
  if (status === "authenticated" && 
      session.user.role !== UserRole.ADMIN && 
      session.user.role !== UserRole.SUPERADMIN) {
    redirect("/");
  }
  
  // 2FA kontrolü - admin için 2FA doğrulaması gerekli
  if (status === "authenticated" && !isTwoFactorLoading && twoFactorStatus) {
    const isAdmin = session.user.role === UserRole.ADMIN || session.user.role === UserRole.SUPERADMIN;
    
    // Admin ise ve 2FA etkin değilse veya doğrulanmamışsa ana sayfaya yönlendir
    if (isAdmin && (!twoFactorStatus.enabled || !twoFactorStatus.verified)) {
      redirect("/");
    }
  }

  // Hala yükleniyor - Cloudinary ve board verileri veya 2FA durumu yükleniyor
  if (status === "loading" || isTwoFactorLoading) {
    return (
      <div className="container mx-auto py-10 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="justify-center items-center">
        <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-6">
        <Button variant="outline" asChild>
          <Link href="/admin/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Yönetim Paneline Dön
          </Link>
        </Button>
      </div>
      
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Yönetim Kurulu Yönetimi</h1>
        <p className="text-muted-foreground">
          Yönetim kurulu üyelerini düzenleyebilir, ekleyebilir veya kaldırabilirsiniz.
        </p>
      </div>

      <BoardManagement />
    </div>
    </div>
  );
}
