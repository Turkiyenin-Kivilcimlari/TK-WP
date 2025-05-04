"use client";

import { UserRole } from "@/models/User";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, User, Upload } from "lucide-react";
import api from "@/lib/api";
import Link from "next/link";
import { useUploadImage } from '@/hooks/useUploadImage';
import Image from 'next/image';
import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { emitProfileUpdated } from '@/lib/events';
import { Checkbox } from "@/components/ui/checkbox";


export default function ProfileContent() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    lastname: "",
    phone: "",
    avatar: "",
    allowEmails: false,
  });
  
  const { uploadImage, isUploading, deleteImage, isDeleting } = useUploadImage();

  // Kullanıcı verilerini al
  const { data: userData, isLoading, refetch } = useQuery({
    queryKey: ["user-profile", session?.user?.id], // Use ID instead of email for better caching
    queryFn: async () => {
      if (!session?.user) throw new Error("Kullanıcı bulunamadı");
      try {
        const response = await api.get(`/users/me`);
        return response.data.user;
      } catch (error: any) {
        toast.error("Profil bilgileri alınamadı", {
          description: "Bir hata oluştu."
        });
        throw error;
      }
    },
    enabled: !!session?.user, // Only run query when session exists
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // userData değiştiğinde formData'yı güncelle
  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name || "",
        lastname: userData.lastname || "",
        phone: userData.phone || "",
        avatar: userData.avatar || "",
        allowEmails: userData.allowEmails !== undefined ? userData.allowEmails : true,
      });
    }
  }, [userData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, allowEmails: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.lastname) {
      toast.error("Eksik bilgi", {
        description: "Ad ve soyad alanları doldurulmalıdır."
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.put(`/users/me`, formData);
      
      // Session'ı güncelle
      await updateSession({
        ...session,
        user: {
          ...session?.user,
          name: formData.name,
          lastname: formData.lastname,
          avatar: formData.avatar
        }
      });
      
      // Profil güncellemesini bildir
      emitProfileUpdated({
        id: session?.user?.id,
        name: formData.name,
        lastname: formData.lastname,
        avatar: formData.avatar
      });
      
      // Uygulama genelinde oturum yenilemesini tetikleyelim
      router.refresh();
      
      toast.success("Profil güncellendi", {
        description: "Profil bilgileriniz başarıyla güncellendi."
      });
      await refetch();
      setIsEditing(false);
    } catch (error: any) {
      toast.error("Hata", {
        description: "Profil güncellenemedi."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resim yükleme işleyicisi
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Dosya boyutu kontrolü (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Dosya boyutu çok büyük", {
        description: "Lütfen 5MB'dan küçük bir resim seçin."
      });
      return;
    }

    // Dosya türü kontrolü
    if (!file.type.startsWith('image/')) {
      toast.error("Geçersiz dosya türü", {
        description: "Lütfen bir resim dosyası seçin."
      });
      return;
    }

    const loadingToast = toast.loading("Fotoğraf yükleniyor...");

    try {
      // Yükleme öncesi bir önizleme oluştur (opsiyonel)
      const localPreviewUrl = URL.createObjectURL(file);
      
      // Resmi yükle
      // Define interfaces
      interface ProfileImage {
        success: boolean;
        url: string;
      }

      interface ProfileUpdateData {
        id?: string;
        name?: string;
        lastname?: string;
        avatar?: string;
      }

            try {
              uploadImage(file, {
                onSuccess: async (data: ProfileImage) => {
                  if (data.success && data.url) {
                    
                    try {
                      // Form state'ini API'ye güncellenmeden önce güncelle 
                      // Bu sayede kullanıcı anında değişikliği görecek
                      setFormData(prev => ({ ...prev, avatar: data.url }));
                      
                      // Ayrıca veritabanına da kaydet
                      const updateResponse = await api.put(`/users/me`, { 
                        ...formData, 
                        avatar: data.url 
                      });
                      
                      
                      // Session'ı güncelle
                      await updateSession({
                        ...session,
                        user: {
                          ...session?.user,
                          avatar: data.url
                        }
                      });
                      
                      // Profil avatar güncellemesini bildir
                      emitProfileUpdated({
                        id: session?.user?.id,
                        name: userData?.name,
                        lastname: userData?.lastname,
                        avatar: data.url
                      } as ProfileUpdateData);
                      
                      // Verileri yeniden yükle
                      await refetch();
                      
                      toast.success("Resim yüklendi", {
                        description: "Profil fotoğrafı başarıyla yüklendi."
                      });
                    } catch (updateError: unknown) {
                      toast.error("Resim yüklendi ancak profiliniz güncellenemedi", {
                        description: "Lütfen sayfayı yenileyip tekrar deneyin."
                      });
                    }
                  } else {
                    toast.error("Resim yüklenirken bir hata oluştu", {
                      description: "Sunucu yanıtında URL bilgisi eksik"
                    });
                  }
                }
              });
            } catch (uploadError) {
              toast.error("Resim yüklenemedi", {
                description: "Bir hata oluştu. Lütfen tekrar deneyin."
              });
            }
    } catch (error) {
      toast.error("Resim yüklenemedi", {
        description: "Bir hata oluştu. Lütfen tekrar deneyin."
      });
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  // Profil fotoğrafını kaldırma işleyicisi
  const handleRemoveImage = async () => {
    // Mevcut avatar URL'si var mı kontrol et
    if (!formData.avatar) {
      return;
    }
    
    const loadingToast = toast.loading("Profil fotoğrafı kaldırılıyor...");
    
    try {
      // Bu adımları sırayla dene ve hata olursa loglayıp devam et
      
      // Eski avatar URL'sini saklayalım
      const oldAvatarUrl = formData.avatar;
      
      // 1. Önce veritabanındaki kayıttan temizleyelim, bu en önemli adım
      try {
        
        // Ekstra alan ekleyerek güncelleyelim ki istek farklı olsun
        const updateResponse = await api.put(`/users/me`, { 
          ...formData, 
          avatar: "",
          _avatarRemoved: true // Sunucu tarafında avatar'ın kasıtlı olarak boşaltıldığını belirtmek için
        });
        
        
        if (!updateResponse.data.success) {
          toast.error("İşleminiz yapılırken bir hata oluştu")
        }
        
        // Form state'ini güncelleyelim ki UI hemen değişsin
        setFormData(prev => ({ ...prev, avatar: "" }));
        
        // Session'ı güncelle
        await updateSession({
          ...session,
          user: {
            ...session?.user,
            avatar: ""
          }
        });

        // Profil avatar kaldırıldığını bildir
        emitProfileUpdated({
          id: session?.user?.id,
          name: userData?.name,
          lastname: userData?.lastname,
          avatar: ""
        });
        
      } catch (dbError) {
        toast.error("İşlem sırasında bir hata oluştu");
      }
      
      // 2. Şimdi Cloudinary'den dosyayı silmeyi deneyelim
      // Bu adım başarısız olsa bile kullanıcı deneyimi bozulmasın
      try {
        const cloudinaryResponse = await deleteImage(oldAvatarUrl);
      } catch (cloudinaryError) {
        // Bu hatayı sadece loglayalım, kritik değil

      }
      
      // 3. Son kontrol - veriler gerçekten güncellenmiş mi kontrol edelim
      try {
        // Önbelleği temizleyerek güncel veri alalım
        const freshData = await refetch();
        
      } catch (refetchError) {
        toast.error("İşlem sırasında bir hata oluştu");
      }
      
      // Başarı mesajı göster
      toast.success("Profil fotoğrafı kaldırıldı");
      
    } catch (error: any) {
      toast.error("Hata", {
        description: "Profil fotoğrafı kaldırılamadı."
      });
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // Kullanıcı rolü kontrolü - session veya userData'dan alır
  const userRole = userData?.role || session?.user?.role;
  const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.SUPERADMIN;

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Hesap Bilgilerim</CardTitle>
          <CardDescription>
            Kişisel bilgilerinizi görüntüleyin ve güncelleyin
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Profil Fotoğrafı */}
            <div className="flex flex-col items-center space-y-4 mb-6">
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-primary/20">
                {formData.avatar ? (
                  <Image
                    src={formData.avatar}
                    alt="Profil Fotoğrafı"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full bg-muted">
                    <User className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              {isEditing && (
                <div className="flex flex-col items-center">
                  <Button
                    type="button" 
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-2"
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="h-4 w-4" />
                    <span>{formData.avatar ? 'Fotoğrafı değiştir' : 'Fotoğraf yükle'}</span>
                  </Button>
                  <Input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={!isEditing || isUploading}
                  />
                  {isUploading && (
                    <div className="text-xs text-muted-foreground mt-1 flex items-center">
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      Yükleniyor...
                    </div>
                  )}
                  {formData.avatar && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground mt-2"
                      onClick={handleRemoveImage}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            Kaldırılıyor...
                          </>
                        ) : (
                        "Fotoğrafı kaldır"
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Ad</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={!isEditing || isSubmitting}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastname">Soyad</Label>
                <Input
                  id="lastname"
                  name="lastname"
                  value={formData.lastname}
                  onChange={handleChange}
                  disabled={!isEditing || isSubmitting}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                value={userData?.email || session?.user?.email || ""}
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={!isEditing || isSubmitting}
                placeholder="Telefon numarası"
              />
            </div>

            {/* E-posta izni için checkbox ekle */}
            {isEditing && (
              <div className="flex items-center space-x-2 mt-4">
                <Checkbox 
                  id="allowEmails" 
                  checked={formData.allowEmails}
                  onCheckedChange={handleCheckboxChange}
                  disabled={isSubmitting}
                />
                <Label 
                  htmlFor="allowEmails" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Bilgilendirme e-postaları almak istiyorum
                </Label>
              </div>
            )}
            
            {!isEditing && (
              <div className="text-sm">
                <p>
                  <strong>E-posta bildirimleri:</strong>{' '}
                  <span className={formData.allowEmails ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                    {formData.allowEmails ? "Açık" : "Kapalı"}
                  </span>
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            {isEditing ? (
              <>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditing(false)}
                  disabled={isSubmitting}
                >
                  İptal
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    "Kaydet"
                  )}
                </Button>
              </>
            ) : (
              <Button 
                type="button" 
                onClick={() => setIsEditing(true)}
              >
                Düzenle
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
