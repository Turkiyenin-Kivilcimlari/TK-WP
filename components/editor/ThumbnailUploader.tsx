"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Image as ImageIcon, Upload, Trash2, Loader2, Replace, CropIcon, ZoomIn, ZoomOut, Move, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import Image from "next/image";
import { useUploadImage } from '@/hooks/useUploadImage';
import { toast } from "sonner";

interface ThumbnailUploaderProps {
  initialThumbnail?: string;
  onThumbnailChange: (thumbnailUrl: string | null) => void;
}

export function ThumbnailUploader({ 
  initialThumbnail, 
  onThumbnailChange 
}: ThumbnailUploaderProps) {
  const [thumbnail, setThumbnail] = useState<string | null>(initialThumbnail || null);
  const { uploadImage, isUploading, deleteImage, isDeleting } = useUploadImage();
  const [isDragging, setIsDragging] = useState<boolean>(false);
  
  // Resim düzenleme state'leri
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState<{ x: number, y: number } | null>(null);
  
  // Düzenlenmiş görseli kaydetme durumu için yeni state
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  useEffect(() => {
    if (initialThumbnail) {
      setThumbnail(initialThumbnail);
    }
  }, [initialThumbnail]);

  // Dosya işleme fonksiyonu - hem upload hem drag&drop için ortak kullanılacak
  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error("Geçersiz dosya türü", {
        description: "Lütfen bir resim dosyası seçin."
      });
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Dosya çok büyük", {
        description: "Lütfen 5MB'dan küçük bir dosya seçin."
      });
      return;
    }

    try {
      if (thumbnail) {
        try {
          await deleteImage(thumbnail);
        } catch (error) {
          toast.error("Görsel kaldırılamadı", {
            description: "Lütfen daha sonra tekrar deneyin."
          });
        }
      }

      uploadImage(file, {
        folder: "thumbnails",
        onSuccess: (data) => {
          if (data && data.success && data.url) {
            setThumbnail(data.url);
            onThumbnailChange(data.url);
            toast.success("Görsel yüklendi");
          } else {
            toast.error("Görsel yüklenemedi", {
              description: "Sunucudan geçersiz yanıt alındı"
            });
          }
        }
      }).catch((error) => {
        toast.error("Görsel yüklenemedi", {
          description: "Bir hata oluştu."
        });
      });
    } catch (error) {
      toast.error("Görsel yüklenemedi", {
        description: "Lütfen daha sonra tekrar deneyin."
      });
    }
  }, [thumbnail, deleteImage, uploadImage, onThumbnailChange]);

  // Görsel yükleme işleyicisi
  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    handleFile(file);
  }, [handleFile]);

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
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  }, [handleFile]);

  // Görsel kaldırma işleyicisi
  const handleRemoveThumbnail = async () => {
    if (!thumbnail) return;

    try {
      await deleteImage(thumbnail);
      setThumbnail(null);
      onThumbnailChange(null);
      toast.success("Görsel kaldırıldı");
    } catch (error) {
      toast.error("Görsel kaldırılamadı", {
        description: "Lütfen daha sonra tekrar deneyin."
      });
    }
  };

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
  
  // Düzenlemeyi kaydet
  const saveEditing = async () => {
    if (!thumbnail || !imageRef.current) return;

    setIsSavingEdit(true); // Kaydetme işlemini başlat

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
        img.src = thumbnail;
      });

      // Canvas boyutunu ayarla - makale kartındaki en boy oranı ile uyumlu (4:3)
      const width = 600;  // Yeterince yüksek kalite
      const height = 450; // 4:3 oranı için
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
      const file = new File([blob], `edited_thumbnail_${Date.now()}.jpg`, { type: 'image/jpeg' });

      // Mevcut thumbnail'i sil
      await deleteImage(thumbnail);
      
      // Yeni düzenlenmiş görseli yükle
      // Yeni düzenlenmiş görseli yükle
      uploadImage(file, {
        folder: "thumbnails",
        onSuccess: (data) => {
          if (data && data.success && data.url) {
            setThumbnail(data.url);
            onThumbnailChange(data.url);
            setIsEditing(false);
            toast.success("Düzenlenmiş görsel kaydedildi");
          } else {
            toast.error("Düzenlenmiş görsel kaydedilemedi");
          }
          setIsSavingEdit(false); // Kaydetme işlemini bitir
        }
      }).catch((error) => {
        toast.error("Düzenlenmiş görsel kaydedilemedi", {
          description: "Bir hata oluştu."
        });
        setIsSavingEdit(false); // Kaydetme işlemini bitir
      });
    } catch (error) {
      toast.error("Görsel düzenlenemedi", { 
        description: "Lütfen tekrar deneyiniz." 
      });
      setIsSavingEdit(false); // Kaydetme işlemini bitir
    }
  };

  // Mouse hareketiyle resim konumlandırma
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditing) return;
    e.preventDefault(); // Önemli: Varsayılan davranışı engelle
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditing || !dragStart) return;
    e.preventDefault(); // Önemli: Varsayılan davranışı engelle
    
    // Fare hareketi hesaplaması
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    // Yeni pozisyon hesapla - önceki pozisyona delta ekle
    const newPosX = position.x + deltaX;
    const newPosY = position.y + deltaY;
    
    // Scale değerine göre maksimum hareket mesafesi
    const maxOffset = Math.round((scale - 1) * 150); // Daha geniş hareket alanı
    
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
    e.preventDefault(); // Önemli: Varsayılan davranışı engelle
    setDragStart(null);
  };

  // Dokunmatik ekran desteği için touch event handlers
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
    <div className="space-y-2">
      <div className="flex items-center justify-end">
        {thumbnail && !isEditing && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={startEditing}
          >
            <CropIcon className="h-3.5 w-3.5 mr-1" />
            Görseli Düzenle
          </Button>
        )}
      </div>
      
      {thumbnail ? (
        <div className="relative border rounded-md overflow-hidden">
          <div 
            className={`relative w-full aspect-[4/3] max-w-md mx-auto overflow-hidden ${isEditing ? 'cursor-move bg-grid-pattern' : ''}`}
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
              src={thumbnail} 
              alt="Yazı Kapak Görseli" 
              fill 
              sizes="(max-width: 768px) 100vw, 400px"
              className="object-cover"
              priority
              style={{
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                transition: dragStart ? 'none' : 'transform 0.1s ease-out'
              }}
              draggable={false} // Önemli: görüntünün sürüklenmesini engelle
            />
            
            {!isEditing && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs p-2">
                Makalede görüneceği şekil
              </div>
            )}
            
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
                    disabled={isSavingEdit} // Kaydetme sırasında iptal butonu devre dışı
                  >
                    <X className="h-4 w-4 mr-1" />
                    İptal
                  </Button>
                  
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={saveEditing}
                    disabled={isSavingEdit} // Kaydetme sırasında buton devre dışı
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
                
                {/* Kaydetme durumunda bilgilendirici metin eklendi */}
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
                onClick={(e) => {
                  e.stopPropagation();
                  document.getElementById('thumbnail-upload')?.click();
                }}
                disabled={isUploading}
              >
                <Replace className="h-4 w-4 mr-1" />
                Değiştir
              </Button>
              
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleRemoveThumbnail}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
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
                  : "Yazı için kapak görseli eklemek için tıkla veya sürükle"}
              </p>
              <Button 
                variant="outline" 
                onClick={(e) => {
                  e.stopPropagation();
                  document.getElementById('thumbnail-upload')?.click();
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Görsel Seç
              </Button>
            </>
          )}
        </div>
      )}
      <Input
        id="thumbnail-upload"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
