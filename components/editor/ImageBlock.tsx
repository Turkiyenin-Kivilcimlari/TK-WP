"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Trash2, ImageIcon, Upload, Loader2, Replace, CropIcon, ZoomIn, ZoomOut, Move, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { useUploadImage } from '@/hooks/useUploadImage';
import { Block } from "./WritingEditor";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageBlockProps {
  block: Block;
  updateContent: (id: string, content: string) => void;
  updateConfig: (id: string, config: Partial<Block>) => void;
  isSelected: boolean;
  onSelect: () => void;
}

export function ImageBlock({ 
  block, 
  updateContent,
  updateConfig,
  isSelected, 
  onSelect
}: ImageBlockProps) {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const { uploadImage, deleteImage, isDeleting } = useUploadImage();
  
  // Resim düzenleme state'leri
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState<{ x: number, y: number } | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Dosya işleme fonksiyonu
  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error("Geçersiz dosya türü", {
        description: "Lütfen bir resim dosyası seçin."
      });
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Dosya çok büyük", {
        description: "Lütfen 10MB'dan küçük bir dosya seçin."
      });
      return;
    }
    
    setIsUploading(true);

    try {
      // Eğer zaten bir görsel varsa, önce onu sil
      if (block.imageUrl) {
        try {
          await deleteImage(block.imageUrl);
        } catch (error) {
          // Silme hatası işlemi engellememeli
        }
      }

      // Define interface for upload response
      interface UploadResponse {
        success: boolean;
        url: string;
      }

      // Define interface for upload callbacks
      interface UploadCallbacks {
        onSuccess: (data: UploadResponse) => void;
        onError: (error: unknown) => void;
      }

      uploadImage(file, {
        onSuccess: (data: UploadResponse) => {
          if (data && data.success && data.url) {
        updateConfig(block.id, { imageUrl: data.url });
        toast.success("Görsel yüklendi");
          } else {
        toast.error("Görsel yüklenemedi");
          }
          setIsUploading(false);
        },
        onError: (error: unknown) => {
          toast.error("Görsel yüklenemedi", {
        description: "Bir hata oluştu."
          });
          setIsUploading(false);
        }
      } as UploadCallbacks);
    } catch (error) {
      toast.error("Görsel yüklenirken bir hata oluştu");
      setIsUploading(false);
    }
  };

  // Yükleme için input değişikliği
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // Sürükle bırak işlevleri
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  }, [isDragging]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  // Düzenleme modunu başlat
  const startEditing = () => {
    setIsEditing(true);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };
  
  // Düzenlemeyi iptal et
  const cancelEditing = () => {
    setIsEditing(false);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Düzenlenmiş resmi kaydet
  const saveEditing = async () => {
    if (!block.imageUrl || !imageRef.current) return;

    setIsSavingEdit(true);

    try {
      // Canvas oluştur
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error("Canvas context oluşturulamadı");
      }

      // Orijinal görselini yükle
      const img = new window.Image();
      img.crossOrigin = "anonymous"; // CORS sorunlarını önlemek için
      
      // Görsel yüklemesini beklemek için promise kullanımı
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = block.imageUrl || '';
      });

      // Canvas boyutunu ayarla - yüksek kaliteli bir çıktı için
      const width = 1200;  // Yüksek kalite için
      const height = 800;   // 3:2 oranı
      canvas.width = width;
      canvas.height = height;

      // Arka plan rengini ayarla (opsiyonel)
      ctx.fillStyle = '#f8f8f8';
      ctx.fillRect(0, 0, width, height);

      // Ölçekleme ve konumlandırma ile görseli çiz
      const scaledWidth = width * scale;
      const scaledHeight = height * scale;
      
      // Görselin pozisyonunu hesapla
      const offsetX = (width - scaledWidth) / 2 + position.x;
      const offsetY = (height - scaledHeight) / 2 + position.y;
      
      ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);

      // Canvas'ı blob'a dönüştür
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            toast.error("Görsel işleme hatası");
          }
        }, 'image/jpeg', 0.85); // Kalite 0.85 (iyi sıkıştırma oranı)
      });

      // Blob'dan dosya oluştur
      const file = new File([blob], `edited_image_${Date.now()}.jpg`, { type: 'image/jpeg' });

      // Mevcut görseli sil
      await deleteImage(block.imageUrl);
      
      // Yeni düzenlenmiş görseli yükle
      interface UploadResponse {
        success: boolean;
        url: string;
      }

      interface UploadCallbacks {
        onSuccess: (data: UploadResponse) => void;
        onError: (error: unknown) => void;
      }

            uploadImage(file, {
              onSuccess: (data: UploadResponse) => {
                if (data && data.success && data.url) {
                  updateConfig(block.id, { imageUrl: data.url });
                  setIsEditing(false);
                  toast.success("Düzenlenmiş görsel kaydedildi");
                } else {
                  toast.error("Düzenlenmiş görsel kaydedilemedi");
                }
                setIsSavingEdit(false);
              },
              onError: (error: unknown) => {
                toast.error("Düzenlenmiş görsel kaydedilemedi", {
                  description: "Bir hata oluştu."
                });
                setIsSavingEdit(false);
              }
            } as UploadCallbacks);

    } catch (error) {
      toast.error("Görsel düzenlenemedi", { 
        description: "Lütfen tekrar deneyiniz." 
      });
      setIsSavingEdit(false);
    }
  };

  // Mouse hareketiyle resim konumlandırma
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditing) return;
    e.preventDefault();
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditing || !dragStart) return;
    e.preventDefault();
    
    // Fare hareketi hesaplaması
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    // Yeni pozisyon hesapla - önceki pozisyona delta ekle
    const newPosX = position.x + deltaX;
    const newPosY = position.y + deltaY;
    
    // Scale değerine göre maksimum hareket mesafesi
    const maxOffset = Math.round((scale - 1) * 150);
    
    // Sınır kontrolü
    const limitedX = Math.min(Math.max(newPosX, -maxOffset), maxOffset);
    const limitedY = Math.min(Math.max(newPosY, -maxOffset), maxOffset);
    
    // Yeni pozisyonu ayarla
    setPosition({ x: limitedX, y: limitedY });
    
    // Yeni başlangıç noktasını güncelle
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  
  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditing) return;
    e.preventDefault();
    setDragStart(null);
  };

  // Dokunmatik ekran desteği
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isEditing) return;
    e.preventDefault();
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX, y: touch.clientY });
  };
  
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isEditing || !dragStart) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - dragStart.x;
    const deltaY = touch.clientY - dragStart.y;
    
    const newPosX = position.x + deltaX;
    const newPosY = position.y + deltaY;
    
    const maxOffset = Math.round((scale - 1) * 150);
    const limitedX = Math.min(Math.max(newPosX, -maxOffset), maxOffset);
    const limitedY = Math.min(Math.max(newPosY, -maxOffset), maxOffset);
    
    setPosition({ x: limitedX, y: limitedY });
    setDragStart({ x: touch.clientX, y: touch.clientY });
  };
  
  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isEditing) return;
    e.preventDefault();
    setDragStart(null);
  };

  return (
    <div 
      className={cn(
        "space-y-3",
        isSelected ? "ring-2 ring-primary p-2 rounded-md" : ""
      )}
      onClick={onSelect}
    >
      {block.imageUrl ? (
        <div className="space-y-3">
          <div className="relative border rounded-md overflow-hidden">
            {/* Düzenleme modu açıksa düzenleme arayüzü, değilse normal görüntü */}
            <div 
              className={`relative w-full aspect-video overflow-hidden ${isEditing ? 'cursor-move bg-grid-pattern' : ''}`}
              ref={imageRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <Image 
                src={block.imageUrl} 
                alt={block.content || "Makale görseli"} 
                fill 
                sizes="(max-width: 768px) 100vw, 800px"
                className="object-contain"
                style={{
                  transform: isEditing ? `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)` : 'none',
                  transition: dragStart ? 'none' : 'transform 0.1s ease-out'
                }}
                draggable={false} 
              />
              
              {isEditing && (
                <div className="absolute inset-0 border-4 border-primary pointer-events-none" />
              )}
            </div>
          
            {isEditing ? (
              <div className="p-3 border-t bg-background">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <ZoomOut className="h-4 w-4 text-muted-foreground" />
                    <Slider 
                      min={1} 
                      max={2} 
                      step={0.01} 
                      value={[scale]}
                      onValueChange={(value) => setScale(value[0])} 
                      className="flex-1" 
                    />
                    <ZoomIn className="h-4 w-4 text-muted-foreground" />
                  </div>
                  
                  <div className="flex justify-center text-xs text-muted-foreground">
                    <Move className="h-3.5 w-3.5 mr-1" />
                    <span>Görseli taşımak için sürükleyin</span>
                  </div>
                  
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={cancelEditing}
                      disabled={isSavingEdit}
                    >
                      <X className="h-4 w-4 mr-1" />
                      İptal
                    </Button>
                    
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={saveEditing}
                      disabled={isSavingEdit}
                    >
                      {isSavingEdit ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Kaydediliyor...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Kaydet
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {isSavingEdit && (
                    <div className="text-xs text-muted-foreground text-center pt-2">
                      Düzenlenmiş görsel kaydediliyor ve optimize ediliyor. Bu işlem birkaç saniye sürebilir.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="absolute top-2 right-2 flex gap-2">
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={startEditing}
                >
                  <CropIcon className="h-3.5 w-3.5 mr-1" />
                  Görseli Düzenle
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => document.getElementById(`image-upload-${block.id}`)?.click()}
                  disabled={isUploading}
                >
                  <Replace className="h-4 w-4 mr-1" />
                  Değiştir
                </Button>
              </div>
            )}
          </div>
          
          <div>
            <Label htmlFor={`caption-${block.id}`} className="text-xs text-muted-foreground mb-1 block">
              Görsel açıklaması (isteğe bağlı)
            </Label>
            <Textarea
              id={`caption-${block.id}`}
              placeholder="Görsel için açıklama yazın (isteğe bağlı)..."
              className="resize-none"
              value={block.content || ""}
              onChange={(e) => updateContent(block.id, e.target.value)}
            />
          </div>
        </div>
      ) : (
        <div 
          className={`border-2 ${isDragging ? 'border-primary bg-primary/5' : 'border-dashed'} rounded-md p-8 flex flex-col items-center justify-center gap-4 min-h-[200px] transition-colors duration-150`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Yükleniyor...</p>
            </>
          ) : (
            <>
              <ImageIcon className={`h-12 w-12 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
              <p className={`text-sm ${isDragging ? 'text-primary' : 'text-muted-foreground'}`}>
                {isDragging 
                  ? "Görseli buraya bırakın" 
                  : "Yazı içeriğine görsel eklemek için tıkla veya sürükle"}
              </p>
              <Button 
                variant="outline" 
                onClick={() => document.getElementById(`image-upload-${block.id}`)?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Görsel Seç
              </Button>
            </>
          )}
        </div>
      )}
      <Input
        id={`image-upload-${block.id}`}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
