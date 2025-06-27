"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Loader2,
  Plus,
  Trash,
  ArrowUp,
  ArrowDown,
  ImageIcon,
  Pencil,
} from "lucide-react";
import { ISupporter } from "@/models/Supporter";
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
import Image from "next/image";
import { useUploadImage } from "@/hooks/useUploadImage";
import { Skeleton } from "@/components/ui/skeleton";

export function SupportersManagement() {
  const [supporters, setSupporters] = useState<ISupporter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSupporterId, setSelectedSupporterId] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [photo, setPhoto] = useState<string>("");
  const [photoPreview, setPhotoPreview] = useState<string>("");

  const { uploadImage, deleteImage, isUploading, isDeleting } =
    useUploadImage();

  const fetchSupporters = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/api/admin/supporters");

      // Sort supporters by their order field
      const sortedSupporters = response.data.supporters.sort(
        (a: any, b: any) => {
          if (a.order === b.order) {
            return a._id.localeCompare(b._id);
          }
          return (
            (a.order || Number.MAX_SAFE_INTEGER) -
            (b.order || Number.MAX_SAFE_INTEGER)
          );
        }
      );

      setSupporters(sortedSupporters);
    } catch (error) {
      toast.error("Destekçi verileri yüklenemedi");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSupporters();
  }, []);

  // File upload handling
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
      // Upload new image
      const result = await uploadImage(file, {
        folder: "supporters",
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

  // Move supporter up in ordering
  const moveUp = async (index: number) => {
    if (index === 0) return; // Already at the top
    try {
      setIsReordering(true);

      // Create new ordering
      const newSupporters = [...supporters];

      // Swap the current supporter with the one above it
      const temp = newSupporters[index];
      newSupporters[index] = newSupporters[index - 1];
      newSupporters[index - 1] = temp;

      // Update order values (starting from 1)
      const updatedSupporters = newSupporters.map((supporter, idx) => ({
        ...supporter,
        order: idx + 1,
      })) as ISupporter[];

      // Update state
      setSupporters(updatedSupporters);

      // Send reordering update to API
      const orderData = updatedSupporters.map((supporter) => ({
        id: supporter._id,
        order: supporter.order,
      }));

      await api.post("/api/admin/supporters/reorder", { items: orderData });
      toast.success("Destekçi sıralaması güncellendi");
    } catch (error) {
      toast.error("Sıralama güncellenirken bir hata oluştu");
      // Revert to original ordering in case of error
      fetchSupporters();
    } finally {
      setIsReordering(false);
    }
  };

  // Move supporter down in ordering
  const moveDown = async (index: number) => {
    if (index === supporters.length - 1) return; // Already at the bottom
    try {
      setIsReordering(true);

      // Create new ordering
      const newSupporters = [...supporters];

      // Swap the current supporter with the one below it
      const temp = newSupporters[index];
      newSupporters[index] = newSupporters[index + 1];
      newSupporters[index + 1] = temp;

      // Update order values (starting from 1)
      const updatedSupporters = newSupporters.map((supporter, idx) => ({
        ...supporter,
        order: idx + 1,
      })) as ISupporter[];

      // Update state
      setSupporters(updatedSupporters);

      // Send reordering update to API
      const orderData = updatedSupporters.map((supporter) => ({
        id: supporter._id,
        order: supporter.order,
      }));

      await api.post("/api/admin/supporters/reorder", { items: orderData });
      toast.success("Destekçi sıralaması güncellendi");
    } catch (error) {
      toast.error("Sıralama güncellenirken bir hata oluştu");
      // Revert to original ordering in case of error
      fetchSupporters();
    } finally {
      setIsReordering(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setSelectedSupporterId("");
    setName("");
    setTitle("");
    setPhoto("");
    setPhotoPreview("");
  };

  // Load supporter data for editing
  const loadSupporterForEdit = (supporter: ISupporter) => {
    try {
      setSelectedSupporterId(String(supporter._id || supporter.id || ""));
      setName(supporter.name || "");
      setTitle(supporter.title || "");
      setPhoto(supporter.photo || "");
      setPhotoPreview(supporter.photo || "");

      setEditDialogOpen(true);
    } catch (err) {
      toast.error("Destekçi bilgileri yüklenirken bir hata oluştu");
    }
  };

  // Add new supporter
  const handleAddSupporter = async () => {
    if (!name || !title) {
      toast.error("Lütfen isim ve ünvan alanlarını doldurun");
      return;
    }

    try {
      setIsAdding(true);
      const response = await api.post("/api/admin/supporters", {
        name,
        title,
        photo,
      });

      if (response.data.success) {
        toast.success("Destekçi başarıyla eklendi");
        setAddDialogOpen(false);
        resetForm();
        fetchSupporters();
      } else {
        toast.error(
          "Destekçi eklenirken bir hata oluştu"
        );
      }
    } catch (error) {
      toast.error("Destekçi eklenirken bir hata oluştu");
    } finally {
      setIsAdding(false);
    }
  };

  // Edit supporter
  const handleEditSupporter = async () => {
    if (!selectedSupporterId || !name || !title) {
      toast.error("Lütfen isim ve ünvan alanlarını doldurun");
      return;
    }

    try {
      setIsEditing(true);

      const response = await api.put(
        `/api/admin/supporters/${selectedSupporterId}`,
        {
          name,
          title,
          photo,
        }
      );

      if (response.data.success) {
        toast.success("Destekçi başarıyla güncellendi");
        setEditDialogOpen(false);
        resetForm();
        fetchSupporters();
      } else {
        toast.error(
          "Destekçi güncellenirken bir hata oluştu"
        );
      }
    } catch (error) {
      toast.error("Destekçi güncellenirken bir hata oluştu");
    } finally {
      setIsEditing(false);
    }
  };

  // Delete supporter
  const handleRemoveSupporter = async (id: string) => {
    if (!id) return;

    setSelectedSupporterId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedSupporterId) return;

    try {
      // Find the supporter to get their photo URL
      const supporter = supporters.find(
        (s) => String(s._id) === selectedSupporterId
      );

      const response = await api.delete(
        `/api/admin/supporters/${selectedSupporterId}`
      );

      if (response.data.success) {
        // Delete the photo from Cloudinary if exists
        if (supporter?.photo) {
          try {
            await deleteImage(supporter.photo);
          } catch (error) {}
        }

        toast.success("Destekçi başarıyla silindi");
        setDeleteDialogOpen(false);
        fetchSupporters();
      } else {
        toast.error(
          "Destekçi silinirken bir hata oluştu"
        );
      }
    } catch (error) {
      toast.error("Destekçi silinirken bir hata oluştu");
    }
  };

  // Helper function to get initials from name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Topluluk Destekçileri</span>
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Destekçi Ekle
            </Button>
          </CardTitle>
          <CardDescription>
            Tüm destekçileri görüntüleyin ve yönetin. Sıralamayı değiştirmek
            için yukarı/aşağı butonlarını kullanabilirsiniz.
          </CardDescription>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="w-full mb-4">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-14 w-14 rounded-full bg-primary/20" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-40 bg-primary/20" />
                      <Skeleton className="h-4 w-32 bg-primary/20" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-9 bg-primary/20" />
                    <Skeleton className="h-9 w-9 bg-primary/20" />
                    <Skeleton className="h-9 w-9 bg-primary/20" />
                    <Skeleton className="h-9 w-9 bg-primary/20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {supporters.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Henüz destekçi eklenmedi</p>
            </div>
          ) : (
            supporters.map((supporter, index) => (
              <Card key={String(supporter._id)} className="w-full">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {supporter.photo ? (
                        <div className="relative h-14 w-14 rounded-full overflow-hidden">
                          <Image
                            src={supporter.photo}
                            alt={supporter.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <Avatar className="h-14 w-14">
                          <AvatarFallback>
                            {getInitials(supporter.name)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div>
                        <CardTitle className="text-lg">
                          {supporter.name}
                        </CardTitle>
                        <CardDescription>{supporter.title}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={index === 0 || isReordering}
                        onClick={() => moveUp(index)}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={
                          index === supporters.length - 1 || isReordering
                        }
                        onClick={() => moveDown(index)}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => loadSupporterForEdit(supporter)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() =>
                          handleRemoveSupporter(
                            String(supporter._id || supporter.id || "")
                          )
                        }
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Add Supporter Dialog */}
      <Dialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Topluluk Destekçisi Ekle</DialogTitle>
            <DialogDescription>
              Topluluk destekçisi eklemek için bilgileri girin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="name" className="mb-1 block">
                  İsim
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Destekçinin ismi"
                />
              </div>

              <div>
                <Label htmlFor="title" className="mb-1 block">
                  Ünvan
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn: ABC Şirketi CEO"
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
                      alt="Destekçi fotoğrafı"
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
                          document.getElementById("photo-upload")?.click();
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
                        {isDeleting ? (
                          <div className="flex items-center">
                            <Skeleton className="h-4 w-4 rounded-full bg-primary/20 animate-pulse mr-2" />
                            Kaldırılıyor...
                          </div>
                        ) : (
                          "Kaldır"
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center gap-2 cursor-pointer"
                    onClick={() =>
                      document.getElementById("photo-upload")?.click()
                    }
                  >
                    {isUploading ? (
                      <>
                        <Skeleton className="h-8 w-8 rounded-full bg-primary/20 animate-pulse" />
                        <p className="text-sm text-muted-foreground">
                          Yükleniyor...
                        </p>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-10 w-10 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground text-center">
                          Fotoğraf yüklemek için tıklayın
                        </p>
                        <Button variant="outline" type="button" size="sm">
                          Fotoğraf Seç
                        </Button>
                      </>
                    )}
                  </div>
                )}
                <Input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isUploading}
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
            <Button
              onClick={handleAddSupporter}
              disabled={isAdding || isUploading}
            >
              {isAdding ? (
                <>
                  <Skeleton className="mr-2 h-4 w-4 rounded-full bg-primary/20 animate-pulse" />
                  Ekleniyor...
                </>
              ) : (
                "Ekle"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Supporter Dialog */}
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
            <DialogTitle>Destekçiyi Düzenle</DialogTitle>
            <DialogDescription>
              Destekçinin bilgilerini güncelleyin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="name-edit" className="mb-1 block">
                  İsim
                </Label>
                <Input
                  id="name-edit"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Destekçinin ismi"
                />
              </div>

              <div>
                <Label htmlFor="title-edit" className="mb-1 block">
                  Ünvan
                </Label>
                <Input
                  id="title-edit"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn: ABC Şirketi CEO"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="photo-edit" className="mb-1 block">
                  Fotoğraf
                </Label>

                {photoPreview ? (
                  <div className="relative border rounded-md overflow-hidden p-2">
                    <Image
                      src={photoPreview}
                      alt="Destekçi fotoğrafı"
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
                          document.getElementById("photo-upload-edit")?.click();
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
                        {isDeleting ? (
                          <div className="flex items-center">
                            <Skeleton className="h-4 w-4 rounded-full bg-primary/20 animate-pulse mr-2" />
                            Kaldırılıyor...
                          </div>
                        ) : (
                          "Kaldır"
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center gap-2 cursor-pointer"
                    onClick={() =>
                      document.getElementById("photo-upload-edit")?.click()
                    }
                  >
                    {isUploading ? (
                      <>
                        <Skeleton className="h-8 w-8 rounded-full bg-primary/20 animate-pulse" />
                        <p className="text-sm text-muted-foreground">
                          Yükleniyor...
                        </p>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-10 w-10 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground text-center">
                          Fotoğraf yüklemek için tıklayın
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
              onClick={handleEditSupporter}
              disabled={isEditing || isUploading || !name || !title}
              type="button"
            >
              {isEditing ? (
                <>
                  <Skeleton className="mr-2 h-4 w-4 rounded-full bg-primary/20 animate-pulse" />
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
            <AlertDialogTitle>Destekçiyi Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu destekçiyi silmek istediğinize emin misiniz? Bu işlem geri
              alınamaz.
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
