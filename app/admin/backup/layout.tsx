import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@/models/User";
import { Suspense } from "react";
import AdminLayout from "@/components/layout/AdminLayout"; // AdminWrapper yerine AdminLayout kullanıyoruz

export const metadata: Metadata = {
  title: "Yedekleme Yönetimi | Topluluk",
  description: "Topluluk platformu yedekleme yönetimi sayfası",
};

// Kullanıcı izinlerini API kullanarak kontrol eden özel hook
async function getUserBackupPermissions(userId: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/admin/users/backup-permissions?userId=${userId}`, {
      cache: 'no-store' // Önbelleğe alma, her seferinde güncel veriyi çek
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.success ? data.user.backupPermissions : null;
  } catch (error) {
    
    return null;
  }
}

export default async function BackupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The in-app backup feature is non-functional in the container deployment
  // (ephemeral disk, no mongo tools, missing routes). It is disabled by
  // default; DB backups run via a nightly host-side mongodump cron. To
  // re-enable after a proper rebuild, set ENABLE_BACKUP_UI=true.
  if (process.env.ENABLE_BACKUP_UI !== "true") {
    redirect("/admin/dashboard");
  }

  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/signin");
  }

  // SuperAdmin her zaman erişebilir
  if (session.user.role === UserRole.SUPERADMIN) {
    return (
      <AdminLayout>
        <Suspense fallback={<div>Yükleniyor...</div>}>
          {children}
        </Suspense>
      </AdminLayout>
    );
  }
  
  // Sadece Admin rolü BackupPermissions ile erişebilir
  if (session.user.role === UserRole.ADMIN) {
    // Veritabanı bağlantısı yerine API kullanarak izinleri kontrol et
    const permissions = await getUserBackupPermissions(session.user.id);
    
    if (!permissions?.canView) {
      redirect("/");
    }
    
    return (
      <AdminLayout>
        <Suspense fallback={<div>Yükleniyor...</div>}>
          {children}
        </Suspense>
      </AdminLayout>
    );
  }
  
  // Diğer tüm rollere erişim yok
  redirect("/");
}
