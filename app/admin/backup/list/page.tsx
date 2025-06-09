"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { UserRole } from "@/models/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, RefreshCw, Eye, Trash, Info, AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useBackupPermissions } from '@/hooks/useBackupPermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
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

export default function BackupListPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { canView, canManage, canDownload, isLoading: permissionsLoading, isSuperAdmin } = useBackupPermissions();
  
  const [backups, setBackups] = useState<Backup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateLoading, setIsCreateLoading] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Oturum ve izin kontrolleri
  useEffect(() => {
    if (status === 'loading' || permissionsLoading) return;
    
    if (!session) {
      router.push('/signin');
      return;
    }
    
    if (session.user.role !== UserRole.SUPERADMIN && 
        (session.user.role !== UserRole.ADMIN || !canView)) {
      router.push('/');
      return;
    }
    
    // Yedekleme listesini yükle
    fetchBackups();
  }, [session, status, canView, permissionsLoading, router]);

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

  // Yeni yedekleme oluştur
  const createBackup = async () => {
    try {
      setIsCreateLoading(true);
      
      const response = await fetch('/api/admin/backups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'full' }),
      });
      
      if (!response.ok) {
        throw new Error('Yedekleme başlatılamadı');
      }
      
      toast.success('Yedekleme başlatıldı', {
        description: 'Yedekleme işlemi arka planda devam ediyor. Tamamlandığında listede görünecektir.'
      });
      
      // 3 saniye sonra listeyi yenile
      setTimeout(() => {
        fetchBackups();
      }, 3000);
      
    } catch (error) {
      console.error('Yedekleme oluşturulurken hata oluştu:', error);
      toast.error('Yedekleme başlatılamadı');
    } finally {
      setIsCreateLoading(false);
    }
  };

  // Yedekleme silme
  const deleteBackup = async (backupId: string) => {
    try {
      if (!deletePassword.trim()) {
        setPasswordError('Lütfen şifreleme anahtarını giriniz');
        return;
      }
      
      setIsDeleting(true);
      setPasswordError('');
      
      const response = await fetch(`/api/admin/backups/${backupId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: deletePassword }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          setPasswordError(errorData.message || 'Hatalı şifre');
          setIsDeleting(false);
          return;
        }
        throw new Error(errorData.message || 'Yedekleme silinemedi');
      }
      
      toast.success('Yedekleme silindi');
      fetchBackups();
      setDeletePassword(''); // Şifreyi temizle
    } catch (error: any) {
      console.error('Yedekleme silinirken hata oluştu:', error);
      toast.error('Yedekleme silinemedi');
    } finally {
      setIsDeleting(false);
    }
  };

  // Yedekleme detaylarını görüntüle
  const showBackupDetails = (backup: Backup) => {
    setSelectedBackup(backup);
    setIsDetailOpen(true);
  };

  // Tarih formatı
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', { 
      dateStyle: 'medium', 
      timeStyle: 'short' 
    }).format(date);
  };

  // Yedekleme tipi Türkçe gösterimi
  const getBackupTypeName = (type: string) => {
    switch (type) {
      case 'full': return 'Tam Yedekleme';
      case 'mongodb': return 'Veritabanı';
      case 'cloudinary': return 'Cloudinary';
      default: return type;
    }
  };

  // Durum badge'i
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Tamamlandı</Badge>;
      case 'in_progress':
        return <Badge variant="warning">Devam Ediyor</Badge>;
      case 'failed':
        return <Badge variant="destructive">Başarısız</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // İçerik yüklenirken gösterilecek UI
  if (isLoading || permissionsLoading || status === 'loading') {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-7 w-48" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <div className="h-10 border-b flex items-center px-4">
                <Skeleton className="h-4 w-1/5" />
                <Skeleton className="h-4 w-1/5 ml-4" />
                <Skeleton className="h-4 w-1/5 ml-4" />
                <Skeleton className="h-4 w-1/5 ml-4" />
                <Skeleton className="h-4 w-1/5 ml-4" />
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 border-b flex items-center px-4">
                  <Skeleton className="h-4 w-1/5" />
                  <Skeleton className="h-4 w-1/5 ml-4" />
                  <Skeleton className="h-4 w-1/5 ml-4" />
                  <Skeleton className="h-4 w-1/5 ml-4" />
                  <Skeleton className="h-4 w-1/5 ml-4" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">Yedekleme Listesi</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          {(canManage || isSuperAdmin) && (
            <Button 
              onClick={createBackup} 
              disabled={isCreateLoading}
              className="flex items-center gap-2"
            >
              {isCreateLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Yedekleniyor...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span>Yeni Yedek Oluştur</span>
                </>
              )}
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/admin/backup" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Geri Dön</span>
            </Link>
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Mevcut Yedeklemeler
          </CardTitle>
        </CardHeader>
        <CardContent>
          {backups.length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Adı</TableHead>
                    <TableHead>Tür</TableHead>
                    <TableHead>Boyut</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((backup) => (
                    <TableRow key={backup.id}>
                      <TableCell>{formatDate(backup.date)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {backup.name}
                          {backup.encrypted && (
                            <Badge variant="outline" className="ml-1">
                              <span className="text-xs">Şifreli</span>
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getBackupTypeName(backup.type)}</TableCell>
                      <TableCell>{backup.size}</TableCell>
                      <TableCell>{getStatusBadge(backup.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => showBackupDetails(backup)}
                            title="Detaylar"
                          >
                            <Info className="h-4 w-4" />
                          </Button>
                          
                          {(canDownload || isSuperAdmin) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              title="İndir"
                            >
                              <Link href={`/admin/backup/download/${backup.id}`}>
                                <Download className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                          
                          {(canManage || isSuperAdmin) && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={isDeleting}
                                  title="Sil"
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Yedeği Sil</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    <p className="mb-4">
                                      Bu yedeklemeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                                    </p>
                                    <div className="space-y-2">
                                      <Label htmlFor="deletePassword">Şifreleme Anahtarı</Label>
                                      <Input
                                        id="deletePassword"
                                        type="password"
                                        placeholder="Şifreleme anahtarını giriniz"
                                        value={deletePassword}
                                        onChange={(e) => setDeletePassword(e.target.value)}
                                      />
                                      {passwordError && (
                                        <p className="text-sm text-destructive">{passwordError}</p>
                                      )}
                                      <p className="text-sm text-muted-foreground mt-1">
                                        Yedeği silmek için, oluşturulduğunda e-posta ile gönderilen şifreleme anahtarını girmeniz gerekmektedir.
                                      </p>
                                    </div>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => {
                                    setDeletePassword('');
                                    setPasswordError('');
                                  }}>İptal</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteBackup(backup.id)}
                                    disabled={isDeleting}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {isDeleting ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Siliniyor...
                                      </>
                                    ) : (
                                      'Sil'
                                    )}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
                <AlertTriangle className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">Yedekleme Bulunamadı</h3>
              <p className="text-sm text-muted-foreground mt-2 mb-6">
                Henüz oluşturulmuş bir yedekleme bulunmuyor.
              </p>
              {(canManage || isSuperAdmin) && (
                <Button onClick={createBackup} disabled={isCreateLoading}>
                  {isCreateLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Yedekleniyor...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      İlk Yedeği Oluştur
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Yedekleme Detayları Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yedekleme Detayları</DialogTitle>
            <DialogDescription>
              Yedekleme hakkında ayrıntılı bilgi.
            </DialogDescription>
          </DialogHeader>
          
          {selectedBackup && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Yedekleme Adı</p>
                  <p>{selectedBackup.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tarih</p>
                  <p>{formatDate(selectedBackup.date)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tür</p>
                  <p>{getBackupTypeName(selectedBackup.type)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Boyut</p>
                  <p>{selectedBackup.size}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Durum</p>
                  <p>{getStatusBadge(selectedBackup.status)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Şifreleme</p>
                  <p>{selectedBackup.encrypted ? 'Şifreli' : 'Şifresiz'}</p>
                </div>
              </div>
              
              <div className="pt-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">İçerik</p>
                <div className="rounded-md bg-muted p-3 text-sm">
                  {selectedBackup.type === 'full' ? (
                    <ul className="list-disc list-inside space-y-1">
                      <li>MongoDB Veritabanı Yedeklemesi</li>
                      <li>Cloudinary Medya Dosyaları</li>
                      <li>Sistem Konfigürasyon Dosyaları</li>
                    </ul>
                  ) : selectedBackup.type === 'mongodb' ? (
                    <ul className="list-disc list-inside space-y-1">
                      <li>MongoDB Veritabanı Yedeklemesi</li>
                    </ul>
                  ) : (
                    <ul className="list-disc list-inside space-y-1">
                      <li>Cloudinary Medya Dosyaları</li>
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Kapat
            </Button>
            
            {selectedBackup && (canDownload || isSuperAdmin) && (
              <Button asChild>
                <Link href={`/admin/backup/download/${selectedBackup.id}`}>
                  <Download className="mr-2 h-4 w-4" />
                  İndir
                </Link>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
