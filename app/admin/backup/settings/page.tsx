"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { UserRole } from "@/models/User";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Settings, Check, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useBackupPermissions } from '@/hooks/useBackupPermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

interface BackupSettings {
  schedule: string;
  retention: {
    days: number;
    maxBackups: number;
  };
  storage: {
    local: {
      path: string;
    };
  };
  mongodb: {
    enabled: boolean;
    encrypt: boolean;
  };
  cloudinary: {
    enabled: boolean;
    encrypt: boolean;
    folders: string[];
  };
  notifications: {
    email: {
      enabled: boolean;
      recipients: string[];
      onSuccess: boolean;
      onFailure: boolean;
    };
  };
}

export default function BackupSettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { canManage, isLoading: permissionsLoading, isSuperAdmin } = useBackupPermissions();
  
  const [settings, setSettings] = useState<BackupSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [emailRecipientInput, setEmailRecipientInput] = useState('');
  const [folderInput, setFolderInput] = useState('');

  // Oturum ve izin kontrolleri
  useEffect(() => {
    if (status === 'loading' || permissionsLoading) return;
    
    if (!session) {
      router.push('/signin');
      return;
    }
    
    if (!canManage && session.user.role !== UserRole.SUPERADMIN) {
      router.push('/admin/backup');
      return;
    }
    
    fetchSettings();
  }, [session, status, canManage, permissionsLoading, router]);

  // Ayarları getir
  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/backups/settings', {
        credentials: 'include', // Oturum bilgilerini (cookie) dahil et
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error('Ayarlar yüklenemedi');
      }
      
      const data = await response.json();
      setSettings(data.settings);
    } catch (error) {
      console.error('Ayarlar yüklenirken hata oluştu:', error);
      toast.error('Ayarlar yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  };

  // Form gönderme
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!settings) return;
    
    try {
      setIsSaving(true);
      
      // API'yi değiştiriyoruz - admin endpoint'ini kullanıyoruz ve PUT metodu kullanıyoruz
      const response = await fetch('/api/admin/backups/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ayarlar kaydedilemedi');
      }
      
      toast.success('Ayarlar başarıyla kaydedildi');
    } catch (error: any) {
      console.error('Ayarlar kaydedilirken hata oluştu:', error);
      toast.error(error.message || 'Ayarlar kaydedilemedi');
    } finally {
      setIsSaving(false);
    }
  };

  // Form değişikliklerini işleme
  const handleChange = (path: string, value: any) => {
    if (!settings) return;
    
    const pathParts = path.split('.');
    let newSettings = { ...settings };
    let current: any = newSettings;
    
    // Son property'ye kadar git
    for (let i = 0; i < pathParts.length - 1; i++) {
      current = current[pathParts[i]];
    }
    
    // Son property'yi güncelle
    current[pathParts[pathParts.length - 1]] = value;
    
    setSettings(newSettings);
  };

  // E-posta alıcısı ekleme
  const addEmailRecipient = () => {
    if (!emailRecipientInput || !settings) {
      toast.error('Lütfen bir e-posta adresi girin');
      return;
    }
    
    console.log('Ekleme öncesi alıcılar:', settings.notifications?.email?.recipients || []);
    
    // E-posta formatını doğrula
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRecipientInput)) {
      toast.error('Geçersiz e-posta adresi');
      return;
    }
    
    // Email alıcıları dizisinin var olduğundan emin olalım
    if (!settings.notifications?.email?.recipients) {
      toast.error('Alıcı listesi bulunamadı');
      return;
    }
    
    // Eğer bu e-posta zaten eklenmiş mi kontrol et
    if (settings.notifications.email.recipients.includes(emailRecipientInput)) {
      toast.error('Bu e-posta adresi zaten eklenmiş');
      return;
    }
    
    try {
      // Yeni e-posta listesi oluştur (immutable şekilde)
      const newRecipients = [...settings.notifications.email.recipients, emailRecipientInput];
      console.log('Yeni alıcılar:', newRecipients);
      
      // Ayarları güncelle (deep clone ile)
      const newSettings = JSON.parse(JSON.stringify(settings));
      newSettings.notifications.email.recipients = newRecipients;
      
      // State'i güncelle
      setSettings(newSettings);
      
      // Bildirim göster
      toast.success(`${emailRecipientInput} alıcı listesine eklendi`);
      
      // Giriş alanını temizle
      setEmailRecipientInput('');
      
      console.log('Ekleme sonrası alıcılar:', newSettings.notifications.email.recipients);
    } catch (error) {
      console.error('E-posta eklenirken hata oluştu:', error);
      toast.error('E-posta eklenemedi');
    }
  };

  // E-posta alıcısı silme
  const removeEmailRecipient = (email: string) => {
    if (!settings) return;
    
    console.log('Silme öncesi alıcılar:', settings.notifications.email.recipients);
    
    try {
      // Immutable şekilde yeni nesne oluşturarak state'i güncelle (deep clone ile)
      const newSettings = JSON.parse(JSON.stringify(settings));
      newSettings.notifications.email.recipients = 
        settings.notifications.email.recipients.filter(r => r !== email);
      
      // State'i güncelle
      setSettings(newSettings);
      toast.success(`${email} alıcı listesinden kaldırıldı`);
      
      console.log('Silme sonrası alıcılar:', newSettings.notifications.email.recipients);
    } catch (error) {
      console.error('E-posta silinirken hata oluştu:', error);
      toast.error('E-posta silinemedi');
    }
  };

  // Cloudinary klasörü ekleme
  const addFolder = () => {
    if (!folderInput || !settings) return;
    
    // Eğer bu klasör zaten eklenmiş mi kontrol et
    if (settings.cloudinary.folders.includes(folderInput)) {
      toast.error('Bu klasör zaten eklenmiş');
      return;
    }
    
    // Yeni klasör listesi oluştur
    const newFolders = [...settings.cloudinary.folders, folderInput];
    
    // Ayarları güncelle
    handleChange('cloudinary.folders', newFolders);
    
    // Giriş alanını temizle
    setFolderInput('');
  };

  // Cloudinary klasörü silme
  const removeFolder = (folder: string) => {
    if (!settings) return;
    
    const newFolders = settings.cloudinary.folders.filter(f => f !== folder);
    handleChange('cloudinary.folders', newFolders);
  };

  // İçerik yüklenirken gösterilecek UI
  if (isLoading || permissionsLoading || status === 'loading') {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-3xl font-bold mb-6">Ayarlar Yüklenemedi</h1>
        <Button onClick={fetchSettings} className="mx-auto">
          <RefreshCw className="mr-2 h-4 w-4" />
          Yeniden Dene
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Yedekleme Ayarları</h1>
        <Button variant="outline" asChild>
          <Link href="/admin/backup" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Geri Dön</span>
          </Link>
        </Button>
      </div>
      
      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="schedule">
          <TabsList className="mb-4">
            <TabsTrigger value="schedule">Zamanlama</TabsTrigger>
            <TabsTrigger value="storage">Depolama</TabsTrigger>
            <TabsTrigger value="data">Veri</TabsTrigger>
            <TabsTrigger value="notifications">Bildirimler</TabsTrigger>
          </TabsList>
          
          {/* Zamanlama Ayarları */}
          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Otomatik Yedekleme Zamanlaması
                </CardTitle>
                <CardDescription>
                  Otomatik yedekleme yapılacak zamanı ve saklama süresini ayarlayın.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-2">
                  <Label htmlFor="schedule">Cron İfadesi</Label>
                  <Input
                    id="schedule"
                    placeholder="0 3 * * *"
                    value={settings.schedule}
                    onChange={(e) => handleChange('schedule', e.target.value)}
                  />
                  <div className="text-sm text-muted-foreground mt-1 space-y-2">
                    <p><strong>Cron ifadesi nedir?</strong> Zamanlanmış görevlerin ne zaman çalışacağını belirten bir formattır.</p>
                    <p>Format: <code>dakika saat günAyın günHafta ay</code> şeklindedir (5 adet değer)</p>
                    <p><strong>Yaygın örnekler:</strong></p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><code>0 3 * * *</code> = Her gün gece 03:00'de</li>
                      <li><code>0 */6 * * *</code> = Her 6 saatte bir (00:00, 06:00, 12:00, 18:00)</li>
                      <li><code>0 0 * * 0</code> = Her hafta Pazar günü gece yarısı</li>
                      <li><code>0 0 1 * *</code> = Her ayın ilk günü gece yarısı</li>
                    </ul>
                    <p><a href="https://crontab.guru/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Cron ifadelerini test etmek için tıklayın →
                    </a></p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid gap-6">
                  <h3 className="text-lg font-medium">Saklama Politikaları</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="retentionDays">Saklama Süresi (Gün)</Label>
                      <Input
                        id="retentionDays"
                        type="number"
                        min="1"
                        placeholder="7"
                        value={settings.retention.days}
                        onChange={(e) => handleChange('retention.days', parseInt(e.target.value) || 1)}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Yedeklerin kaç gün saklanacağını belirler.
                      </p>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="maxBackups">Maksimum Yedek Sayısı</Label>
                      <Input
                        id="maxBackups"
                        type="number"
                        min="1"
                        placeholder="10"
                        value={settings.retention.maxBackups}
                        onChange={(e) => handleChange('retention.maxBackups', parseInt(e.target.value) || 1)}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Saklanacak maksimum yedek sayısını belirler.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Depolama Ayarları */}
          <TabsContent value="storage">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Depolama Ayarları
                </CardTitle>
                <CardDescription>
                  Yedeklemelerin saklanacağı yerler ve formatları.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-2">
                  <Label htmlFor="storagePath">Yerel Depolama Yolu</Label>
                  <Input
                    id="storagePath"
                    placeholder="./backups"
                    value={settings.storage.local.path}
                    onChange={(e) => handleChange('storage.local.path', e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Yedeklerin kaydedileceği klasör yolu (sunucu üzerinde).
                  </p>
                </div>
                
                {/* Gelecekte burada cloud storage ayarları eklenebilir */}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Veri Ayarları */}
          <TabsContent value="data">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Cloudinary Yedekleme Ayarları
                </CardTitle>
                <CardDescription>
                  Cloudinary medya dosyalarının yedekleme ayarlarını belirleyin.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Cloudinary Medya</h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Cloudinary Yedekleme</Label>
                      <p className="text-sm text-muted-foreground">Cloudinary'deki medya dosyalarını yedekle</p>
                    </div>
                    <Switch
                      checked={settings.cloudinary.enabled}
                      onCheckedChange={(checked) => handleChange('cloudinary.enabled', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Cloudinary Şifreleme</Label>
                      <p className="text-sm text-muted-foreground">Cloudinary yedeklerini şifrele</p>
                    </div>
                    <Switch
                      checked={settings.cloudinary.encrypt}
                      onCheckedChange={(checked) => handleChange('cloudinary.encrypt', checked)}
                      disabled={!settings.cloudinary.enabled}
                    />
                  </div>
                  
                  <div className="mt-4">
                    <Label>Yedeklenecek Cloudinary Klasörleri</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="Klasör adı (örn: user_avatars)"
                        value={folderInput}
                        onChange={(e) => setFolderInput(e.target.value)}
                      />
                      <Button type="button" variant="outline" onClick={addFolder}>
                        Ekle
                      </Button>
                    </div>
                    
                    <div className="mt-4 space-y-2">
                      {settings.cloudinary.folders.map((folder) => (
                        <div key={folder} className="flex items-center justify-between px-3 py-2 rounded-md bg-muted">
                          <span>{folder}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFolder(folder)}
                          >
                            Kaldır
                          </Button>
                        </div>
                      ))}
                      
                      {settings.cloudinary.folders.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          Henüz bir klasör eklenmemiş. Tüm medya dosyaları yedeklenecek.
                        </p>
                      )}
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-800">
                        <strong>Not:</strong> Bu projede sadece Cloudinary medya dosyaları yedeklenmektedir. 
                        MongoDB veritabanı yedeklemesi tamamen kaldırılmıştır.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Bildirim Ayarları */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Bildirim Ayarları
                </CardTitle>
                <CardDescription>
                  Yedekleme işlemleri için bildirim ayarlarını yapılandırın.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">E-posta Bildirimleri</h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>E-posta Bildirimleri</Label>
                      <p className="text-sm text-muted-foreground">Yedekleme işlemleri hakkında e-posta gönder</p>
                    </div>
                    <Switch
                      checked={settings.notifications.email.enabled}
                      onCheckedChange={(checked) => handleChange('notifications.email.enabled', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Başarılı İşlemlerde</Label>
                      <p className="text-sm text-muted-foreground">Başarılı yedekleme işlemleri için bildirim gönder</p>
                    </div>
                    <Switch
                      checked={settings.notifications.email.onSuccess}
                      onCheckedChange={(checked) => handleChange('notifications.email.onSuccess', checked)}
                      disabled={!settings.notifications.email.enabled}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Başarısız İşlemlerde</Label>
                      <p className="text-sm text-muted-foreground">Başarısız yedekleme işlemleri için bildirim gönder</p>
                    </div>
                    <Switch
                      checked={settings.notifications.email.onFailure}
                      onCheckedChange={(checked) => handleChange('notifications.email.onFailure', checked)}
                      disabled={!settings.notifications.email.enabled}
                    />
                  </div>
                  
                  <div className="mt-4">
                    <Label>Bildirim Alıcıları</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="email"
                        placeholder="E-posta adresi"
                        value={emailRecipientInput}
                        onChange={(e) => setEmailRecipientInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addEmailRecipient();
                          }
                        }}
                        disabled={!settings.notifications.email.enabled}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addEmailRecipient}
                        disabled={!settings.notifications.email.enabled}
                      >
                        Ekle
                      </Button>
                    </div>
                    
                    <div className="mt-4 space-y-2">
                      {Array.isArray(settings.notifications.email.recipients) && 
                       settings.notifications.email.recipients.length > 0 ? (
                        <>
                          <p className="text-sm text-muted-foreground">
                            {settings.notifications.email.recipients.length} adet alıcı eklenmiş
                          </p>
                          {settings.notifications.email.recipients.map((email) => (
                            <div key={email} className="flex items-center justify-between px-3 py-2 rounded-md bg-muted">
                              <span>{email}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeEmailRecipient(email)}
                                disabled={!settings.notifications.email.enabled}
                              >
                                Kaldır
                              </Button>
                            </div>
                          ))}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Henüz bir alıcı eklenmemiş. Bildirimler gönderilmeyecek.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="mt-6 flex justify-end">
          <Button
            type="submit"
            className="flex items-center gap-2"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Kaydediliyor...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Ayarları Kaydet</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
