"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { toast } from "sonner";
import api from "@/lib/api";
import { Loader2, Pencil, Plus, Trash2, Upload, Image as ImageIcon, ArrowUp, ArrowDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUploadImage } from "@/hooks/useUploadImage";
import Image from "next/image";

interface BoardMember {
  _id: string;
  name: string;
  designation: string;
  quote: string;
  src: string;
  order?: number; // Order alanı eklendi
}

export function BoardManagement() {
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [selectedMember, setSelectedMember] = useState<BoardMember | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("");

  // Cloudinary image upload hook
  const { uploadImage, deleteImage, isUploading, isDeleting: isDeletingImage } = useUploadImage();

  // Form için state
  const [formData, setFormData] = useState({
    name: "",
    designation: "",
    quote: "",
    src: "",
  });

  const fetchBoardMembers = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/api/admin/board");

      // Sıralamaya göre diz, eğer order yoksa veya eşitse, ID'ye göre sırala
      const sortedMembers = response.data.boardMembers.sort((a: BoardMember, b: BoardMember) => {
        if (a.order === b.order) {
          return a._id.localeCompare(b._id);
        }
        return (a.order || Number.MAX_SAFE_INTEGER) - (b.order || Number.MAX_SAFE_INTEGER);
      });

      setBoardMembers(sortedMembers);
    } catch (error) {
      toast.error("Board üyeleri yüklenemedi");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBoardMembers();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      designation: "",
      quote: "",
      src: "",
    });
    setImagePreview("");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Geçersiz dosya türü", {
        description: "Lütfen bir resim dosyası seçin.",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Dosya çok büyük", {
        description: "Lütfen 5MB'dan küçük bir dosya seçin.",
      });
      return;
    }

    try {
      // Eğer daha önce seçilmiş bir görsel varsa sil
      if (formData.src) {
        try {
          await deleteImage(formData.src);
        } catch (error) {
          console.error("Önceki görsel silinemedi:", error);
        }
      }

      // Resmin boyutlarını önceden kontrol edip uygun bir ön izleme göstermek için
      const previewURL = URL.createObjectURL(file);
      setImagePreview(previewURL);

      // Yeni görseli yükle
      const result = await uploadImage(file, {
        folder: "board_members",
        onSuccess: (data) => {
          if (data && data.success) {
            URL.revokeObjectURL(previewURL); // Bellek sızıntısı olmaması için
            setFormData((prev) => ({ ...prev, src: data.url }));
            setImagePreview(data.url);
            toast.success("Görsel yüklendi");
          }
        },
      });

      if (!result.success) {
        URL.revokeObjectURL(previewURL);
        setImagePreview("");
        toast.error("Görsel yüklenemedi", {
          description: result.message,
        });
      }
    } catch (error) {
      toast.error("Görsel yüklenemedi");
    }
  };

  const handleAdd = async () => {
    try {
      // Form validasyonu
      if (!formData.name || !formData.designation || !formData.quote || !formData.src) {
        toast.error("Lütfen tüm alanları doldurunuz");
        return;
      }

      setIsSubmitting(true);
      const response = await api.post("/api/admin/board", formData);

      if (response.data.success) {
        toast.success("Board üyesi başarıyla eklendi");
        setAddDialogOpen(false);
        resetForm();
        fetchBoardMembers();
      }
    } catch (error) {
      toast.error("Board üyesi eklenemedi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedMember) return;

    try {
      // Form validasyonu
      if (!formData.name || !formData.designation || !formData.quote || !formData.src) {
        toast.error("Lütfen tüm alanları doldurunuz");
        return;
      }

      setIsSubmitting(true);
      const response = await api.put(`/api/admin/board/${selectedMember._id}`, formData);

      if (response.data.success) {
        toast.success("Board üyesi başarıyla güncellendi");
        setEditDialogOpen(false);
        setSelectedMember(null);
        fetchBoardMembers();
      }
    } catch (error) {
      toast.error("Board üyesi güncellenemedi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMember) return;

    try {
      setIsDeleting(true);

      // Önce resmi Cloudinary'den sil
      if (selectedMember.src) {
        await deleteImage(selectedMember.src);
      }

      // Board üyesini veritabanından sil
      const response = await api.delete(`/api/admin/board/${selectedMember._id}`);

      if (response.data.success) {
        toast.success("Board üyesi başarıyla silindi");
        setDeleteDialogOpen(false);
        setSelectedMember(null);
        fetchBoardMembers();
      }
    } catch (error) {
      toast.error("Board üyesi silinemedi");
    } finally {
      setIsDeleting(false);
    }
  };

  const moveUp = async (index: number) => {
    if (index <= 0) return; // İlk eleman zaten en üstte

    try {
      setIsReordering(true);

      // Yeni sıralamayı oluştur
      const newBoardMembers = [...boardMembers];

      // Seçilen elemanı bir üst sıraya taşı
      const temp = newBoardMembers[index];
      newBoardMembers[index] = newBoardMembers[index - 1];
      newBoardMembers[index - 1] = temp;

      // Sıralamayı güncelle (index 1'den başlayarak)
      const updatedMembers = newBoardMembers.map((member, idx) => ({
        ...member,
        order: idx + 1,
      }));

      // State'i güncelle
      setBoardMembers(updatedMembers);

      // API'ye sıralama güncellemesi gönder
      const orderData = updatedMembers.map((member) => ({
        id: member._id,
        order: member.order,
      }));

      await api.post("/api/admin/board/reorder", { items: orderData });
      toast.success("Üye sıralaması güncellendi");
    } catch (error) {
      toast.error("Sıralama güncellenirken bir hata oluştu");
      // Hata durumunda orijinal sıralamayı geri getir
      fetchBoardMembers();
    } finally {
      setIsReordering(false);
    }
  };

  const moveDown = async (index: number) => {
    if (index >= boardMembers.length - 1) return; // Son eleman zaten en altta

    try {
      setIsReordering(true);

      // Yeni sıralamayı oluştur
      const newBoardMembers = [...boardMembers];

      // Seçilen elemanı bir alt sıraya taşı
      const temp = newBoardMembers[index];
      newBoardMembers[index] = newBoardMembers[index + 1];
      newBoardMembers[index + 1] = temp;

      // Sıralamayı güncelle (index 1'den başlayarak)
      const updatedMembers = newBoardMembers.map((member, idx) => ({
        ...member,
        order: idx + 1,
      }));

      // State'i güncelle
      setBoardMembers(updatedMembers);

      // API'ye sıralama güncellemesi gönder
      const orderData = updatedMembers.map((member) => ({
        id: member._id,
        order: member.order,
      }));

      await api.post("/api/admin/board/reorder", { items: orderData });
      toast.success("Üye sıralaması güncellendi");
    } catch (error) {
      toast.error("Sıralama güncellenirken bir hata oluştu");
      // Hata durumunda orijinal sıralamayı geri getir
      fetchBoardMembers();
    } finally {
      setIsReordering(false);
    }
  };

  const openEditDialog = (member: BoardMember) => {
    setSelectedMember(member);
    setFormData({
      name: member.name,
      designation: member.designation,
      quote: member.quote,
      src: member.src,
    });
    setImagePreview(member.src);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (member: BoardMember) => {
    setSelectedMember(member);
    setDeleteDialogOpen(true);
  };

  const ImageUploadSection = () => (
    <div className="space-y-2">
      <label htmlFor="image-upload" className="text-sm font-medium block">
        Fotoğraf
      </label>
      <div className="space-y-4">
        {imagePreview ? (
          <div className="relative border rounded-md overflow-hidden flex justify-center p-4 bg-gray-50">
            <div className="relative" style={{ maxHeight: "250px", maxWidth: "100%" }}>
              <Image
                src={imagePreview}
                alt="Üye fotoğrafı"
                width={400}
                height={400}
                className="object-contain max-h-[250px]"
                style={{ objectFit: "contain" }}
              />
            </div>
            <div className="absolute top-2 right-2 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => document.getElementById("image-upload")?.click()}
                disabled={isUploading}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Değiştir
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  if (formData.src) {
                    await deleteImage(formData.src);
                    setFormData((prev) => ({ ...prev, src: "" }));
                    setImagePreview("");
                  }
                }}
                disabled={isDeletingImage || !formData.src}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="border-2 border-dashed rounded-md p-8 flex flex-col items-center justify-center gap-4 min-h-[150px] cursor-pointer"
            onClick={() => document.getElementById("image-upload")?.click()}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Yükleniyor...</p>
              </>
            ) : (
              <>
                <ImageIcon className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Fotoğraf yüklemek için tıklayın veya sürükleyin
                </p>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Fotoğraf Seç
                </Button>
              </>
            )}
          </div>
        )}
        <Input
          id="image-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Yönetim Kurulu Üyeleri</h2>
        <Dialog
          open={addDialogOpen}
          onOpenChange={(open) => {
            // Dialog açılırken formu sıfırla
            if (open) {
              resetForm();
            }
            setAddDialogOpen(open);
          }}
        >
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" onClick={() => resetForm()}>
              <Plus className="h-4 w-4" />
              Yeni Üye Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Yeni Yönetim Kurulu Üyesi</DialogTitle>
              <DialogDescription>Yönetim kurulu üyesi bilgilerini girin</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label htmlFor="name" className="text-sm font-medium mb-1 block">
                    İsim
                  </label>
                  <Input id="name" name="name" value={formData.name} onChange={handleInputChange} />
                </div>
                <div>
                  <label htmlFor="designation" className="text-sm font-medium mb-1 block">
                    Ünvan
                  </label>
                  <Input
                    id="designation"
                    name="designation"
                    value={formData.designation}
                    onChange={handleInputChange}
                  />
                </div>

                <ImageUploadSection />

                <div>
                  <label htmlFor="quote" className="text-sm font-medium mb-1 block">
                    Alıntı
                  </label>
                  <Textarea
                    id="quote"
                    name="quote"
                    rows={7}
                    value={formData.quote}
                    onChange={handleInputChange}
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
              <Button onClick={handleAdd} disabled={isSubmitting || isUploading}>
                {isSubmitting ? (
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
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4">
          {/* Başlık kartı skeleton */}
          <Card className="mb-4">
            <CardHeader>
              <div className="h-6 bg-primary/20 rounded w-1/4 animate-pulse"></div>
              <div className="h-4 bg-primary/20 rounded w-3/4 mt-2 animate-pulse"></div>
            </CardHeader>
          </Card>

          {/* Üye kartları skeleton */}
          {[1, 2, 3].map((i) => (
            <Card key={i} className="w-full mb-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Avatar skeleton */}
                    <div className="h-14 w-14 rounded-full bg-primary/20 animate-pulse"></div>
                    <div>
                      {/* İsim ve ünvan skeletonları */}
                      <div className="h-5 bg-primary/20 rounded w-32 animate-pulse"></div>
                      <div className="h-4 bg-primary/20 rounded w-24 mt-2 animate-pulse"></div>
                    </div>
                  </div>
                  {/* Sıralama butonları skeleton */}
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded bg-primary/20 animate-pulse"></div>
                    <div className="h-8 w-8 rounded bg-primary/20 animate-pulse"></div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Alıntı skeleton */}
                <div className="h-16 bg-primary/20 rounded animate-pulse"></div>
              </CardContent>
              <CardFooter className="flex justify-between">
                {/* Düzenleme ve silme butonları skeleton */}
                <div className="h-9 bg-primary/20 rounded w-28 animate-pulse"></div>
                <div className="h-9 bg-primary/20 rounded w-24 animate-pulse"></div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">Üye Sıralaması</CardTitle>
              <CardDescription>
                Üyelerin gösterim sırasını değiştirmek için yukarı/aşağı butonlarını kullanabilirsiniz.
              </CardDescription>
            </CardHeader>
          </Card>

          {boardMembers.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">Henüz yönetim kurulu üyesi eklenmemiş.</p>
            </div>
          ) : (
            boardMembers.map((member, index) => (
              <Card key={member._id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={member.src} alt={member.name} />
                        <AvatarFallback>{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{member.name}</CardTitle>
                        <CardDescription>{member.designation}</CardDescription>
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
                        disabled={index === boardMembers.length - 1 || isReordering}
                        onClick={() => moveDown(index)}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 line-clamp-3">"{member.quote}"</p>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(member)}>
                    <Pencil className="h-4 w-4 mr-2" /> Düzenle
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(member)}>
                    <Trash2 className="h-4 w-4 mr-2" /> Sil
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}

          {isReordering && (
            <div className="fixed bottom-4 right-4 bg-secondary text-secondary-foreground px-4 py-2 rounded-md shadow-lg flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Sıralama güncelleniyor...</span>
            </div>
          )}
        </div>
      )}

      {/* Düzenleme Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yönetim Kurulu Üyesini Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="edit-name" className="text-sm font-medium mb-1 block">
                  İsim
                </label>
                <Input
                  id="edit-name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label htmlFor="edit-designation" className="text-sm font-medium mb-1 block">
                  Ünvan
                </label>
                <Input
                  id="edit-designation"
                  name="designation"
                  value={formData.designation}
                  onChange={handleInputChange}
                />
              </div>

              <ImageUploadSection />

              <div>
                <label htmlFor="edit-quote" className="text-sm font-medium mb-1 block">
                  Alıntı
                </label>
                <Textarea
                  id="edit-quote"
                  rows={7}
                  name="quote"
                  value={formData.quote}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                if (selectedMember) {
                  setFormData({
                    name: selectedMember.name,
                    designation: selectedMember.designation,
                    quote: selectedMember.quote,
                    src: selectedMember.src,
                  });
                  setImagePreview(selectedMember.src);
                }
              }}
            >
              İptal
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting || isUploading}>
              {isSubmitting ? (
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

      {/* Silme Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Yönetim Kurulu Üyesini Sil</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedMember?.name} isimli yönetim kurulu üyesini silmek istediğinize emin misiniz?
              Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Siliniyor...
                </>
              ) : (
                "Evet, Sil"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
