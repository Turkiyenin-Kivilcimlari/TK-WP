"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { UserRole } from "@/models/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Cloud, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useBackupPermissions } from '@/hooks/useBackupPermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface Backup {
  id: string;
  name: string;
  date: string;
  size: string;
  type: string;
  status: string;
  encrypted: boolean;
}

export default function BackupDownloadPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { canDownload, isLoading: permissionsLoading, isSuperAdmin } = useBackupPermissions();
  
  const [backups, setBackups] = useState<Backup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState('');
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [checkingPassword, setCheckingPassword] = useState(true);

  // Oturum ve izin kontrolleri
  useEffect(() => {
    if (status === 'loading' || permissionsLoading) return;
    
    if (!session) {
      router.push('/signin');
      return;
    }
    
    // Şifre doğrulaması kontrolünü kaldırıyoruz, doğrudan izinleri kontrol ediyoruz
    if (!canDownload && session.user.role !== UserRole.SUPERADMIN) {
      router.push('/admin/backup');
      return;
    }
    
    // Verify kontrolünü kaldırıp doğrudan yedekleri yükleyelim
    fetchBackups();
  }, [session, status, canDownload, permissionsLoading, router]);

  // Yedeklemeleri getir
  const fetchBackups = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/backups');
      
      if (!response.ok) {
        throw new Error('Yedeklemeler yüklenemedi');
      }
      
      const data = await response.json();
      setBackups(data.backups || []);
    } catch (error) {
      console.error('Yedeklemeler yüklenirken hata oluştu:', error);
      toast.error('Yedeklemeler yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  };

  // Yedeği indir
  const downloadBackup = async (backupId: string, isEncrypted: boolean) => {
    if (isEncrypted && !encryptionKey) {
      toast.error('Şifreleme anahtarı gerekli', {
        description: 'Bu yedek şifrelenmiş. İndirmek için şifreleme anahtarını girmelisiniz.'
      });
      return;
    }
    
    try {
      setIsDownloading(true);
      
      // Şifreli yedekler için şifreleme anahtarını API'ye gönder
      const params = new URLSearchParams();
      if (isEncrypted && encryptionKey) {
        params.append('key', encryptionKey);
      }
      
      // API'den dosyayı indir - endpoint düzeltildi
      const response = await fetch(`/api/admin/backups/download/${backupId}${params.toString() ? `?${params.toString()}` : ''}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Yedek indirilemedi' }));
        throw new Error(errorData.message || 'Yedek indirilemedi');
      }
      
      // Dosya adını al
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'backup.zip';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }
      
      // Dosyayı kaydet
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Yedek indirildi');
    } catch (error) {
      console.error('Yedek indirilirken hata oluştu:', error);
      toast.error('Yedek indirilemedi');
    } finally {
      setIsDownloading(false);
    }
  };

  // Tarih formatı
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', { 
      dateStyle: 'medium', 
      timeStyle: 'short' 
    }).format(date);
  };

  // İçerik yüklenirken veya yönlendirme beklenirken gösterilecek UI
  if (isLoading || permissionsLoading || status === 'loading' || checkingPassword) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Erişim yoksa null döndür (useEffect yönlendirme yapacak)
  if (!session || (session.user.role !== UserRole.SUPERADMIN && !canDownload) || !isPasswordVerified) {
    return null;
  }

  // Sadece cloudinary yedeklemeleri
  const cloudinaryBackups = backups.filter(b => b.status === 'completed').slice(0, 10);

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Cloudinary Yedek İndir</h1>
        <Button variant="outline" asChild>
          <Link href="/admin/backup" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Geri Dön</span>
          </Link>
        </Button>
      </div>
      
      <div className="mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4 items-start">
              <div className="flex-1">
                <h3 className="text-lg font-medium mb-2">Cloudinary Medya Yedeklemeleri</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Cloudinary'deki medya dosyalarınızın yedeklerini indirin. 
                  Şifreli yedeklemeleri indirmek için şifreleme anahtarını girmelisiniz.
                </p>
              </div>
              
              <div className="w-full md:w-1/3">
                <Input
                  type="password"
                  placeholder="Şifreleme anahtarı"
                  value={encryptionKey}
                  onChange={(e) => setEncryptionKey(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Sadece Cloudinary yedeklemeleri */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Cloudinary Medya Yedeklemeleri
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cloudinaryBackups.length > 0 ? (
            <div className="space-y-4">
              {cloudinaryBackups.map(backup => (
                <div key={backup.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border rounded-md">
                  <div className="mb-3 md:mb-0">
                    <div className="font-medium">{backup.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(backup.date)} • {backup.size}
                      {backup.encrypted && (
                        <span className="ml-2 text-yellow-500 inline-flex items-center">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Şifreli
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Cloudinary Medya Yedeklemesi
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => downloadBackup(backup.id, backup.encrypted)}
                    disabled={isDownloading}
                    className="w-full md:w-auto"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    İndir
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Cloudinary Yedeği Bulunamadı</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Henüz oluşturulmuş bir Cloudinary medya yedeklemesi bulunmuyor.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
