"use client";

import { UserRole } from "@/models/User";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
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
import { Textarea } from "@/components/ui/textarea";

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
    slug: "",
    about: "",
    title: "",
  });

  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [isSlugTaken, setIsSlugTaken] = useState(false);
  const slugCheckTimeout = useRef<NodeJS.Timeout | null>(null);

  const { uploadImage, isUploading, deleteImage, isDeleting } = useUploadImage();

  const { data: userData, isLoading, refetch } = useQuery({
    queryKey: ["user-profile", session?.user?.id],
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
    enabled: !!session?.user,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name || "",
        lastname: userData.lastname || "",
        phone: userData.phone || "",
        avatar: userData.avatar || "",
        allowEmails: userData.allowEmails !== undefined ? userData.allowEmails : true,
        slug: userData.slug || "",
        about: userData.about || "",
        title: userData.title || "",
      });
    }
  }, [userData]);

  const handleCancel = () => {
    if (userData) {
      setFormData({
        name: userData.name || "",
        lastname: userData.lastname || "",
        phone: userData.phone || "",
        avatar: userData.avatar || "",
        allowEmails: userData.allowEmails !== undefined ? userData.allowEmails : true,
        slug: userData.slug || "",
        about: userData.about || "",
        title: userData.title || "",
      });
    }
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const filteredValue = value
      .replace(/\d/g, "")
      .replace(/\s{2,}/g, " ");
    setFormData((prev) => ({ ...prev, title: filteredValue }));
  };

  const handleNameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const onlyLetters = value.replace(/[^A-Za-zğüşıöçĞÜŞİÖÇ\s]/g, '');
    const capitalized = onlyLetters.replace(/(^|\s)([a-zğüşıöç])/g, function(match) {
      return match.toUpperCase();
    });
    setFormData((prev) => ({ ...prev, [name]: capitalized }));
  };

  const checkSlugAvailability = async (slug: string) => {
    if (!slug || slug.length < 3) {
      setIsSlugTaken(false);
      return;
    }

    try {
      setIsCheckingSlug(true);
      const response = await api.get(`/api/check-slug?slug=${encodeURIComponent(slug)}`);

      if (response.data.taken && response.data.userId !== session?.user?.id) {
        setIsSlugTaken(true);
        toast.error("Bu profil URL'si zaten kullanımda", {
          description: "Lütfen farklı bir URL seçin",
        });
      } else {
        setIsSlugTaken(false);
      }
    } catch (error) {
      setIsSlugTaken(false);
    } finally {
      setIsCheckingSlug(false);
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Check if the user is trying to input consecutive hyphens
    if (value.includes('--')) {
      // Just return the current value with normalized hyphens to prevent consecutive hyphens
      const normalizedValue = formData.slug.replace(/-+/g, '-');
      return;
    }

    // Directly handle hyphen input specially
    const lastChar = value.charAt(value.length - 1);
    if (lastChar === '-' && formData.slug === value.slice(0, -1)) {
      // Only allow hyphen if previous character is not also a hyphen
      const previousChar = formData.slug.charAt(formData.slug.length - 1);
      if (previousChar !== '-') {
        setFormData((prev) => ({ ...prev, slug: value }));
        
        if (slugCheckTimeout.current) {
          clearTimeout(slugCheckTimeout.current);
        }
        
        if (value && value !== userData?.slug) {
          slugCheckTimeout.current = setTimeout(() => {
            checkSlugAvailability(value);
          }, 500);
        }
      }
      return;
    }

    const turkishCharsMap: Record<string, string> = {
      'ğ': 'g', 'ü': 'u', 'ş': 's', 'ı': 'i', 'ö': 'o', 'ç': 'c',
      'Ğ': 'g', 'Ü': 'u', 'Ş': 's', 'İ': 'i', 'Ö': 'o', 'Ç': 'c'
    };

    let normalized = value
      .toLowerCase()
      .replace(/[üşıöçğÜŞİÖÇĞ]/g, char => turkishCharsMap[char] || char);

    normalized = normalized
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9_-]/g, "") 
      .replace(/-+/g, "-")  // This consolidates multiple hyphens into one
      .replace(/^-+|-+$/g, "");

    setFormData((prev) => ({ ...prev, slug: normalized }));

    if (slugCheckTimeout.current) {
      clearTimeout(slugCheckTimeout.current);
    }

    if (normalized && normalized !== userData?.slug) {
      slugCheckTimeout.current = setTimeout(() => {
        checkSlugAvailability(normalized);
      }, 500);
    }
  };

  useEffect(() => {
    return () => {
      if (slugCheckTimeout.current) {
        clearTimeout(slugCheckTimeout.current);
      }
    };
  }, []);

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const validChars = value.replace(/[^\d+() ]/g, "");
    const singleSpaces = validChars.replace(/\s+/g, " ");
    let formattedNumber = "";
    let lastCharWasDigit = false;
    let lastCharWasSpace = false;

    for (let i = 0; i < singleSpaces.length; i++) {
      const char = singleSpaces[i];

      if (/\d/.test(char)) {
        formattedNumber += char;
        lastCharWasDigit = true;
        lastCharWasSpace = false;
      } else if (char === " ") {
        if (lastCharWasDigit && !lastCharWasSpace) {
          formattedNumber += char;
          lastCharWasSpace = true;
          lastCharWasDigit = false;
        }
      } else {
        formattedNumber += char;
        lastCharWasDigit = false;
        lastCharWasSpace = false;
      }
    }

    setFormData((prev) => ({ ...prev, phone: formattedNumber }));
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

    if (isCheckingSlug) {
      toast.error("Lütfen bekleyin", {
        description: "Profil URL'si kontrol ediliyor"
      });
      return;
    }

    if (isSlugTaken) {
      toast.error("Bu profil URL'si zaten kullanımda", {
        description: "Lütfen farklı bir URL seçin"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.put(`/users/me`, formData);

      await updateSession({
        ...session,
        user: {
          ...session?.user,
          name: formData.name,
          lastname: formData.lastname,
          avatar: formData.avatar
        }
      });

      emitProfileUpdated({
        id: session?.user?.id,
        name: formData.name,
        lastname: formData.lastname,
        avatar: formData.avatar
      });

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Dosya boyutu çok büyük", {
        description: "Lütfen 5MB'dan küçük bir resim seçin."
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error("Geçersiz dosya türü", {
        description: "Lütfen bir resim dosyası seçin."
      });
      return;
    }

    const loadingToast = toast.loading("Fotoğraf yükleniyor...");

    try {
      const localPreviewUrl = URL.createObjectURL(file);

      try {
        uploadImage(file, {
          onSuccess: async (data: { success: boolean; url: string }) => {
            if (data.success && data.url) {
              try {
                setFormData(prev => ({ ...prev, avatar: data.url }));

                const updateResponse = await api.put(`/users/me`, {
                  ...formData,
                  avatar: data.url
                });

                await updateSession({
                  ...session,
                  user: {
                    ...session?.user,
                    avatar: data.url
                  }
                });

                emitProfileUpdated({
                  id: session?.user?.id,
                  name: userData?.name,
                  lastname: userData?.lastname,
                  avatar: data.url
                });

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

  const handleRemoveImage = async () => {
    if (!formData.avatar) {
      return;
    }

    const loadingToast = toast.loading("Profil fotoğrafı kaldırılıyor...");

    try {
      const oldAvatarUrl = formData.avatar;

      try {
        const updateResponse = await api.put(`/users/me`, {
          ...formData,
          avatar: "",
          _avatarRemoved: true
        });

        if (!updateResponse.data.success) {
          toast.error("İşleminiz yapılırken bir hata oluştu")
        }

        setFormData(prev => ({ ...prev, avatar: "" }));

        await updateSession({
          ...session,
          user: {
            ...session?.user,
            avatar: ""
          }
        });

        emitProfileUpdated({
          id: session?.user?.id,
          name: userData?.name,
          lastname: userData?.lastname,
          avatar: ""
        });

      } catch (dbError) {
        toast.error("İşlem sırasında bir hata oluştu");
      }

      try {
        const cloudinaryResponse = await deleteImage(oldAvatarUrl);
      } catch (cloudinaryError) {
      }

      try {
        const freshData = await refetch();

      } catch (refetchError) {
        toast.error("İşlem sırasında bir hata oluştu");
      }

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
                  onChange={handleNameInput}
                  disabled={!isEditing || isSubmitting}
                  required
                />
                {isEditing && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Sadece harf ve boşluk kullanılabilir
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastname">Soyad</Label>
                <Input
                  id="lastname"
                  name="lastname"
                  value={formData.lastname}
                  onChange={handleNameInput}
                  disabled={!isEditing || isSubmitting}
                  required
                />
                {isEditing && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Sadece harf ve boşluk kullanılabilir
                  </p>
                )}
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
                onChange={handlePhoneNumberChange}
                disabled={!isEditing || isSubmitting}
                placeholder="Telefon numarası"
              />
              {isEditing && (
                <p className="text-xs text-muted-foreground mt-1">
                  Sadece rakam, +, (), ve boşluk kullanılabilir
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="slug">Profil URL'si</Label>
                {isEditing && (
                  <span className="text-xs text-muted-foreground">
                    * Profil adresiniz: {window && `${window.location.origin}/u/${formData.slug || 'kullanici'}`}
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  id="slug"
                  name="slug"
                  value={formData.slug}
                  onChange={handleSlugChange}
                  disabled={!isEditing || isSubmitting}
                  placeholder="profil-adresi"
                  className={`font-mono text-sm ${isSlugTaken ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
                {isCheckingSlug && (
                  <div className="absolute right-3 top-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
              {isEditing && (
                <p className="text-xs text-muted-foreground mt-1">
                  Sadece küçük harfler, rakamlar ve kısa çizgiler kullanabilirsiniz. Boş bırakırsanız otomatik oluşturulur.
                  {isSlugTaken && <span className="text-red-500 block mt-1">Bu profil URL'si başka bir kullanıcı tarafından kullanılıyor.</span>}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Unvan</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleTitleChange}
                placeholder="Unvanınız (örn: Yazılım Geliştirici, Öğrenci)"
                disabled={!isEditing}
              />
              {isEditing && (
                <p className="text-xs text-muted-foreground mt-1">
                  Sadece harf ve tek boşluk kullanılabilir, sayı kullanılamaz
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="about">Hakkında</Label>
                <span className="text-xs text-muted-foreground">
                  {formData.about?.length || 0}/1000 karakter
                </span>
              </div>
              <Textarea
                id="about"
                name="about"
                value={formData.about}
                onChange={(e) => setFormData((prev) => ({ ...prev, about: e.target.value }))}
                disabled={!isEditing || isSubmitting}
                placeholder="Kendiniz hakkında kısa bilgi..."
                rows={7}
                maxLength={1000}
                className="resize-y min-h-[100px]"
              />
              {isEditing && (
                <p className="text-xs text-muted-foreground mt-1">
                  Profilinizde görünecek kısa bir biyografi yazabilirsiniz. Alanı büyütmek için sağ alt köşesinden sürükleyebilirsiniz. 
                  Maksimum 1000 karakter yazabilirsiniz.
                </p>
              )}
            </div>

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
                  onClick={handleCancel}
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
