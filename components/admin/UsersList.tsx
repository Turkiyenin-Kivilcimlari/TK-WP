"use client";

import { useState, useEffect } from 'react';
import { useUsers, UsersParams } from '@/hooks/useUsers';
import { UserRole } from '@/models/User';
import { useSession } from 'next-auth/react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Loader2, Search, Trash, UserCog } from 'lucide-react';
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
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface UsersListProps {
  currentUserId: string;
}
export function UsersList({ currentUserId }: UsersListProps) {
  const { data: session } = useSession();
  
  const [params, setParams] = useState<UsersParams>({
    page: 1,
    limit: 10,
    search: '',
    role: undefined,
  });
  
  const [searchInput, setSearchInput] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all');
  
  const {
    users,
    totalUsers,
    currentPage,
    totalPages,
    isLoading,
    deleteUser,
    isDeleting,
    updateUserRole,
    isUpdatingRole,
  } = useUsers(params);
  
  // Otomatik arama için useEffect
  useEffect(() => {
    // Önceki timeout'u temizle
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // 500ms sonra aramayı gerçekleştir
    const timeout = setTimeout(() => {
      setParams((prev) => ({
        ...prev,
        page: 1,
        search: searchInput,
      }));
    }, 500); // 500ms debounce
    
    setSearchTimeout(timeout);
    
    // Component unmount olduğunda timeout'u temizle
    return () => {
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  }, [searchInput]);
  
  // Sayfa değişikliği
  const handlePageChange = (page: number) => {
    setParams((prev) => ({ ...prev, page }));
  };
  
  // Rol filtreleme
  const handleRoleFilter = (role: UserRole | 'all') => {
    setSelectedRole(role);
    setParams((prev) => ({
      ...prev,
      page: 1,
      role: role === 'all' ? undefined : role,
    }));
  };
  
  // Kullanıcı rolünü değiştirme
  const handleRoleChange = (userId: string, role: UserRole) => {
    // ID doğrulaması yapalım
    if (!userId || typeof userId !== 'string') {
      toast.error("Rol değiştirme işlemi başarısız", {
        description: "Kullanıcı kimliği geçersiz."
      });
      return;
    }
    
    
    // Rol güncellemesini başlat
    toast.promise(
      async () => {
        try {
          await updateUserRole({ userId, role });
          return "başarılı";
        } catch (error: any) {
          toast.error("Rol güncelleme işlemi başarısız")
        }
      },
      {
        loading: 'Kullanıcı rolü güncelleniyor...',
        success: () => 'Kullanıcı rolü başarıyla güncellendi',
        error: (err) => `Güncelleme başarısız.`
      }
    );
  };
  
  // Kullanıcı silme
  const handleDeleteUser = (userId: string) => {
    // ID kontrolü ekleyelim
    if (!userId || typeof userId !== 'string') {
      toast.error("Silme işlemi başarısız", {
        description: "Kullanıcı kimliği geçersiz."
      });
      return;
    }
    

    // Silme işlemini başlat
    toast.promise(
      // Promise döndüren bir fonksiyon
      async () => {
        try {
          await deleteUser(userId);
          return "başarılı";
        } catch (error: any) {
          throw new Error("Bir hata oluştu");
        }
      },
      {
        loading: 'Kullanıcı siliniyor...',
        success: () => 'Kullanıcı başarıyla silindi',
        error: (err) => `Silme başarısız.`
      }
    );
  };

  // Kullanıcının silinip silinemeyeceğini kontrol etme
  const canDeleteUser = (userId: string, userRole: UserRole) => {
    // Kendi hesabını silmesini engelle
    if (userId === currentUserId) {
      return false;
    }
    
    const currentUserRole = session?.user?.role;
    
    // SUPERADMIN tüm kullanıcıları silebilir (kendisi ve diğer süper yöneticiler hariç)
    if (currentUserRole === UserRole.SUPERADMIN) {
      // Süper yöneticiler birbirini silemez
      if (userRole === UserRole.SUPERADMIN) {
        return false;
      }
      return true;
    }
    
    // ADMIN rolündeki kullanıcılar yalnızca MEMBER ve REPRESENTATIVE rolündeki kullanıcıları silebilir
    if (currentUserRole === UserRole.ADMIN) {
      if (userRole === UserRole.ADMIN || userRole === UserRole.SUPERADMIN) {
        return false;
      }
      return true;
    }
    
    // Diğer roller hiçbir kullanıcıyı silemez
    return false;
  };
  
  // Kullanıcıyı silme neden açıklaması
  const getDeleteDisabledReason = (userId: string, userRole: UserRole) => {
    const currentUserRole = session?.user?.role;
    
    if (userId === currentUserId) {
      return "Kendi hesabınızı silemezsiniz";
    }
    
    if (currentUserRole === UserRole.SUPERADMIN && userRole === UserRole.SUPERADMIN) {
      return "Süper yöneticiler birbirini silemez";
    }
    
    if (currentUserRole === UserRole.ADMIN && 
        (userRole === UserRole.ADMIN || userRole === UserRole.SUPERADMIN)) {
      return "Yönetim üyeleri ve süper yöneticiler silinemez";
    }
    
    return "";
  };
  
  // Rol badge rengi
  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPERADMIN:
        return 'destructive'; // Kırmızı
      case UserRole.ADMIN:
        return 'default'; // Mavi
      case UserRole.REPRESENTATIVE:
        return 'secondary'; // Gri
      default:
        return 'outline'; // Beyaz
    }
  };

  // Rol ismini Türkçe olarak gösterme fonksiyonu
  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPERADMIN:
        return 'Süper Yönetici';
      case UserRole.ADMIN:
        return 'Yönetim Üyesi';
      case UserRole.REPRESENTATIVE:
        return 'Topluluk Temsilcisi';
      case UserRole.MEMBER:
        return 'Üye';
      default:
        return role;
    }
  };

  // Rol değişikliği yapılabilir mi kontrolü
  const canChangeRole = (userId: string, userRole: UserRole) => {
    // Kendi rolünü değiştirmeyi engelle
    if (userId === currentUserId) {
      return false;
    }
    
    const currentUserRole = session?.user?.role;
    
    // SUPERADMIN tüm kullanıcıların rolünü değiştirebilir
    if (currentUserRole === UserRole.SUPERADMIN) {
      // Süper yöneticiler birbirinin rolünü değiştiremez
      if (userRole === UserRole.SUPERADMIN && userId !== currentUserId) {
        return false;
      }
      return true;
    }
    
    // ADMIN rolündeki kullanıcılar sadece normal üyelerin rolünü değiştirebilir
    if (currentUserRole === UserRole.ADMIN) {
      // Admin diğer adminlerin ve süper adminlerin rolünü değiştiremez
      if (userRole === UserRole.ADMIN || userRole === UserRole.SUPERADMIN) {
        return false;
      }
      return true;
    }
    
    // Diğer roller hiçbir rolü değiştiremez
    return false;
  };
  
  // Rol değiştirme neden açıklaması
  const getRoleChangeDisabledReason = (userId: string, userRole: UserRole) => {
    const currentUserRole = session?.user?.role;
    
    if (userId === currentUserId) {
      return "Kendi rolünüzü değiştiremezsiniz";
    }
    
    if (currentUserRole === UserRole.SUPERADMIN && userRole === UserRole.SUPERADMIN) {
      return "Süper yöneticilerin rolünü değiştiremezsiniz";
    }
    
    if (currentUserRole === UserRole.ADMIN && 
        (userRole === UserRole.ADMIN || userRole === UserRole.SUPERADMIN)) {
      return "Yönetici ve üstü kullanıcıların rolünü değiştiremezsiniz";
    }
    
    return "";
  };

  // Ekran genişliğini izlemek için durum
  const [isMobile, setIsMobile] = useState(false);
  
  // Ekran genişliğini izle
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // İlk yükleme kontrolü
    checkMobileView();
    
    // Pencere boyutu değiştiğinde kontrol et
    window.addEventListener('resize', checkMobileView);
    
    // Temizleme
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Arama ve filtre alanı skeleton */}
        <div className="flex flex-col md:flex-row gap-4">
          <Skeleton className="h-10 w-full bg-primary/20"/>
          <Skeleton className="h-10 w-full md:w-40 bg-primary/20"/>
        </div>
        
        {/* Mobil ve masaüstü görünümler için farklı skeleton yapıları */}
        <div className="md:hidden space-y-4">
          {Array(5).fill(0).map((_, index) => (
            <div key={index} className="border rounded-md p-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-[150px] bg-primary/20"/>
                  <Skeleton className="h-6 w-[70px] bg-primary/20"/>
                </div>
                <Skeleton className="h-4 w-full max-w-[200px] bg-primary/20"/>
                <div className="pt-3 space-y-2">
                  <Skeleton className="h-10 w-full bg-primary/20"/>
                  <Skeleton className="h-10 w-full bg-primary/20"/>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="hidden md:block rounded-md border overflow-hidden">
          <div className="p-4">
            <div className="flex py-3 border-b">
              <Skeleton className="h-5 w-[120px] bg-primary/20"/>
              <Skeleton className="h-5 w-[120px] bg-primary/20 ml-8"/>
              <Skeleton className="h-5 w-[100px] bg-primary/20 ml-8"/>
              <Skeleton className="h-5 w-[100px] bg-primary/20 ml-auto"/>
            </div>
            {Array(6).fill(0).map((_, index) => (
              <div key={index} className="flex items-center py-4 border-b last:border-0">
                <Skeleton className="h-5 w-[120px] bg-primary/20"/>
                <Skeleton className="h-5 w-[180px] bg-primary/20 ml-8"/>
                <Skeleton className="h-6 w-[80px] bg-primary/20 ml-8"/>
                <div className="flex gap-2 ml-auto">
                  <Skeleton className="h-9 w-[180px] bg-primary/20"/>
                  <Skeleton className="h-9 w-[60px] bg-primary/20"/>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Sayfalama skeleton */}
        <div className="flex justify-center">
          <Skeleton className="h-10 w-[300px] bg-primary/20"/>
        </div>
        
        {/* Toplam sonuç skeleton */}
        <div className="flex justify-center">
          <Skeleton className="h-4 w-[100px] bg-primary/20"/>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Arama input'u (form değil) */}
        <div className="flex w-full gap-3">
          <Input 
            placeholder="İsim, soyad veya e-posta ile ara..." 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        
        {/* Rol filtresi */}
        <div className="w-full md:w-auto">
          <Select 
            onValueChange={(value: any) => handleRoleFilter(value)} 
            value={selectedRole}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Rol filtrele" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Roller</SelectItem>
              <SelectItem value={UserRole.MEMBER}>Üye</SelectItem>
              <SelectItem value={UserRole.REPRESENTATIVE}>Topluluk Temsilcisi</SelectItem>
              <SelectItem value={UserRole.ADMIN}>Yönetim Üyesi</SelectItem>
              <SelectItem value={UserRole.SUPERADMIN}>Süper Yönetici</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Mobil görünüm için kart tabanlı liste */}
      {isMobile ? (
        <div className="space-y-4">
          {users.length > 0 ? (
            users.map((user) => {
              // MongoDB _id/id dönüşümünü ele alalım
              const userId = user.id || user._id;
              const userRole = user.role as UserRole;
              
              if (!userId) {
                return null;
              }

              return (
                <Card key={userId} className="overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{user.name} {user.lastname}</h3>
                        <p className="text-sm text-muted-foreground break-all mt-1">{user.email}</p>
                      </div>
                      <Badge variant={getRoleBadgeVariant(user.role as UserRole)}>
                        {getRoleDisplayName(user.role as UserRole)}
                      </Badge>
                    </div>
                    
                    <div className="pt-2 border-t space-y-2">
                      <div className="w-full">
                        <p className="text-xs text-muted-foreground mb-1">Kullanıcı Rolü:</p>
                        <Select
                          onValueChange={(value) => handleRoleChange(userId, value as UserRole)}
                          defaultValue={user.role}
                          disabled={isUpdatingRole || !canChangeRole(userId, userRole)}
                        >
                          <SelectTrigger 
                            className="w-full" 
                            title={getRoleChangeDisabledReason(userId, userRole)}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UserRole.ADMIN}>Yönetim Üyesi</SelectItem>
                            <SelectItem value={UserRole.REPRESENTATIVE}>Topluluk Temsilcisi</SelectItem>
                            <SelectItem value={UserRole.MEMBER}>Üye</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            className="w-full flex items-center justify-center gap-2 mt-2"
                            disabled={isDeleting || !canDeleteUser(userId, userRole)}
                            title={getDeleteDisabledReason(userId, userRole)}
                          >
                            <Trash className="h-4 w-4" />
                            <span>Sil</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Kullanıcıyı Sil</AlertDialogTitle>
                            <AlertDialogDescription>
                            Bu işlemi geri alamazsınız. Bu kullanıcının hesabını silmek istediğinizden emin misiniz?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
                            <AlertDialogCancel className="w-full sm:w-auto mt-0">İptal</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                if (!userId) {
                                  toast.error("Silme işlemi başarısız", {
                                    description: "Kullanıcı kimliği eksik."
                                  });
                                  return;
                                }
                                
                                // Admin kullanıcı kontrol kısmını kaldırıyoruz veya süper admin kontrolü ekliyoruz
                                // Süper admin ise her kullanıcıyı silebilsin
                                if (userRole === UserRole.ADMIN && session?.user?.role !== UserRole.SUPERADMIN) {
                                  toast.error("Silme işlemi başarısız", {
                                    description: "Yönetim üyeleri silinemez."
                                  });
                                  return;
                                }
                                
                                handleDeleteUser(userId);
                              }}
                              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Sil
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="text-center py-8 bg-muted/30 rounded-lg">
              <p>Kullanıcı bulunamadı</p>
            </div>
          )}
        </div>
      ) : (
        /* Desktop tablo görünümü */
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">Ad Soyad</TableHead>
                <TableHead className="min-w-[120px]">E-posta</TableHead>
                <TableHead className="min-w-[100px]">Rol</TableHead>
                <TableHead className="text-right min-w-[180px]">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length > 0 ? (
                users.map((user) => {
                  // MongoDB _id/id dönüşümünü ele alalım
                  const userId = user.id || user._id;
                  const userRole = user.role as UserRole;
                  
                  if (!userId) {
                    return null;
                  }

                  return (
                    <TableRow key={userId}>
                      <TableCell className="font-medium">
                        {user.name} {user.lastname}
                      </TableCell>
                      <TableCell className="break-all">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role as UserRole)}>
                          {getRoleDisplayName(user.role as UserRole)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col sm:flex-row gap-2 justify-end items-end">
                          {/* Rol değiştirme */}
                          <Select
                            onValueChange={(value) => handleRoleChange(userId, value as UserRole)}
                            defaultValue={user.role}
                            disabled={isUpdatingRole || !canChangeRole(userId, userRole)}
                          >
                            <SelectTrigger 
                              className="w-full sm:w-[180px]" 
                              title={getRoleChangeDisabledReason(userId, userRole)}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={UserRole.ADMIN}>Yönetim Üyesi</SelectItem>
                              <SelectItem value={UserRole.REPRESENTATIVE}>Topluluk Temsilcisi</SelectItem>
                              <SelectItem value={UserRole.MEMBER}>Üye</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {/* Silme */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                            <Button 
                              variant="destructive" 
                              size="default"
                              className="w-full sm:w-auto flex items-center gap-2"
                              disabled={isDeleting || !canDeleteUser(userId, userRole)}
                              title={getDeleteDisabledReason(userId, userRole)}
                            >
                              <Trash className="h-4 w-4" />
                              <span>Sil</span>
                            </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="sm:max-w-md">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Kullanıcıyı Sil</AlertDialogTitle>
                              <AlertDialogDescription>
                              Bu işlemi geri alamazsınız. Bu kullanıcının hesabını silmek istediğinizden emin misiniz?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
                              <AlertDialogCancel className="w-full sm:w-auto mt-0">İptal</AlertDialogCancel>
                              <AlertDialogAction
                              onClick={() => {
                                if (!userId) {
                                toast.error("Silme işlemi başarısız", {
                                  description: "Kullanıcı kimliği eksik."
                                });
                                return;
                                }
                                
                                // Admin kullanıcı kontrol kısmını kaldırıyoruz veya süper admin kontrolü ekliyoruz
                                // Süper admin ise her kullanıcıyı silebilsin
                                if (userRole === UserRole.ADMIN && session?.user?.role !== UserRole.SUPERADMIN) {
                                  toast.error("Silme işlemi başarısız", {
                                    description: "Yönetim üyeleri silinemez."
                                  });
                                  return;
                                }
                                
                                handleDeleteUser(userId);
                              }}
                              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                              Sil
                              </AlertDialogAction>
                            </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6">
                    Kullanıcı bulunamadı
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
      
      {/* Sayfalama - Mobil için optimize edilmiş */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent className="flex-wrap justify-center">
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                // Mobilde sadece aktif sayfa ve komşu sayfaları göster
                const windowSize = isMobile ? 0 : 2;
                return Math.abs(page - currentPage) <= windowSize || page === 1 || page === totalPages;
              })
              .map((page, index, array) => {
                // Ellipsis ekleyelim
                const showEllipsisBefore = index > 0 && array[index - 1] !== page - 1;
                const showEllipsisAfter = index < array.length - 1 && array[index + 1] !== page + 1;
                
                return (
                  <div key={page} className="flex items-center">
                    {showEllipsisBefore && <span className="px-2">...</span>}
                    
                    <PaginationItem>
                      <Button
                        variant={currentPage === page ? "default" : "outline"}
                        size="icon"
                        onClick={() => handlePageChange(page)}
                        className="h-8 w-8"
                      >
                        {page}
                      </Button>
                    </PaginationItem>
                    
                    {showEllipsisAfter && <span className="px-2">...</span>}
                  </div>
                );
              })}
            
            <PaginationItem>
              <PaginationNext 
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
      
      {/* Toplam sonuç */}
      <p className="text-sm text-muted-foreground text-center">
        Toplam {totalUsers} kullanıcı
      </p>
    </div>
  );
}
