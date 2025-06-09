"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { UserRole } from "@/models/User";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock, Upload, RefreshCw, Database, Cloud, Check, AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useBackupPermissions } from '@/hooks/useBackupPermissions';
import { saveBackupAccessToken } from '@/lib/backupPermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Backup {
  id: string;
  name: string;
  date: string;
  size: string;
  type: string;
  status: string;
  encrypted: boolean;
}

export default function BackupVerifyPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { canManage, isLoading: permissionsLoading, isSuperAdmin } = useBackupPermissions();
  
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBackup, setSelectedBackup] = useState<string>('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreOptions, setRestoreOptions] = useState({
    cloudinary: true
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [restoringProgress, setRestoringProgress] = useState<{
    status: 'idle' | 'in_progress' | 'complete' | 'error';
    message: string;
    details?: string;
    progress?: number;
    currentStep?: string;
  }>({ status: 'idle', message: '' });
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Oturum ve izin kontrolleri
  useEffect(() => {
    if (status === 'loading' || permissionsLoading) return;
    
    if (!session) {
      router.push('/signin');
      return;
    }
    
    if (session.user.role !== UserRole.SUPERADMIN && 
        (session.user.role !== UserRole.ADMIN || !canManage)) {
      router.push('/admin/backup');
      return;
    }
    
    // Yedekleme listesini getir
    fetchBackups();
  }, [session, status, canManage, permissionsLoading, router]);

  // Yedeklemeleri getir
  const fetchBackups = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/backups');
      
      if (!response.ok) {
        throw new Error('Yedeklemeler yüklenemedi');
      }
      
      const data = await response.json();
      // Sadece tamamlanmış yedeklemeleri göster
      const completedBackups = (data.backups || []).filter(
        (b: Backup) => b.status === 'completed'
      );
      setBackups(completedBackups);
      
      // Varsayılan olarak en yeni yedeği seç
      if (completedBackups.length > 0) {
        setSelectedBackup(completedBackups[0].id);
      }
    } catch (error) {
      console.error('Yedeklemeler yüklenirken hata oluştu:', error);
      toast.error('Yedeklemeler yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  };

  // Şifre doğrulama
  const verifyPassword = async () => {
    if (!password.trim()) {
      toast.error('Lütfen şifre girin');
      return;
    }
    
    try {
      setIsVerifying(true);
      
      // API endpoint'ine şifreyi gönder
      const response = await fetch('/api/admin/backups/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password }),
        credentials: 'include'  // Kimlik bilgilerini ekle
      });
      
      // API yanıtını konsola yazdır (sorun tespiti için)
      console.log('API yanıt durumu:', response.status);
      
      const data = await response.json();
      console.log('API yanıt verisi:', data);
      
      // API yanıtı başarılı olsa bile data.success false olabilir
      // Bu nedenle yanıt verisi içeriğini kontrol etmeliyiz
      if (data && (data.success === true || response.status === 200)) {
        // Doğrulama başarılı
        toast.success('Şifre doğrulandı');
        setIsVerified(true);
        
        // Token'ı kaydet
        if (data.accessToken && data.expiresAt) {
          saveBackupAccessToken(data.accessToken, data.expiresAt);
        }
      } else {
        // Yanıt başarılı değilse veya doğrulama başarısız olduysa
        const errorMessage = data.message || data.error || 'Şifre doğrulanamadı';
        console.error('Doğrulama hatası:', errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Şifre doğrulanırken beklenmeyen hata oluştu:', error);
      toast.error('Şifre doğrulama işlemi sırasında bir hata oluştu');
    } finally {
      setIsVerifying(false);
    }
  };

  // Dosya yükleme
  const handleFileUpload = async () => {
    if (!uploadedFile) {
      toast.error('Lütfen bir yedek dosyası seçin');
      return;
    }
    
    if (!password.trim()) {
      toast.error('Lütfen şifre girin');
      return;
    }
    
    try {
      setIsUploading(true);
      
      // Dosyayı FormData ile gönder
      const formData = new FormData();
      formData.append('backupFile', uploadedFile);
      formData.append('password', password);
      
      const response = await fetch('/api/admin/backups/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Yedek yüklenemedi');
      }
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Yedek dosyası başarıyla yüklendi');
        
        // Yedekleme listesini yenile ve yüklenen yedeği seç
        await fetchBackups();
        if (data.backupId) {
          setSelectedBackup(data.backupId);
        }
        
        // Şifre doğrulandı olarak işaretle
        setIsVerified(true);
        
        // Token'ı kaydet
        if (data.accessToken && data.expiresAt) {
          saveBackupAccessToken(data.accessToken, data.expiresAt);
        }
      } else {
        toast.error(data.message || 'Yedek yüklenemedi');
      }
    } catch (error) {
      console.error('Yedek yüklenirken hata oluştu:', error);
      toast.error('Yedek yüklenemedi');
    } finally {
      setIsUploading(false);
    }
  };

  // Restore işlemi
  const handleRestore = async () => {
    if (!isVerified) {
      toast.error('Lütfen önce şifreyi doğrulayın');
      return;
    }
    
    if (!selectedBackup) {
      toast.error('Lütfen bir yedek seçin');
      return;
    }
    
    if (!restoreOptions.cloudinary) {
      toast.error('Cloudinary geri yükleme seçeneği aktif olmalıdır');
      return;
    }
    
    setConfirmDialogOpen(false);
    
    try {
      setIsRestoring(true);
      setRestoringProgress({
        status: 'in_progress',
        message: 'Cloudinary medya dosyaları geri yükleniyor...',
        progress: 0,
        currentStep: 'Başlatılıyor...'
      });
      
      // Progress tracking için event source kullan
      const eventSource = new EventSource(`/api/admin/backups/restore-progress?backupId=${selectedBackup}`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.progress !== undefined) {
            setRestoringProgress(prev => ({
              ...prev,
              progress: data.progress,
              currentStep: data.currentStep || prev.currentStep
            }));
          }
        } catch (error) {
          console.error('Progress tracking hatası:', error);
        }
      };
      
      // Restore API'sine verileri gönder
      const response = await fetch('/api/admin/backups/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          backupId: selectedBackup,
          encryptionKey: password,
          restoreOptions: {
            cloudinary: restoreOptions.cloudinary
          }
        })
      });
      
      // Event source'u kapat
      eventSource.close();
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Geri yükleme başarısız oldu');
      }
      
      if (data.success) {
        setRestoringProgress({
          status: 'complete',
          message: 'Cloudinary medya dosyaları başarıyla geri yüklendi',
          details: data.details || `${data.uploadedCount || 0} dosya başarıyla geri yüklendi.`,
          progress: 100
        });
        
        toast.success('Geri yükleme başarılı');
      } else {
        setRestoringProgress({
          status: 'error',
          message: 'Cloudinary geri yükleme kısmen başarısız oldu',
          details: data.details || `${data.uploadedCount || 0} dosya yüklendi, ${data.failedCount || 0} dosya başarısız oldu.`,
          progress: 100
        });
        
        toast.error(data.message || 'Geri yükleme kısmen başarısız oldu');
      }
    } catch (error: any) {
      console.error('Geri yükleme sırasında hata oluştu:', error);
      setRestoringProgress({
        status: 'error',
        message: 'Geri yükleme başarısız oldu',
        details: error.message || 'Beklenmeyen bir hata oluştu. Lütfen API loglarını kontrol edin.',
        progress: 0
      });
      
      toast.error('Geri yükleme başarısız oldu');
    } finally {
      setIsRestoring(false);
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
  if (isLoading || permissionsLoading || status === 'loading') {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-full mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Erişim yoksa null döndür (useEffect yönlendirme yapacak)
  if (!session || (session.user.role !== UserRole.SUPERADMIN && !canManage)) {
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Yedekleme Doğrulama & Geri Yükleme</h1>
        <Button variant="outline" asChild>
          <Link href="/admin/backup" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Geri Dön</span>
          </Link>
        </Button>
      </div>
      
      <Tabs defaultValue="verify">
        <TabsList className="mb-4">
          <TabsTrigger value="verify">Doğrulama</TabsTrigger>
          <TabsTrigger value="upload" disabled={isRestoring}>Yedek Yükleme</TabsTrigger>
          <TabsTrigger value="restore" disabled={!isVerified || isRestoring}>Geri Yükleme</TabsTrigger>
        </TabsList>
        
        {/* Doğrulama Sekmesi */}
        <TabsContent value="verify">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Yedekleme Şifresi Doğrulama
              </CardTitle>
              <CardDescription>
                Yedekleme işlemleri için şifre doğrulaması yapın
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isVerified ? (
                  <Alert className="bg-green-50 dark:bg-green-950/20 border-green-500">
                    <Check className="h-4 w-4 text-green-500" />
                    <AlertTitle className="text-green-500">Doğrulama Başarılı</AlertTitle>
                    <AlertDescription>
                      Yedekleme şifresi başarıyla doğrulandı. Geri yükleme sekmesine geçebilirsiniz.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="password">Yedekleme Şifresi</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Şifreyi giriniz"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        Yedekleme işlemleri için güvenlik şifresini giriniz. Bu şifre, yedekleme oluşturma sırasında belirlenmiştir.
                      </p>
                    </div>
                    
                    <Button 
                      onClick={verifyPassword} 
                      disabled={isVerifying || !password.trim()}
                      className="w-full"
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Doğrulanıyor...
                        </>
                      ) : (
                        <>
                          <Lock className="mr-2 h-4 w-4" />
                          Şifreyi Doğrula
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Yedek Yükleme Sekmesi */}
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Yedek Dosyası Yükleme
              </CardTitle>
              <CardDescription>
                Mevcut bir yedek dosyasını sisteme yükleyin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="backupFile">Yedek Dosyası</Label>
                  <Input
                    id="backupFile"
                    type="file"
                    accept=".zip,.gz,.enc"
                    onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                    disabled={isUploading}
                  />
                  <p className="text-sm text-muted-foreground">
                    .zip, .gz veya .enc uzantılı yedek dosyasını seçin.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="uploadPassword">Şifreleme Anahtarı</Label>
                  <Input
                    id="uploadPassword"
                    type="password"
                    placeholder="Şifreleme anahtarını giriniz"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isUploading}
                  />
                  <p className="text-sm text-muted-foreground">
                    Yedek dosyası şifrelenmiş ise şifreleme anahtarını giriniz.
                  </p>
                </div>
                
                <Button 
                  onClick={handleFileUpload} 
                  disabled={isUploading || !uploadedFile}
                  className="w-full"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Yükleniyor...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Yedek Dosyasını Yükle
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Geri Yükleme Sekmesi */}
        <TabsContent value="restore">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Sistem Geri Yükleme
              </CardTitle>
              <CardDescription>
                Yedekten sistemi geri yükleyin
              </CardDescription>
            </CardHeader>
            <CardContent>
              {restoringProgress.status !== 'idle' ? (
                <div className="space-y-4">
                  {restoringProgress.status === 'in_progress' && (
                    <div className="flex flex-col items-center justify-center p-8">
                      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                      <h3 className="text-lg font-medium">{restoringProgress.message}</h3>
                      
                      {restoringProgress.progress !== undefined && (
                        <div className="w-full max-w-md mt-4">
                          <div className="flex justify-between text-sm text-muted-foreground mb-1">
                            <span>İlerleme</span>
                            <span>{restoringProgress.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${restoringProgress.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                      
                      {restoringProgress.currentStep && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {restoringProgress.currentStep}
                        </p>
                      )}
                      
                      <p className="text-sm text-muted-foreground mt-2">
                        Lütfen işlem tamamlanana kadar bekleyin ve sayfadan ayrılmayın.
                      </p>
                    </div>
                  )}
                  
                  {restoringProgress.status === 'complete' && (
                    <Alert className="bg-green-50 dark:bg-green-950/20 border-green-500">
                      <Check className="h-4 w-4 text-green-500" />
                      <AlertTitle className="text-green-500">{restoringProgress.message}</AlertTitle>
                      <AlertDescription>
                        {restoringProgress.details}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {restoringProgress.status === 'error' && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>{restoringProgress.message}</AlertTitle>
                      <AlertDescription>
                        {restoringProgress.details}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {(restoringProgress.status === 'complete' || restoringProgress.status === 'error') && (
                    <Button
                      onClick={() => setRestoringProgress({ status: 'idle', message: '' })}
                      className="w-full"
                    >
                      Yeni Geri Yükleme İşlemi Başlat
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>Geri Yüklenecek Yedek</Label>
                    {backups.length > 0 ? (
                      <Select
                        value={selectedBackup}
                        onValueChange={setSelectedBackup}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Bir yedek seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {backups.map((backup) => (
                            <SelectItem key={backup.id} value={backup.id}>
                              {backup.name} - {formatDate(backup.date)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Yedek Bulunamadı</AlertTitle>
                        <AlertDescription>
                          Geri yüklenecek bir yedek bulunamadı. Lütfen önce bir yedek oluşturun veya yükleyin.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Geri Yükleme Seçenekleri</Label>
                    <div className="rounded-md border p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Cloudinary Medya Dosyaları</Label>
                          <p className="text-sm text-muted-foreground">
                            Resimler, videolar ve diğer medya içerikleri
                          </p>
                        </div>
                        <Switch
                          checked={restoreOptions.cloudinary}
                          onCheckedChange={(checked) => 
                            setRestoreOptions(prev => ({ ...prev, cloudinary: checked }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Dikkat: Medya Dosyası Geri Yükleme İşlemi</AlertTitle>
                    <AlertDescription>
                      Bu işlem Cloudinary'deki mevcut medya dosyalarının üzerine yazacaktır. 
                      Geri yükleme işlemi geri alınamaz. Devam etmeden önce mevcut medya dosyalarınızı 
                      yedeklemeniz önerilir.
                      {!restoreOptions.cloudinary && (
                        <span className="block mt-2 font-medium text-destructive">
                          Cloudinary geri yükleme seçeneği aktif olmalıdır.
                        </span>
                      )}
                      <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded border border-yellow-200 dark:border-yellow-800">
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                          ⚠️ Bilinen Sorunlar:
                        </p>
                        <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-1 list-disc list-inside">
                          <li>Büyük dosyalar için işlem süresi uzayabilir</li>
                          <li>Cloudinary API rate limiting nedeniyle gecikmeler olabilir</li>
                          <li>Hata durumunda API loglarını kontrol edin</li>
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
                  
                  <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full"
                        disabled={!selectedBackup || !restoreOptions.cloudinary}
                      >
                        Cloudinary Geri Yükleme İşlemini Başlat
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Cloudinary Geri Yükleme Onayı</DialogTitle>
                        <DialogDescription>
                          Bu işlem mevcut Cloudinary medya dosyalarınızın üzerine yazacaktır ve geri alınamaz.
                          Devam etmek istediğinizden emin misiniz?
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="py-4">
                        <h4 className="font-medium mb-2">Geri Yüklenecek İçerik:</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>Cloudinary Medya Dosyaları (resimler, videolar, belgeler)</li>
                          <li>Medya dosyalarının klasör yapısı</li>
                          <li>Dosya meta verileri</li>
                        </ul>
                      </div>
                      
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
                          İptal
                        </Button>
                        <Button 
                          variant="destructive" 
                          onClick={handleRestore}
                          disabled={isRestoring}
                        >
                          {isRestoring ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Geri Yükleniyor...
                            </>
                          ) : (
                            'Cloudinary Geri Yükle'
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
