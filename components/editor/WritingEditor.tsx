"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Type,
  Heading,
  Image as ImageIcon,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Code,
  ArrowUp,
  ArrowDown,
  Trash2,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TextBlock } from "@/components/editor/TextBlock";
import { HeadingBlock } from "@/components/editor/HeadingBlock";
import { ImageBlock } from "@/components/editor/ImageBlock";
import { CodeBlock } from "@/components/editor/CodeBlock";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUploadImage } from "@/hooks/useUploadImage";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { ArticleStatus } from "@/models/Article";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import Image from "next/image";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ARTICLE_TAGS } from "@/lib/constants";
import { ThumbnailUploader } from "./ThumbnailUploader";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSession } from "next-auth/react";
import { SafeHTML } from "@/components/SafeHTML";

export type BlockType = "text" | "heading" | "image" | "code";

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  level?: number; // For headings
  imageUrl?: string; // For images
  language?: string; // For code blocks
  aspectRatio?: number; // For image aspect ratio
}

// ArticleData tipini güncelle (etiketler için)
export interface ArticleData {
  id?: string;
  title: string;
  blocks: Block[];
  status: ArticleStatus;
  tags: string[];
  thumbnail?: string;
  rejection?: {
    reason: string;
    date: string;
  };
}

export function WritingEditor({ articleData, isEdit = false }: { 
  articleData?: ArticleData; 
  isEdit?: boolean;
}) {
  const [title, setTitle] = useState<string>(articleData?.title || "");
  const [blocks, setBlocks] = useState<Block[]>(() => {
    // Başlatma sırasında varsayılan bir blok ekleyin
    if (!articleData?.blocks || !articleData.blocks.length) {
      return [{ id: `block-${Date.now()}`, type: "text", content: "" }];
    }
    return articleData.blocks;
  });
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(
    // İlk bloğun id'sini seçili olarak ayarlayın
    blocks.length > 0 ? blocks[0].id : null
  );
  const [showTagSelector, setShowTagSelector] = useState<boolean>(false);
  const [selectedTags, setSelectedTags] = useState<string[]>(articleData?.tags || []);
  const [searchTags, setSearchTags] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [thumbnail, setThumbnail] = useState<string | null>(articleData?.thumbnail || null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const endOfContentRef = useRef<HTMLDivElement>(null);
  const { deleteImage } = useUploadImage();
  const router = useRouter();
  const [blockToDelete, setBlockToDelete] = useState<string | null>(null);
  const { data: session } = useSession();

  // articleData değiştiğinde içeriği güncelle
  useEffect(() => {
    if (articleData) {
      
      // Başlığı ayarla
      setTitle(articleData.title || "");

      
      // Thumbnail değerini state'e atarken mutlaka güncelleme yap
      setThumbnail(articleData.thumbnail || null);

      // Etiketleri ayarla
      if (articleData.tags && Array.isArray(articleData.tags)) {
        setSelectedTags(articleData.tags);
      }

      // Blokları ayarla, bloklar varsa ve dizi ise
      if (
        articleData.blocks &&
        Array.isArray(articleData.blocks) &&
        articleData.blocks.length > 0
      ) {
        // Her bloğa benzersiz ID eklendiğinden emin ol
        const formattedBlocks = articleData.blocks.map(
          (block: any, index: number) => ({
            ...block,
            id: block.id || `block-${Date.now()}-${index}`, // Belirleyici ID yoksa oluştur
          })
        );

        setBlocks(formattedBlocks);
        // İlk bloğu seç
        setSelectedBlockId(formattedBlocks[0].id);
      } else {
        // Bloklar yoksa veya geçersizse, varsayılan boş blok oluştur
        setBlocks([{ id: "1", type: "text", content: "" }]);
        setSelectedBlockId("1");
      }
    }
  }, [articleData]);

  // Yeni blok oluşturma fonksiyonu
  const createNewBlock = (type: BlockType, afterId: string) => {
    const newBlock: Block = {
      id: `block-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, // Benzersiz ID'yi garanti et
      type,
      content: "",
      level: type === "heading" ? 2 : undefined,
      language: type === "code" ? "javascript" : undefined, // Varsayılan dil
    };

    // Bloklar boş ise, ilk blok olarak ekle
    if (blocks.length === 0) {
      const newBlocks = [newBlock]; 
      setBlocks(newBlocks);
      setSelectedBlockId(newBlock.id);
      return;
    }

    // afterId boş veya null ise, sona ekle
    if (!afterId) {
      const newBlocks = [...blocks, newBlock];
      setBlocks(newBlocks);
      setSelectedBlockId(newBlock.id);
      return;
    }

    const afterIndex = blocks.findIndex((block) => block.id === afterId);
    
    if (afterIndex === -1) {
      // Belirtilen id'ye sahip blok bulunamadıysa, son bloğun sonuna ekle
      const newBlocks = [...blocks, newBlock];
      setBlocks(newBlocks);
    } else {
      const newBlocks = [...blocks];
      newBlocks.splice(afterIndex + 1, 0, newBlock);
      setBlocks(newBlocks);
    }

    // Yeni bloğu seç
    setSelectedBlockId(newBlock.id);

    // Scroll to the new block
    setTimeout(() => {
      endOfContentRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Blok içeriğini güncelleme fonksiyonu
  const updateBlockContent = (id: string, content: string) => {
    setBlocks(
      blocks.map((block) => (block.id === id ? { ...block, content } : block))
    );
  };

  // Blok yapılandırmasını güncelleme fonksiyonu
  const updateBlockConfig = (id: string, config: Partial<Block>) => {
    setBlocks(
      blocks.map((block) => (block.id === id ? { ...block, ...config } : block))
    );
  };

  // Blok silme fonksiyonu
  const deleteBlock = async (id: string) => {
    // Eğer son blok ise silme
    if (blocks.length === 1) {
      toast.error("En az bir blok bulunmalıdır");
      return;
    }

    const blockToDelete = blocks.find((block) => block.id === id);
    const deletedIndex = blocks.findIndex((block) => block.id === id);
    const newBlocks = blocks.filter((block) => block.id !== id);

    // Önce blokları güncelle, UI'ı hızlı yanıt verir hale getir
    setBlocks(newBlocks);

    // Silinenden sonraki veya önceki bloğu seç
    if (newBlocks.length > 0) {
      if (deletedIndex < newBlocks.length) {
        setSelectedBlockId(newBlocks[deletedIndex].id);
      } else {
        setSelectedBlockId(newBlocks[newBlocks.length - 1].id);
      }
    } else {
      setSelectedBlockId(null);
    }

    // Başarılı bildirim göster
    toast.success("Blok başarıyla silindi");

    // Eğer görsel varsa, Cloudinary'den de sil
    if (blockToDelete?.type === "image" && blockToDelete.imageUrl) {
      try {
        await deleteImage(blockToDelete.imageUrl);
      } catch (error) {
        toast.error("Görsel silinirken hata oluştu");
      }
    }
  };

  // Silme onay işlemi
  const handleDeleteConfirmation = (id: string) => {
    setBlockToDelete(id);
  };

  const confirmDeleteBlock = async () => {
    if (blockToDelete) {
      await deleteBlock(blockToDelete);
      setBlockToDelete(null);
    }
  };

  const cancelDeleteBlock = () => {
    setBlockToDelete(null);
  };

  // Blok taşıma fonksiyonu
  const moveBlock = (id: string, direction: "up" | "down") => {
    const blockIndex = blocks.findIndex((block) => block.id === id);

    // Eğer ilk blok yukarı veya son blok aşağı taşınmaya çalışılıyorsa, işlemi yapma
    if (
      (blockIndex === 0 && direction === "up") ||
      (blockIndex === blocks.length - 1 && direction === "down")
    ) {
      return;
    }

    const newBlocks = [...blocks];
    const targetIndex = direction === "up" ? blockIndex - 1 : blockIndex + 1;

    // Seçilen bloğu taşı
    [newBlocks[blockIndex], newBlocks[targetIndex]] = [
      newBlocks[targetIndex],
      newBlocks[blockIndex],
    ];

    setBlocks(newBlocks);
  };

  // Önizleme modunu değiştir
  const togglePreviewMode = () => {
    setIsPreviewMode(!isPreviewMode);
    // Önizleme modunda blok seçimini kaldır
    if (!isPreviewMode) {
      setSelectedBlockId(null);
    } else {
      setSelectedBlockId(blocks[0]?.id || null);
    }
  };

  // Etiket ekleme fonksiyonu
  const handleAddTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Etiket kaldırma fonksiyonu
  const handleRemoveTag = (tag: string) => {
    setSelectedTags(selectedTags.filter((t) => t !== tag));
  };

  // Filtrelenmiş etiketleri hesapla
  const filteredTags = ARTICLE_TAGS.filter(
    (tag) =>
      tag.label.toLowerCase().includes(searchTags.toLowerCase()) ||
      tag.value.toLowerCase().includes(searchTags.toLowerCase())
  );

  // Yazıyı kaydetme fonksiyonu
  const saveArticle = async () => {
    if (!title.trim()) {
      toast.error("Lütfen bir başlık ekleyin");
      return;
    }

    // Boş blokları kontrol et
    const hasEmptyBlock = blocks.some(
      (block) => !block.content.trim() && block.type !== "image"
    );

    // Görselleri kontrol et - en az bir resim olmalı
    const hasImages = blocks.some(
      (block) => block.type === "image" && block.imageUrl
    );

    if (hasEmptyBlock) {
      toast.error("Lütfen tüm metin bloklarını doldurun veya silin");
      return;
    }

    if (!hasImages) {
      toast.warning("Yazınız için en az bir görsel eklemeniz önerilir", {
        action: {
          label: "Tamam",
          onClick: () => {},
        },
      });
    }

    // API'ye göndermeden önce her bloğu doğrula ve temizle
    const validBlocks = blocks.map(block => {
      // Her bloğun bir ID'si olduğundan emin ol
      const blockId = `block-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      return {
        // Blok temel özellikleri
        id: blockId,
        type: block.type,
        content: block.content || "",
        
        // Koşullu özellikler (yalnızca gerekli olanları dahil et)
        ...(block.type === "heading" ? { level: block.level || 2 } : {}),
        ...(block.type === "image" ? { imageUrl: block.imageUrl || "" } : {}),
        ...(block.type === "code" ? { language: block.language || "javascript" } : {}),
        ...(block.type === "image" && block.aspectRatio ? { aspectRatio: block.aspectRatio } : {})
      };
    });

    setIsSaving(true);

    try {
      // İsteği göndermeden önce tüm veriyi kontrol et
      const requestData = {
        title: title.trim(),
        blocks: validBlocks,
        tags: selectedTags || [],
        status: "draft", // String olarak gönder
        thumbnail: thumbnail || null
      };


      if (isEdit && articleData?.id) {
        // Makaleyi güncelle - string durumu kullan
        await api.patch(`/api/articles/${articleData.id}`, requestData);
        toast.success("Yazınız başarıyla güncellendi");
      } else {
        // Yeni makale oluştur - string durumu kullan
        await api.post("/api/articles", requestData);
        toast.success("Yazınız başarıyla kaydedildi");
      }

      // Başarılı kayıt sonrası yazılar sayfasına yönlendir
      router.push("/articles");
    } catch (error: any) {
      
      // Daha detaylı hata mesajları
      const errorMessage = "Yazınız kaydedilirken bir hata oluştu";
      
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Makalenin onaya gönderilmesi
  const handleSubmitForApproval = async () => {
    if (!title.trim()) {
      toast.error("Lütfen bir başlık girin");
      return;
    }

    if (blocks.length === 0 || (blocks.length === 1 && !blocks[0].content)) {
      toast.error("Makale içeriği boş olamaz");
      return;
    }

    // Etiket kontrolü - en az 1 etiket zorunlu
    if (!selectedTags || selectedTags.length === 0) {
      toast.error("En az bir etiket eklemeniz gerekmektedir");
      return;
    }


    // Null, empty string veya undefined kontrolü
    if (!thumbnail || thumbnail === "") {
      toast.error("Kapak görseli eklemek zorunludur. Lütfen bir kapak görseli ekleyin.");
      return;
    }

    // API'ye göndermeden önce her bloğu doğrula ve temizle
    const validBlocks = blocks.map(block => {
      // Her bloğun bir ID'si olduğundan emin ol
      const blockId = `block-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      return {
        // Blok temel özellikleri
        id: blockId,
        type: block.type,
        content: block.content || "",
        
        // Koşullu özellikler (yalnızca gerekli olanları dahil et)
        ...(block.type === "heading" ? { level: block.level || 2 } : {}),
        ...(block.type === "image" ? { imageUrl: block.imageUrl || "" } : {}),
        ...(block.type === "code" ? { language: block.language || "javascript" } : {}),
        ...(block.type === "image" && block.aspectRatio ? { aspectRatio: block.aspectRatio } : {})
      };
    });

    setIsSaving(true);

    try {
      // İsteği göndermeden önce tüm veriyi kontrol et
      const requestData = {
        title: title.trim(),
        blocks: validBlocks,
        tags: selectedTags || [],
        status: "pending_approval", // String olarak gönder
        thumbnail: thumbnail // Thumbnail'i açıkça dahil et
      };


      if (isEdit && articleData?.id) {
        // Mevcut makaleyi güncelle
        // Kullanıcı admin mi kontrol et
        const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPERADMIN";
        const apiRoute = isAdmin 
          ? `/api/admin/articles/${articleData.id}` 
          : `/api/articles/${articleData.id}`;

        // Uygun API rotasını kullanarak makaleyi güncelle
        await api.patch(apiRoute, requestData);
        toast.success("Makaleniz onay için gönderildi");
      } else {
        // Yeni makale oluştur
        await api.post("/api/articles", requestData);
        toast.success("Makaleniz onay için gönderildi");
      }
      
      router.push("/articles");
    } catch (error: any) {
      
      // Daha detaylı hata yakalama
      const errorResponse = error.response?.data;
      let errorMessage = "Makale gönderilemedi";
      
      if (errorResponse) {
        errorMessage = "Makale gönderilirken bir hata oluştu";
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Etiket seçimi alanı için getTagOption fonksiyonu
  const getTagLabel = (tagValue: string): string => {
    const tag = ARTICLE_TAGS.find(t => t.value === tagValue);
    return tag ? tag.label : tagValue;
  };

  // Bileşen mount olduğunda, blok yoksa varsayılan bir blok ekle
  useEffect(() => {
    // Bloklar boşsa ve yeni bir yazı oluşturuluyorsa (isEdit === false), ilk bloğu ekle
    if (blocks.length === 0 && !isEdit) {
      const initialBlock: Block = { 
        id: `block-${Date.now()}`, 
        type: "text", 
        content: "" 
      };
      setBlocks([initialBlock]);
      setSelectedBlockId(initialBlock.id);
    }
  }, [blocks.length, isEdit]);

  return (
    <div className="space-y-6">
      {/* Reddetme nedeni varsa göster */}
      {articleData?.rejection?.reason && (
          <div className="mt-4 p-4 border border-red-200 bg-red-50 rounded-md">
            <h3 className="text-red-700 font-medium mb-1">Reddedilme Nedeni:</h3>
            <p className="text-red-600">{articleData.rejection.reason}</p>
            <p className="text-xs text-red-500 mt-2">
              {articleData.rejection.date &&
                `Reddedilme tarihi: ${format(
                  new Date(articleData.rejection.date),
                  "dd MMMM yyyy",
                  { locale: tr }
                )}`}
            </p>
          </div>
        )}
      <div className="flex flex-col md:flex-row justify-between mb-6 gap-3">
        

        <div className="mb-8 flex-1">
          {/* Başlık inputu daha belirgin hale getirildi */}
          <div className="mb-2">
            <Label htmlFor="title" className="text-lg font-medium">
              Başlık
            </Label>
            <Input
              id="title"
              className={cn(
                "text-l font-bold mt-1 border-2 px-3 py-2 focus-visible:ring-2 focus-visible:ring-offset-2 h-auto text-foreground placeholder:text-muted-foreground/50",
                isPreviewMode ? "pointer-events-none bg-transparent" : ""
              )}
              placeholder="Makalenizin başlığını yazın..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              readOnly={isPreviewMode}
            />
          </div>
        </div>

        <div className="flex gap-2 justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={togglePreviewMode}
            className="gap-2"
          >
            {isPreviewMode ? (
              <>
                <EyeOff className="h-4 w-4" />
                <span>Düzenle</span>
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                <span>Önizle</span>
              </>
            )}
          </Button>

          <Button
            onClick={saveArticle}
            disabled={isSaving}
            className="gap-2"
            size="sm"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            <Save className="h-4 w-4" />
            <span>Kaydet</span>
          </Button>
        </div>
      </div>

      {/* Kapak görseli yükleme bölümü - Zorunlu olduğuna dair bilgi eklendi */}
      <div className="space-y-2">
        <Label className="text-lg font-medium flex items-center">
          Kapak Görseli
          <Badge variant="destructive" className="ml-2">Zorunlu</Badge>
        </Label>
        <ThumbnailUploader 
          initialThumbnail={thumbnail || undefined} 
          onThumbnailChange={(url) => {
            setThumbnail(url);
          }}
        />
        {!thumbnail && (
          <p className="text-sm text-destructive mt-1">
            * Makalenizi onaya göndermeden önce kapak görseli eklemeniz zorunludur.
          </p>
        )}
      </div>

      {/* İçerik blokları */}
      <div className={cn("space-y-6", isPreviewMode ? "article-preview" : "")}>
        {blocks.length > 0 ? (
          blocks.map((block) => (
            <div
              key={block.id}
              className={cn(
                "relative group",
                !isPreviewMode && selectedBlockId === block.id
                  ? "ring-2 ring-primary/20 rounded-md"
                  : ""
              )}
            >
              {!isPreviewMode && (
                <>
                  {/* Silme butonu - mobil ve masaüstü uyumlu */}
                  <div className="absolute right-0 md:-right-12 top-0 flex flex-col gap-1 p-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                variant="destructive"
                                size="icon"
                                className="h-6 w-6 md:h-8 md:w-8 rounded-full shadow-md"
                                onClick={() => handleDeleteConfirmation(block.id)}
                                >
                                <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Bu bloğu silmek istediğinize emin misiniz?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Bu işlem geri alınamaz. Bu blok kalıcı olarak silinecektir.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={cancelDeleteBlock}>İptal</AlertDialogCancel>
                                <AlertDialogAction onClick={confirmDeleteBlock} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Sil
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Bloğu sil</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </>
              )}

              {!isPreviewMode ? (
                <Card className="border-0 shadow-none">
                  <CardContent className="p-2 pt-8 md:p-2">
                    {block.type === "text" && (
                      <TextBlock
                        block={block}
                        updateContent={updateBlockContent}
                        isSelected={selectedBlockId === block.id}
                        onSelect={() => setSelectedBlockId(block.id)}
                      />
                    )}

                    {block.type === "heading" && (
                      <HeadingBlock
                        block={block}
                        updateContent={updateBlockContent}
                        updateConfig={updateBlockConfig}
                        isSelected={selectedBlockId === block.id}
                        onSelect={() => setSelectedBlockId(block.id)}
                      />
                    )}

                    {block.type === "image" && (
                      <ImageBlock
                        block={block}
                        updateContent={updateBlockContent}
                        updateConfig={updateBlockConfig}
                        isSelected={selectedBlockId === block.id}
                        onSelect={() => setSelectedBlockId(block.id)}
                      />
                    )}

                    {block.type === "code" && (
                      <CodeBlock
                        block={block}
                        updateContent={updateBlockContent}
                        updateConfig={updateBlockConfig}
                        isSelected={selectedBlockId === block.id}
                        onSelect={() => setSelectedBlockId(block.id)}
                      />
                    )}
                  </CardContent>
                </Card>
              ) : (
                // Önizleme modunda içerik
                <>
                  {block.type === "text" && (
                    <SafeHTML 
                      html={block.content} 
                      className="prose dark:prose-invert max-w-none prose-a:text-primary prose-a:underline hover:prose-a:text-primary/80"
                    />
                  )}

                  {block.type === "heading" && (
                    <div className="my-4">
                      {block.level === 1 && (
                        <h1 className="text-4xl font-bold">{block.content}</h1>
                      )}
                      {block.level === 2 && (
                        <h2 className="text-3xl font-semibold">
                          {block.content}
                        </h2>
                      )}
                      {block.level === 3 && (
                        <h3 className="text-2xl font-medium">{block.content}</h3>
                      )}
                      {block.level === 4 && (
                        <h4 className="text-xl font-medium">{block.content}</h4>
                      )}
                    </div>
                  )}

                  {block.type === "image" && block.imageUrl && (
                    <div className="my-6">
                      <div 
                        className="relative w-full rounded-md overflow-hidden "
                        style={{ 
                          // Padding yerine sabit yükseklik kullanıyoruz
                          height: "400px"
                        }}
                      >
                        <Image
                          src={block.imageUrl}
                          alt={block.content || "Görsel"}
                          fill
                          className="object-contain" // object-cover yerine object-contain kullanarak görüntünün tamamını gösteriyoruz
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          priority={true}
                        />
                      </div>
                      {block.content && (
                        <p className="text-sm text-center text-muted-foreground mt-2">
                          {block.content}
                        </p>
                      )}
                    </div>
                  )}

                  {block.type === "code" && (
                    <div className="my-6">
                      <SyntaxHighlighter
                        language={block.language || "javascript"}
                        style={vscDarkPlus}
                        showLineNumbers
                        customStyle={{
                          margin: 0,
                          borderRadius: "0.375rem",
                        }}
                      >
                        {block.content || "// Boş kod bloğu"}
                      </SyntaxHighlighter>
                    </div>
                  )}
                </>
              )}

              {/* Blok taşıma butonları - mobil ve masaüstü uyumlu */}
              {!isPreviewMode && (
                <div className="absolute left-0 md:-left-10 top-0 flex flex-row md:flex-col gap-1 bg-background/80 md:bg-transparent rounded-md p-1 md:p-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-6 w-6 md:h-8 md:w-8 rounded-full bg-background shadow-md"
                          onClick={() => moveBlock(block.id, "up")}
                          disabled={blocks.indexOf(block) === 0}
                        >
                          <ArrowUp className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Yukarı taşı</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-6 w-6 md:h-8 md:w-8 rounded-full bg-background shadow-md"
                          onClick={() => moveBlock(block.id, "down")}
                          disabled={blocks.indexOf(block) === blocks.length - 1}
                        >
                          <ArrowDown className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Aşağı taşı</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}

              {/* Bloklar arası içerik ekleme butonu - her zaman görünür */}
              {!isPreviewMode && (
                <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="default"
                        size="icon"
                        className="h-10 w-10 rounded-full shadow-md"
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-48">
                      <DropdownMenuItem
                        onClick={() => createNewBlock("text", block.id)}
                        className="p-3 cursor-pointer"
                      >
                        <Type className="h-4 w-4 mr-2" />
                        <span>Metin</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => createNewBlock("heading", block.id)}
                        className="p-3 cursor-pointer"
                      >
                        <Heading className="h-4 w-4 mr-2" />
                        <span>Alt Başlık</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => createNewBlock("image", block.id)}
                        className="p-3 cursor-pointer"
                      >
                        <ImageIcon className="h-4 w-4 mr-2" />
                        <span>Görsel</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => createNewBlock("code", block.id)}
                        className="p-3 cursor-pointer"
                      >
                        <Code className="h-4 w-4 mr-2" />
                        <span>Kod Bloğu</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          ))
        ) : (
          // Blok yoksa burada yeni bir blok eklemek için bir buton göster
          <div className="text-center py-10 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground mb-4">Henüz içerik eklenmemiş</p>
            <Button onClick={() => createNewBlock("text", "")}>
              <Plus className="h-4 w-4 mr-2" />
              İçerik Ekle
            </Button>
          </div>
        )}

        <div ref={endOfContentRef} />
      </div>

      {/* Kaydetme butonu - mobil uyumlu için alt kısımda göster */}
      <div className="flex justify-end mt-8 md:hidden">
        <Button
          onClick={saveArticle}
          disabled={isSaving}
          className="gap-2 w-full"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          <Save className="h-4 w-4" />
          <span>Kaydet</span>
        </Button>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={saveArticle}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Kaydediliyor...
            </>
          ) : (
            "Taslak Olarak Kaydet"
          )}
        </Button>

        <Button
          type="button"
          onClick={handleSubmitForApproval}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gönderiliyor...
            </>
          ) : (
            "Onaya Gönder"
          )}
        </Button>
      </div>

      {/* Etiket seçimi alanı - Arama özelliği eklendi */}
      <div className="space-y-2">
        <Label className="text-lg font-medium flex items-center">
          Etiketler
          <Badge variant="destructive" className="ml-2">Zorunlu</Badge>
        </Label>
        <div className="flex flex-wrap gap-2 p-3 border-2 rounded-md min-h-12">
          {selectedTags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="flex items-center gap-1 py-1.5"
            >
              {getTagLabel(tag)}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 h-4 w-4 rounded-full hover:bg-destructive/20 inline-flex items-center justify-center"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </Badge>
          ))}

          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7"
            onClick={() => setShowTagSelector(!showTagSelector)}
            disabled={selectedTags.length >= 6}
          >
            {showTagSelector ? "Gizle" : selectedTags.length >= 6 ? "Maksimum 6 etiket" : "Etiket Ekle"}
          </Button>
        </div>

        {showTagSelector && (
          <div className="border rounded-md p-2">
            <div className="mb-2">
              <Input
                placeholder="Etiket ara..."
                value={searchTags}
                onChange={(e) => setSearchTags(e.target.value)}
                className="w-full"
              />
            </div>
            <ScrollArea className="h-36 w-full">
              <div className="flex flex-wrap gap-2">
                {filteredTags.length > 0 ? (
                  filteredTags.map((tag) => (
                    <Badge
                      key={tag.value}
                      variant={
                        selectedTags.includes(tag.value) ? "default" : "outline"
                      }
                      className={`cursor-pointer flex items-center gap-1 py-1.5 ${
                        selectedTags.includes(tag.value) 
                          ? "" 
                          : selectedTags.length >= 6 
                            ? "opacity-50 cursor-not-allowed" 
                            : ""
                      }`}
                      onClick={() => {
                        if (selectedTags.includes(tag.value)) {
                          handleRemoveTag(tag.value);
                        } else if (selectedTags.length < 6) {
                          handleAddTag(tag.value);
                        }
                      }}
                    >
                      {tag.label}
                      {selectedTags.includes(tag.value) && (
                        <Check className="ml-1 h-3 w-3" />
                      )}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground p-2">
                    Etiket bulunamadı
                  </p>
                )}
              </div>
            </ScrollArea>
            <div className="text-xs text-muted-foreground mt-2 text-right">
              {selectedTags.length}/6 etiket seçildi
            </div>
            {selectedTags.length === 0 && (
              <p className="text-xs text-destructive mt-1">
                * Makalenizi onaya göndermeden önce en az bir etiket seçmeniz zorunludur.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
