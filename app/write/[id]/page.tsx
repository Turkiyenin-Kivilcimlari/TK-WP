"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, redirect } from "next/navigation";
import { Loader2 } from "lucide-react";
import { WritingEditor } from "@/components/editor/WritingEditor";
import api from "@/lib/api";
import { toast } from "sonner";

// Makale düzenleme sayfası
export default function EditArticlePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [articleId, setArticleId] = useState<string>("");
  
  useEffect(() => {
    // URL'den makale kimliğini al
    if (typeof window !== "undefined") {
      const pathSegments = window.location.pathname.split('/');
      const id = pathSegments[pathSegments.length - 1];
      
      if (id) {
        setArticleId(id);
      } else {
        toast.error('Makale kimliği bulunamadı');
        router.push('/articles');
      }
    }
  }, [router]);
  
  // Makaleyi getir
  const fetchArticle = async () => {
    if (!articleId) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/api/articles/${articleId}`);
      
      
      // API'den gelen blok verilerini düzenleyerek editor formatına uyarla
      const articleData = response.data.article;
      
      
      // Blokları editor formatına uygun hale getir (her bloğa benzersiz id ekle)
      const formattedBlocks = articleData.blocks.map((block: any, index: number) => ({
        ...block,
        id: block.id || `block-${index+1}` // Block ID'si yoksa oluştur
      }));
      
      // Düzenlenmiş makale verisini ayarla
      setArticle({
        ...articleData,
        blocks: formattedBlocks
      });
    } catch (error: any) {
      toast.error('Makale yüklenirken bir hata oluştu');
      router.push('/articles');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (session?.user && articleId) {
      fetchArticle();
    }
  }, [articleId, session]);
  
  // Oturum yükleniyor
  if (status === "loading") {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  // Oturum yoksa giriş sayfasına yönlendir
  if (status === "unauthenticated") {
    redirect("/signin?callbackUrl=/write");
    return null;
  }
  
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Yazı Düzenle</h1>
      <WritingEditor articleData={article} isEdit={true} />
    </div>
  );
}
