"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Loader2, ArrowLeft, Edit, Eye, MessageCircle, Share2, Check, Copy, Link2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArticleStatus } from "@/models/Article";
import api from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { TracingBeam } from "@/components/ui/tracing-beam";
import { CommentsSection } from "@/components/comment/CommentsSection";
import { LikeButton } from "@/components/button/LikeButton";
import { ARTICLE_TAGS } from "@/lib/constants";

export default function ArticleDetailPage() {
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
  const router = useRouter();
  const [isCopied, setIsCopied] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [copiedBlockId, setCopiedBlockId] = useState<string | null>(null);

  // URL'den makale slug'ını alma
  const getArticleSlug = () => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      const segments = path.split('/');
      return segments[segments.length - 1];
    }
    return null;
  };

  // Makaleyi getirme
  useEffect(() => {
    const articleSlug = getArticleSlug();
    
    if (!articleSlug) {
      setError("Makale bulunamadı");
      setLoading(false);
      return;
    }
    
    const fetchArticle = async () => {
      try {
        const response = await api.get(`/api/articles/slug/${articleSlug}`);
        if (response.data.success) {
          setArticle(response.data.article);
        } else {
          setError("Makale yüklenemedi");
        }
      } catch (err: any) {
        setError("Makale yüklenirken bir hata oluştu");
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, []);

  // Durum bilgisini Türkçe olarak göster
  const getStatusText = (status: ArticleStatus) => {
    switch (status) {
      case ArticleStatus.DRAFT:
        return "Taslak";
      case ArticleStatus.PENDING_APPROVAL:
        return "Onay Bekliyor";
      case ArticleStatus.PUBLISHED:
        return "Yayında";
      case ArticleStatus.ARCHIVED:
        return "Arşivlendi";
      default:
        return status;
    }
  };
  
  // Görüntülenme sayısını kısalt (1000+ → k, 1000000+ → m)
  const formatViewCount = (count: number): string => {
    if (!count && count !== 0) return "0";
    
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
    }
    
    if (count >= 1000) {
      return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    
    return count.toString();
  };

  // Durum badge'i
  const getStatusBadge = (status: ArticleStatus) => {
    switch (status) {
      case ArticleStatus.DRAFT:
        return <Badge variant="outline">Taslak</Badge>;
      case ArticleStatus.PENDING_APPROVAL:
        return <Badge variant="secondary">Onay Bekliyor</Badge>;
      case ArticleStatus.PUBLISHED:
        return <Badge variant="default">Yayında</Badge>;
      case ArticleStatus.ARCHIVED:
        return <Badge variant="destructive">Arşivlendi</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Yazar adını güvenli şekilde getir
  const getAuthorName = () => {
    if (!article || !article.author) return "Anonim";
    
    const firstName = article.author.name || "";
    const lastName = article.author.lastname || "";
    
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim();
    }
    
    return "Anonim";
  };

  // Yazar avatarını güvenli şekilde getir
  const getAuthorAvatar = () => {
    return article?.author?.avatar || "";
  };

  // Yazar baş harflerini güvenli şekilde getir
  const getAuthorInitials = () => {
    if (!article || !article.author) return "?";
    
    const firstName = article.author.name || "";
    const lastName = article.author.lastname || "";
    
    const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : "";
    const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : "";
    
    return firstInitial + lastInitial || "?";
  };

  // Paylaşım butonlarının görünürlüğünü kontrol et
  const isShareable = article?.status === ArticleStatus.PUBLISHED;

  // URL kopyalama fonksiyonu
  const handleCopyLink = async () => {
    // Yazı yayında değilse işlemi engelle
    if (!isShareable) return;
    
    const url = window.location.href;
    
    try {
      await navigator.clipboard.writeText(url);
      setIsLinkCopied(true);
      toast.success("Bağlantı panoya kopyalandı", {
        description: "Arkadaşlarınızla paylaşabilirsiniz"
      });
      
      // 2 saniye sonra kopyalama durumunu sıfırla
      setTimeout(() => {
        setIsLinkCopied(false);
      }, 2000);
    } catch (error) {
      toast.error("Bağlantı kopyalanamadı", {
        description: "Lütfen manuel olarak URL'yi kopyalayın"
      });
    }
  };

  // Paylaşım fonksiyonu - kopyalama değil, sadece doğrudan paylaşım için
  const handleShare = async () => {
    // Yazı yayında değilse işlemi engelle
    if (!isShareable) return;
    
    const url = window.location.href;
    const title = article?.title || "Makale";
    
    // Web Share API destekleniyorsa kullan
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: `${title} | Topluluk`,
          url: url,
        });
        toast.success("Başarıyla paylaşıldı");
      } catch (error) {
        // Kullanıcı paylaşımı iptal ederse veya başka bir hata olursa
      }
    } else {
      toast.info("Paylaşım özelliği tarayıcınız tarafından desteklenmiyor", {
        description: "URL'yi kopyalayıp manuel olarak paylaşabilirsiniz"
      });
    }
  };

  // Kod bloğu kopyalama fonksiyonu
  const handleCopyCode = async (code: string, blockId: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedBlockId(blockId);
      
      toast.success("Kod kopyalandı", {
        description: "Kod panoya kopyalandı"
      });
      
      // 2 saniye sonra kopyalama durumunu sıfırla
      setTimeout(() => {
        setCopiedBlockId(null);
      }, 2000);
    } catch (error) {
      toast.error("Kod kopyalanamadı", {
        description: "Lütfen manuel olarak kodu seçip kopyalayın"
      });
    }
  };

  // Yükleniyor durumu
  if (loading) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-3xl">
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Hata durumu
  if (error) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-3xl">
        <Card>
          <CardContent className="py-10">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-destructive">Hata</h2>
              <p className="text-muted-foreground">{error}</p>
              <Button asChild>
                <Link href="/articles">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Yazılar Sayfasına Dön
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // İçerik yoksa
  if (!article) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-3xl">
        <Card>
          <CardContent className="py-10">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold">Makale Bulunamadı</h2>
              <p className="text-muted-foreground">Aradığınız makale bulunamadı veya erişim izniniz yok.</p>
              <Button asChild>
                <Link href="/articles">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Yazılar Sayfasına Dön
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // İçerik bloklarını renderla
  const renderBlocks = () => {
    if (!article.blocks || !Array.isArray(article.blocks)) {
      return <p className="text-muted-foreground">Bu makale için içerik bulunmuyor.</p>;
    }

    return article.blocks.map((block: any, index: number) => {
      switch (block.type) {
        case "text":
          return (
            <div 
              key={block.id || index} 
              className="prose dark:prose-invert max-w-none my-6 prose-a:text-primary prose-a:underline hover:prose-a:text-primary/80"
              dangerouslySetInnerHTML={{ 
                __html: block.content 
              }}
            />
          );
        
        case "heading":
          const HeadingTag = `h${block.level || 2}` as keyof JSX.IntrinsicElements;
          return (
            <HeadingTag key={block.id || index} className="font-bold my-6">
              {block.content}
            </HeadingTag>
          );
        
        case "image":
          return (
            <figure key={block.id || index} className="my-8">
              {block.imageUrl && (
                <div className="flex flex-col">
                  <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden ">
                    <Image 
                      src={block.imageUrl} 
                      alt={block.content || "Makale görseli"} 
                      fill
                      sizes="(max-width: 768px) 100vw, 768px"
                      className="object-contain"
                    />
                  </div>
                  {block.content && (
                    <figcaption className="text-sm text-center text-muted-foreground mt-2">
                      {block.content}
                    </figcaption>
                  )}
                </div>
              )}
            </figure>
          );
        
        case "code":
          const blockId = block.id || `code-${index}`;
          const language = block.language || "javascript";
          const languageLabel = getLanguageLabel(language);
          
          return (
            <div key={blockId} className="my-6">
              <div className="bg-slate-800 rounded-t-md px-4 py-2 flex justify-between items-center">
                <div className="text-sm text-slate-300">{languageLabel}</div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-slate-300 hover:text-white hover:bg-slate-700"
                  onClick={() => handleCopyCode(block.content || "", blockId)}
                >
                  {copiedBlockId === blockId ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      <span>Kopyalandı</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      <span>Kopyala</span>
                    </>
                  )}
                </Button>
              </div>
              <SyntaxHighlighter
                language={language}
                style={vscDarkPlus}
                showLineNumbers
                customStyle={{
                  margin: 0,
                  borderRadius: '0 0 0.375rem 0.375rem',
                }}
              >
                {block.content || "// Kod yok"}
              </SyntaxHighlighter>
            </div>
          );
        
        default:
          return null;
      }
    });
  };

  // Dil adını daha kullanıcı dostu gösterme
  const getLanguageLabel = (languageKey: string): string => {
    const languageMap: Record<string, string> = {
      "javascript": "JavaScript",
      "typescript": "TypeScript",
      "python": "Python",
      "java": "Java",
      "csharp": "C#",
      "cpp": "C++",
      "c": "C",
      "html": "HTML",
      "css": "CSS",
      "ruby": "Ruby",
      "go": "Go",
      "php": "PHP",
      "swift": "Swift",
      "kotlin": "Kotlin",
      "rust": "Rust",
      "sql": "SQL",
      "bash": "Bash",
      "powershell": "PowerShell",
      "json": "JSON",
      "xml": "XML",
      "yaml": "YAML",
      "markdown": "Markdown",
    };
    
    return languageMap[languageKey] || languageKey;
  };

  // Kullanıcının düzenleme yetkisi olup olmadığını kontrol et
  const canEdit = session?.user?.id === article.author?.id;
  
  // Kullanıcının admin olup olmadığını kontrol et
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPERADMIN";

  return (
    <div className="container mx-auto py-12 px-4 max-w-3xl">
      <div className="mb-6">
        <Button variant="outline" asChild>
          <Link href="/articles">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Yazılar
          </Link>
        </Button>
      </div>

      <article className="space-y-8">
        <div>
          <div className="flex items-center justify-between">
            {getStatusBadge(article.status as ArticleStatus)}
            
            <div className="flex items-center space-x-2">
              <div className="text-sm text-muted-foreground">
                {formatViewCount(article.views || 0)} görüntülenme
              </div>
              
              {/* Beğeni butonu */}
              {article.status === ArticleStatus.PUBLISHED && (
                <LikeButton
                  targetId={article.id}
                  targetType="article"
                  size="sm"
                  variant="outline"
                  showCount={true}
                />
              )}
              
              {canEdit && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/write/${article.id}`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Düzenle
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Yazar bilgileri */}
          <div className="flex items-center space-x-4 mt-4 mb-6">
            <Avatar>
              <AvatarImage src={getAuthorAvatar()} alt={getAuthorName()} />
              <AvatarFallback>{getAuthorInitials()}</AvatarFallback>
            </Avatar>
            
            <div>
              <div className="font-medium">{getAuthorName()}</div>
              <div className="text-sm text-muted-foreground">
                {article.publishedAt ? (
                  <>
                    Yayınlandı: {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true, locale: tr })}
                  </>
                ) : (
                  <>
                    Oluşturuldu: {formatDistanceToNow(new Date(article.createdAt), { addSuffix: true, locale: tr })}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold mt-4 mb-6">{article.title}</h1>
        
        {/* Etiketler - Etiket bölümünü ekle */}
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 my-4">
            <div className="flex items-center text-sm text-muted-foreground mr-1">
              <Tag className="h-4 w-4 mr-1" />
              <span>Etiketler:</span>
            </div>
            {article.tags.map((tag: string) => (
              <Badge 
                key={tag} 
                variant="outline"
                className="text-xs py-0.5"
              >
                {ARTICLE_TAGS.find(t => t.value === tag)?.label || tag}
              </Badge>
            ))}
          </div>
        )}
        
        <Separator />
        <TracingBeam className="px-6">
        <div className="article-content">
          {renderBlocks()}
        </div>
        </TracingBeam>
        <Separator />

        <div className="flex justify-between">
          <Button variant="outline" size="sm" asChild>
            <Link href="/articles">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Yazılar
            </Link>
          </Button>

          {isShareable && (
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleCopyLink}
              >
                {isLinkCopied ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-green-500" />
                    Kopyalandı
                  </>
                ) : (
                  <>
                    <Link2 className="mr-2 h-4 w-4" />
                    Bağlantıyı Kopyala
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleShare}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Paylaş
              </Button>
            </div>
          )}
        </div>
      </article>

      {/* Yorum bölümü (sadece yayında olan makalelerde gösterilir) */}
      {article.status === ArticleStatus.PUBLISHED && (
        <CommentsSection articleId={article.id} isAdmin={isAdmin} />
      )}

      <style jsx global>{`
        .article-content a {
          color: hsl(var(--primary));
          text-decoration: underline;
        }
        
        .article-content a:hover {
          color: hsl(var(--primary) / 0.8);
        }
        
        .article-content .prose {
          max-width: none;
        }
      `}</style>
    </div>
  );
}