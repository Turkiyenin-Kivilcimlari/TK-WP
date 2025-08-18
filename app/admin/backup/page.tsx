"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { UserRole } from "@/models/User";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Settings, List, Clock, HardDrive } from "lucide-react";
import Link from "next/link";
import { useBackupPermissions } from '@/hooks/useBackupPermissions';
import { Skeleton } from '@/components/ui/skeleton';

export default function BackupDashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { canView, canManage, canDownload, isLoading, isSuperAdmin } = useBackupPermissions();
  
  // Oturum ve izin kontrolleri
  useEffect(() => {
    // Oturum yükleniyorsa bekle
    if (status === 'loading') return;
    
    // Oturum yoksa giriş sayfasına yönlendir
    if (!session) {
      router.push('/signin');
      return;
    }
    
    // SuperAdmin veya canView izni olmayan Admin'ler erişemez
    if (session.user.role !== UserRole.SUPERADMIN && 
        (session.user.role !== UserRole.ADMIN || !canView) && 
        !isLoading) {
      router.push('/');
    }
  }, [session, status, canView, isLoading, router]);

  // İçerik yüklenirken veya yönlendirme beklenirken gösterilecek UI
  if (isLoading || status === 'loading') {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  // Erişim yoksa null döndür (useEffect yönlendirme yapacak)
  if (!session || (session.user.role !== UserRole.SUPERADMIN && !canView)) {
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Yedekleme Yönetimi</h1>
        <Button variant="outline" asChild>
          <Link href="/admin/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Yönetim Paneline Dön
          </Link>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Yedekleme Listesi Kartı */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <List className="mr-2 h-5 w-5" />
              Yedekleme Listesi
            </CardTitle>
            <CardDescription>Mevcut tüm yedeklemeleri görüntüleyin</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Tüm sistem yedeklemelerini görüntüleyin. Yedekleme durumlarını ve detaylarını inceleyebilirsiniz.
            </p>
            <Button asChild className="w-full">
              <Link href="/admin/backup/list">
                Yedeklemeleri Görüntüle
              </Link>
            </Button>
          </CardContent>
        </Card>
        
        {/* Yedekleme Doğrulama Kartı - Tüm kullanıcılara gösterilir */}
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="bg-amber-50 dark:bg-amber-950/20 rounded-t-lg">
            <CardTitle className="flex items-center text-xl">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="mr-2 h-5 w-5"
              >
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                <circle cx="12" cy="16" r="1" />
              </svg>
              Yedekleme Doğrulama
            </CardTitle>
            <CardDescription>Yedekleme işlemleri için kimlik doğrulama</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Güvenlik nedeniyle yedekleme işlemleri ek doğrulama gerektirir. Yedekleme şifrenizi doğrulayın.
            </p>
            <Button asChild className="w-full bg-amber-600 hover:bg-amber-700">
              <Link href="/admin/backup/verify">
                Doğrulama Yap
              </Link>
            </Button>
          </CardContent>
        </Card>
        
        {/* Yedekleme İndirme Kartı - Sadece indirme izni varsa göster */}
        {(canDownload || isSuperAdmin) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <Download className="mr-2 h-5 w-5" />
                Yedekleme İndir
              </CardTitle>
              <CardDescription>Yedeklemeleri indirin ve dışa aktarın</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Mevcut yedeklemeleri güvenli bir şekilde indirebilir ve gerektiğinde sistemi geri yükleyebilirsiniz.
              </p>
              <Button asChild className="w-full">
                <Link href="/admin/backup/download">
                  Yedeklemeleri İndir
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
        
        {/* Yedekleme Ayarları Kartı - Sadece yönetme izni varsa göster */}
        {(canManage || isSuperAdmin) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <Settings className="mr-2 h-5 w-5" />
                Yedekleme Ayarları
              </CardTitle>
              <CardDescription>Yedekleme yapılandırmasını özelleştirin</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Otomatik yedekleme zamanlamasını, saklama politikalarını ve yedekleme hedeflerini yapılandırın.
              </p>
              <Button asChild className="w-full">
                <Link href="/admin/backup/settings">
                  Ayarları Yönet
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      
      <div className="p-4 bg-muted rounded-lg">
        <h2 className="text-lg font-medium mb-2">Yedekleme İzinleriniz</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {isSuperAdmin
            ? "Süper yönetici olarak tüm yedekleme izinlerine sahipsiniz."
            : "Aşağıdaki izinlere sahipsiniz:"}
        </p>
        
        {!isSuperAdmin && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className={`p-3 rounded-md border ${canView ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-red-500 bg-gray-50/50 dark:bg-gray-950/20'}`}>
              <p className="font-medium">{canView ? '✓' : '✗'} Görüntüleme</p>
              <p className="text-xs text-muted-foreground">Yedeklemeleri görüntüleme</p>
            </div>
            <div className={`p-3 rounded-md border ${canManage ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-red-500 bg-gray-50/50 dark:bg-gray-950/20'}`}>
              <p className="font-medium">{canManage ? '✓' : '✗'} Yönetme</p>
              <p className="text-xs text-muted-foreground">Yedekleme ayarlarını yapılandırma</p>
            </div>
            <div className={`p-3 rounded-md border ${canDownload ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-red-500 bg-gray-50/50 dark:bg-gray-950/20'}`}>
              <p className="font-medium">{canDownload ? '✓' : '✗'} İndirme</p>
              <p className="text-xs text-muted-foreground">Yedeklemeleri indirme ve dışa aktarma</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
