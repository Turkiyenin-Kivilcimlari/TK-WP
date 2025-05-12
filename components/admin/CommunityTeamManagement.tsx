"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash, UserPlus, Image as ImageIcon, Pencil } from "lucide-react";
import { ICommunityTeamMember } from "@/models/CommunityTeam";
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
} from "@/components/ui/alert-dialog";
import { useUsers } from "@/hooks/useUsers";
import { useUploadImage } from "@/hooks/useUploadImage";
import Image from "next/image";

export function CommunityTeamManagement() {
  const [teamMembers, setTeamMembers] = useState<ICommunityTeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedMemberIdToDelete, setSelectedMemberIdToDelete] = useState<string>("");
  const [title, setTitle] = useState("");
  const [university, setUniversity] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photo, setPhoto] = useState("");
  const [universityLogo, setUniversityLogo] = useState("");
  const [universityLogoPreview, setUniversityLogoPreview] = useState("");

  // Cloudinary yükleme hook'u
  const { uploadImage, deleteImage, isUploading, isDeleting } = useUploadImage();

  // Kullanıcıları getir
  const { users, isLoading: isLoadingUsers } = useUsers({
    limit: 50,
  });

  const fetchTeamMembers = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/api/admin/community-team");
      setTeamMembers(response.data.teamMembers);
    } catch (error) {
      toast.error("Takım üyeleri yüklenemedi");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  // Resim yükleme işlemi
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Dosya boyutu çok büyük", {
        description: "Lütfen 5MB'dan küçük bir resim seçin.",
      });
      return;
    }

    try {
      // Yeni görseli yükle
      const result = await uploadImage(file, {
        folder: "community_team",
        onSuccess: (data) => {
          if (data && data.success) {
            setPhoto(data.url);
            setPhotoPreview(data.url);
            toast.success("Görsel yüklendi");
          }
        },
      });

      if (!result.success) {
        toast.error("Görsel yüklenemedi", {
          description: result.message,
        });
      }
    } catch (error) {
      toast.error("Görsel yüklenemedi");
    }
  };

  // Üniversite logosu yükleme işlemi
  const handleUniversityLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Geçersiz dosya türü", {
        description: "Lütfen bir resim dosyası seçin.",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Dosya boyutu çok büyük", {
        description: "Lütfen 5MB'dan küçük bir resim seçin.",
      });
      return;
    }

    try {
      // Yeni görseli yükle
      const result = await uploadImage(file, {
        folder: "university_logos",
        onSuccess: (data) => {
          if (data && data.success) {
            setUniversityLogo(data.url);
            setUniversityLogoPreview(data.url);
            toast.success("Üniversite logosu yüklendi");
          }
        },
      });

      if (!result.success) {
        toast.error("Üniversite logosu yüklenemedi", {
          description: result.message,
        });
      }
    } catch (error) {
      toast.error("Üniversite logosu yüklenemedi");
    }
  };

  // Form sıfırlama
  const resetForm = () => {
    setSelectedUserId("");
    setSelectedMemberId("");
    setTitle("");
    setUniversity("");
    setPhoto("");
    setPhotoPreview("");
    setUniversityLogo("");
    setUniversityLogoPreview("");
  };

  // Düzenleme için üye verilerini yükleme - düzeltilmiş versiyonu
  const loadMemberForEdit = (member: ICommunityTeamMember) => {
    try {
      console.log("Düzenlenecek üye:", member); // Debug için ekleyelim

      // ID ve diğer alanları doğru bir şekilde ayarlayalım
      setSelectedMemberId(String(member._id || member.id || "")); // _id veya id alanını kullan
      setSelectedUserId(String(member.userId || ""));
      setTitle(member.title || "");
      setUniversity(member.university || "");
      setPhoto(member.photo || "");
      setPhotoPreview(member.photo || "");
      setUniversityLogo(member.universityLogo || "");
      setUniversityLogoPreview(member.universityLogo || "");

      // Değerleri yazarak kontrol edelim
      console.log("Form değerleri ayarlandı:", {
        selectedMemberId: String(member._id || member.id || ""),
        selectedUserId: String(member.userId || ""),
        title: member.title || "",
        university: member.university || "",
        photo: member.photo || "",
        universityLogo: member.universityLogo || "",
      });

      setEditDialogOpen(true);
    } catch (err) {
      console.error("Üye verilerini yükleme hatası:", err);
      toast.error("Üye bilgileri yüklenirken bir hata oluştu");
    }
  };

  // Üye ekleme
  const handleAddMember = async () => {
    if (!selectedUserId || !title) {
      toast.error("Lütfen kullanıcı ve unvan alanlarını doldurun");
      return;
    }

    try {
      setIsAdding(true);
      const response = await api.post("/api/admin/community-team", {
        userId: selectedUserId,
        title: title,
        university: university,
        photo: photo,
        universityLogo: universityLogo,
      });

      if (response.data.success) {
        toast.success("Topluluk temsilcisi başarıyla eklendi");
        setAddDialogOpen(false);
        resetForm();
        fetchTeamMembers();
      } else {
        toast.error(response.data.message || "Üye eklenirken bir hata oluştu");
      }
    } catch (error) {
      toast.error("Üye eklenirken bir hata oluştu");
    } finally {
      setIsAdding(false);
    }
  };

  // Üye düzenleme
  const handleEditMember = async () => {
    if (!selectedMemberId || !title) {
      toast.error("Lütfen unvan alanını doldurun");
      return;
    }

    try {
      setIsEditing(true);

      // Console'a hangi verileri gönderdiğimizi yazdıralım (debug için)
      console.log("Güncellenecek veriler:", {
        memberId: selectedMemberId,
        title,
        university,
        photo,
        universityLogo,
      });

      const response = await api.put(`/api/admin/community-team/${selectedMemberId}`, {
        title,
        university,
        photo,
        universityLogo,
      });

      if (response.data.success) {
        toast.success("Topluluk temsilcisi başarıyla güncellendi");
        setEditDialogOpen(false);
        resetForm();
        fetchTeamMembers(); // Güncel listeyi yeniden yükle
      } else {
        toast.error(response.data.message || "Üye güncellenirken bir hata oluştu");
        console.error("Güncelleme hatası:", response.data);
      }
    } catch (error) {
      console.error("Güncelleme hatası:", error);
      toast.error("Üye güncellenirken bir hata oluştu");
    } finally {
      setIsEditing(false);
    }
  };

  // Üye silme
  const handleRemoveMember = async (id: string) => {
    if (!id) return;

    setSelectedMemberIdToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedMemberIdToDelete) return;

    try {
      // Önce üye bilgilerini al
      const member = teamMembers.find((m) => m._id === selectedMemberIdToDelete);

      const response = await api.delete(`/api/admin/community-team/${selectedMemberIdToDelete}`);

      if (response.data.success) {
        // Eğer üyenin resmi varsa Cloudinary'den sil
        if (member?.photo) {
          try {
            await deleteImage(member.photo);
          } catch (error) {
            console.error("Resim silinirken bir hata oluştu:", error);
          }
        }

        // Üniversite logosu varsa Cloudinary'den sil
        if (member?.universityLogo) {
          try {
            await deleteImage(member.universityLogo);
          } catch (error) {
            console.error("Üniversite logosu silinirken bir hata oluştu:", error);
          }
        }

        toast.success("Topluluk temsilcisi başarıyla silindi");
        setDeleteDialogOpen(false);
        fetchTeamMembers();
      } else {
        toast.error(response.data.message || "Üye silinirken bir hata oluştu");
      }
    } catch (error) {
      toast.error("Üye silinirken bir hata oluştu");
    }
  };

  // Kullanıcı baş harflerini al
  const getUserInitials = (name: string, lastname: string) => {
    const firstInitial = name ? name.charAt(0).toUpperCase() : "";
    const lastInitial = lastname ? lastname.charAt(0).toUpperCase() : "";
    return `${firstInitial}${lastInitial}`;
  };

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Topluluk Temsilcileri</span>
            <Button onClick={() => setAddDialogOpen(true)} className="flex items-center">
              <UserPlus className="h-4 w-4 mr-2" />
              Üye Ekle
            </Button>
          </CardTitle>
          <CardDescription>
            Tüm temsilcileri görüntüleyin ve yönetin.
          </CardDescription>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="w-full mb-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-primary/20 animate-pulse"></div>
                    <div>
                      <div className="h-5 bg-primary/20 rounded w-32 animate-pulse"></div>
                      <div className="h-4 bg-primary/20 rounded w-24 mt-2 animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {teamMembers.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">Henüz ekip üyesi eklenmemiş.</p>
              <Button variant="outline" onClick={() => setAddDialogOpen(true)} className="mt-4">
                <UserPlus className="h-4 w-4 mr-2" />
                Üye Ekle
              </Button>
            </div>
          ) : (
            teamMembers.map((member) => (
              <Card key={String(member._id)} className="w-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Önce özel fotoğrafı göster, yoksa avatar'ı göster */}
                      {member.photo ? (
                        <div className="relative h-14 w-14 rounded-full overflow-hidden">
                          <Image
                            src={member.photo}
                            alt={member.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <Avatar className="h-14 w-14">
                          <AvatarImage src={member.avatar} alt={member.name} />
                          <AvatarFallback>{getUserInitials(member.name, member.lastname)}</AvatarFallback>
                        </Avatar>
                      )}
                      <div>
                        <CardTitle className="text-lg">
                          {member.name} {member.lastname}
                        </CardTitle>
                        <CardDescription>{member.title}</CardDescription>
                        <div className="flex items-center mt-1 gap-2">
                          {/* Üniversite logosu görüntüleme - boyutu artırıldı */}
                          {member.universityLogo && (
                            <div className="relative h-8 w-8 mr-1">
                              <Image
                                src={member.universityLogo}
                                alt={`${member.university || "Üniversite"} logosu`}
                                width={32}
                                height={32}
                                className="object-contain"
                              />
                            </div>
                          )}
                          {member.university && (
                            <p className="text-xs text-muted-foreground">{member.university}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Düzenleme butonu */}
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => loadMemberForEdit(member)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-red-500"
                        onClick={() => handleRemoveMember(member._id as string)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Üye Ekleme Dialogu */}
      <Dialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Topluluk Temsilcisi Ekle</DialogTitle>
            <DialogDescription>
              Topluluk tesmilcilerine bir üye eklemek için kullanıcı bilgilerini girin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="userId" className="mb-1 block">
                  Kullanıcı
                </Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kullanıcı seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingUsers ? (
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Yükleniyor...
                      </div>
                    ) : (
                      users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} {user.lastname}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="title" className="mb-1 block">
                  Unvan
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn: Frontend Geliştirici"
                />
              </div>

              <div>
                <Label htmlFor="university" className="mb-1 block">
                  Üniversite
                </Label>
                <Input
                  id="university"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  placeholder="Örn: İstanbul Teknik Üniversitesi"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false);
                resetForm();
              }}
            >
              İptal
            </Button>
            <Button onClick={handleAddMember} disabled={isAdding || isUploading}>
              {isAdding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ekleniyor...
                </>
              ) : (
                "Ekle"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Üye Düzenleme Dialogu */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetForm();
          }
          setEditDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Topluluk Temsilcisini Düzenle</DialogTitle>
            <DialogDescription>
              Topluluk temsilcisinin bilgilerini güncelleyin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="title" className="mb-1 block">
                  Unvan
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn: Frontend Geliştirici"
                />
              </div>

              <div>
                <Label htmlFor="university" className="mb-1 block">
                  Üniversite
                </Label>
                <Input
                  id="university"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  placeholder="Örn: İstanbul Teknik Üniversitesi"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="photo" className="mb-1 block">
                  Fotoğraf
                </Label>
                
                {photoPreview ? (
                  <div className="relative border rounded-md overflow-hidden p-2">
                    <Image
                      src={photoPreview}
                      alt="Üye fotoğrafı"
                      width={200}
                      height={200}
                      className="mx-auto object-contain max-h-[200px]"
                    />
                    <div className="flex justify-end mt-2 space-x-2">
                      <Button 
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          document.getElementById('photo-upload-edit')?.click();
                        }}
                      >
                        Değiştir
                      </Button>
                      <Button 
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                          if (photo) {
                            try {
                              await deleteImage(photo);
                              setPhoto("");
                              setPhotoPreview("");
                              toast.success("Fotoğraf kaldırıldı");
                            } catch (error) {
                              toast.error("Fotoğraf kaldırılamadı");
                            }
                          }
                        }}
                        disabled={isDeleting || !photo}
                      >
                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kaldır"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="border-2 border-dashed rounded-md p-8 flex flex-col items-center justify-center gap-4 cursor-pointer"
                    onClick={() => document.getElementById('photo-upload-edit')?.click()}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Yükleniyor...</p>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-10 w-10 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground text-center">
                          Fotoğraf yüklemek için tıklayın veya sürükleyin
                        </p>
                        <Button variant="outline" type="button" size="sm">
                          Fotoğraf Seç
                        </Button>
                      </>
                    )}
                  </div>
                )}
                <Input
                  id="photo-upload-edit"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="universityLogo" className="mb-1 block">
                  Üniversite Logosu
                </Label>
                
                {universityLogoPreview ? (
                  <div className="relative border rounded-md overflow-hidden p-2">
                    <Image
                      src={universityLogoPreview}
                      alt="Üniversite logosu"
                      width={200}
                      height={200}
                      className="mx-auto object-contain max-h-[150px]"
                    />
                    <div className="flex justify-end mt-2 space-x-2">
                      <Button 
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          document.getElementById('university-logo-upload-edit')?.click();
                        }}
                      >
                        Değiştir
                      </Button>
                      <Button 
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                          if (universityLogo) {
                            try {
                              await deleteImage(universityLogo);
                              setUniversityLogo("");
                              setUniversityLogoPreview("");
                              toast.success("Üniversite logosu kaldırıldı");
                            } catch (error) {
                              toast.error("Üniversite logosu kaldırılamadı");
                            }
                          }
                        }}
                        disabled={isDeleting || !universityLogo}
                      >
                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kaldır"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center gap-2 cursor-pointer"
                    onClick={() => document.getElementById('university-logo-upload-edit')?.click()}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Yükleniyor...</p>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-10 w-10 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground text-center">
                          Üniversite logosu yüklemek için tıklayın
                        </p>
                        <Button variant="outline" type="button" size="sm">
                          Logo Seç
                        </Button>
                      </>
                    )}
                  </div>
                )}
                <Input
                  id="university-logo-upload-edit"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUniversityLogoChange}
                  disabled={isUploading}
                />
                <p className="text-xs text-muted-foreground">
                  Önerilen: Şeffaf arka plana sahip PNG formatında logo (maksimum 5MB)
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                resetForm();
              }}
              type="button"
            >
              İptal
            </Button>
            <Button
              onClick={handleEditMember}
              disabled={isEditing || isUploading || !title}
              type="button"
            >
              {isEditing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Güncelleniyor...
                </>
              ) : (
                "Güncelle"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Temsilciyi Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu temsilciyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Evet, Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
