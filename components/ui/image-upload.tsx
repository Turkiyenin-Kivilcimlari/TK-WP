"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Image as ImageIcon, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function ImageUpload({
  value,
  onChange,
  disabled = false,
  className
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  
  useEffect(() => {
    setPreview(value);
  }, [value]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) return;
    
    // Resim dosya tipini kontrol et
    if (!file.type.startsWith('image/')) {
      toast.error('Lütfen resim dosyası seçin');
      return;
    }

    // Dosya boyutunu kontrol et (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Resim dosyası 5MB\'tan küçük olmalıdır');
      return;
    }

    try {
      setIsUploading(true);
      
      // FormData oluştur
      const formData = new FormData();
      formData.append('image', file);
      
      // API'ye yükle
      const response = await api.post('/api/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data?.url) {
        setPreview(response.data.url);
        onChange(response.data.url);
        toast.success('Resim başarıyla yüklendi');
      } else {
        throw new Error('Resim URL\'i alınamadı');
      }
    } catch (error) {
      toast.error('Resim yüklenemedi');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange('');
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => document.getElementById('imageUpload')?.click()}
          disabled={disabled || isUploading}
          className="w-full gap-2"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {preview ? 'Resmi Değiştir' : 'Resim Yükle'}
        </Button>
        
        <input
          id="imageUpload"
          type="file"
          accept="image/*"
          onChange={handleUpload}
          disabled={disabled || isUploading}
          className="hidden"
        />
        
        {preview && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={handleRemove}
            disabled={disabled || isUploading}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {isUploading && (
        <div className="text-sm text-muted-foreground animate-pulse">
          Resim yükleniyor...
        </div>
      )}
      
      {preview && (
        <div className="rounded-md overflow-hidden border relative aspect-video w-full">
          <Image
            src={preview}
            alt="Yüklenen resim"
            fill
            className="object-cover"
          />
        </div>
      )}
      
      {!preview && !isUploading && (
        <div className="border rounded-md flex flex-col items-center justify-center p-6 text-muted-foreground h-[200px]">
          <ImageIcon className="h-10 w-10 mb-2 opacity-50" />
          <p className="text-sm">Resim yüklemek için tıklayın</p>
        </div>
      )}
    </div>
  );
}
