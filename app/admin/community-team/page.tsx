"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { UserRole } from "@/models/User";
import { CommunityTeamManagement } from "@/components/admin/CommunityTeamManagement";
import { useTwoFactor } from "@/hooks/useTwoFactor";

export default function AdminCommunityTeamPage() {
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
      redirect("/admin/verify-2fa?returnUrl=/admin/community-team");
      return null;
    }
  }

  // Oturum yükleniyorsa veya 2FA durumu kontrol ediliyorsa
  if (status === "loading" || isTwoFactorLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-8 px-4 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" asChild>
            <Link href="/admin/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Yönetim Paneline Dön
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Topluluk Takım Yönetimi</h1>
        </div>
        <p className="mt-2 text-muted-foreground">
          Topluluk takım üyelerini yönetin, üniversite logolarını ekleyin ve sıralamalarını değiştirin.
        </p>
      </div>

      <CommunityTeamManagement />
    </div>
  );
}
