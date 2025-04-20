"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import { Loader2, Edit, Eye, Filter, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import api from "@/lib/api";
import { ArticleStatus } from "@/models/Article";
import Link from "next/link";

// Makale listesi türü
interface Article {
  id: string;
  title: string;
  slug: string;
  status: ArticleStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  views: number;
  rejection?: { reason: string; date: string };
}

export default function MyArticlesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Silme modal durumu
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<Article | null>(null);
  
  // Makale silme işlemini başlat
  const handleDeleteClick = (article: Article) => {
    setArticleToDelete(article);
    setIsDeleteDialogOpen(true);
  };
  
  // Makale silme işlemini iptal et
  const cancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setArticleToDelete(null);
  };
  
  // Makale silme işlemini onayla
  const confirmDelete = async () => {
    if (!articleToDelete) return;
    
    try {
      await api.delete(`/api/articles/${articleToDelete.id}`);
      toast.success("Makale başarıyla silindi");
      // Listeyi güncelle
      fetchArticles(currentPage, statusFilter !== "all" ? statusFilter : undefined);
    } catch (error) {
      toast.error("Makale silinirken bir hata oluştu");
    } finally {
      setIsDeleteDialogOpen(false);
      setArticleToDelete(null);
    }
  };
  
  // Makaleleri getir
  const fetchArticles = async (page = 1, status?: string) => {
    setLoading(true);
    try {
      let url = `/api/articles?page=${page}&limit=10`;
      if (status && status !== "all") {
        url += `&status=${status}`;
      }
      
      const response = await api.get(url);
      const data = response.data;
      
      // ID alanını düzgün şekilde işle
      interface ApiArticle {
        _id?: string;
        id?: string;
        slug: string;
        title: string;
        status: ArticleStatus;
        createdAt: string;
        updatedAt: string;
        publishedAt?: string;
        views: number;
      }

      const processedArticles: Article[] = data.articles.map((article: ApiArticle) => {
        const id = article._id?.toString() || article.id?.toString();
        return {
          ...article,
          id: id || '' // Eğer id değeri yoksa boş string dön, undefined değil
        };
      });
      
      setArticles(processedArticles);
      setTotalPages(data.pages);
      setCurrentPage(data.page);
    } catch (error) {
      toast.error("Makaleler yüklenirken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  // Sayfa değiştiğinde makaleleri yeniden getir
  const handlePageChange = (page: number) => {
    fetchArticles(page, statusFilter !== "all" ? statusFilter : undefined);
  };

  // Durum filtresi değiştiğinde makaleleri yeniden getir
  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    fetchArticles(1, value !== "all" ? value : undefined);
  };
  
  // Makale durumuna göre badge rengi
  const getStatusBadge = (article: Article) => {
    // Reddedilmiş makale ise (draft durumunda ama rejection bilgisi var)
    if (article.status === ArticleStatus.DRAFT && article.rejection?.reason) {
      return (
        <Badge variant="destructive">Reddedildi</Badge>
      );
    }
    
    // Diğer durumlar için mevcut yapıyı kullan
    switch (article.status) {
      case ArticleStatus.DRAFT:
        return <Badge variant="outline">Taslak</Badge>;
      case ArticleStatus.PENDING_APPROVAL:
        return <Badge variant="secondary">İnceleniyor</Badge>;
      case ArticleStatus.PUBLISHED:
        return <Badge variant="default">Yayında</Badge>;
      case ArticleStatus.ARCHIVED:
        return <Badge variant="secondary">Arşivlenmiş</Badge>;
      default:
        return <Badge variant="outline">{article.status}</Badge>;
    }
  };

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
  
  // Durum badge'inin rengini belirle
  const getStatusBadgeVariant = (status: ArticleStatus) => {
    switch (status) {
      case ArticleStatus.DRAFT:
        return "outline";
      case ArticleStatus.PENDING_APPROVAL:
        return "secondary";
      case ArticleStatus.PUBLISHED:
        return "default";
      case ArticleStatus.ARCHIVED:
        return "destructive";
      default:
        return "default";
    }
  };

  // Tarih formatla
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "d MMM yyyy HH:mm", { locale: tr });
  };

  // Sayfa yüklendiğinde makaleleri getir
  useEffect(() => {
    if (session?.user) {
      fetchArticles();
    }
  }, [session]);

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
    redirect("/signin?callbackUrl=/my-articles");
  }

  return (
    <div className="justify-center items-center flex">
      
    <div className="container py-8 px-4 max-w-6xl ">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Yazılarım</h1>
          <p className="text-muted-foreground mt-1">
            Tüm yazılarınızı buradan yönetebilirsiniz
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button asChild>
            <Link href="/write">
              <Edit className="mr-2 h-4 w-4" /> Yeni Yazı Oluştur
            </Link>
          </Button>
        </div>
      </div>
      <div className="mb-4 flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filtrele:</span>
          <Select defaultValue="all" onValueChange={handleStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tüm Yazılar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Yazılar</SelectItem>
              <SelectItem value={ArticleStatus.PUBLISHED}>Yayındakiler</SelectItem>
              <SelectItem value={ArticleStatus.PENDING_APPROVAL}>Onay Bekleyenler</SelectItem>
              <SelectItem value={ArticleStatus.DRAFT}>Taslaklar</SelectItem>
              <SelectItem value={ArticleStatus.ARCHIVED}>Arşivlenenler</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 md:hidden">
        {loading ? (
          <div className="col-span-full flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : articles.length === 0 ? (
          <div className="col-span-full text-center py-20">
            <p className="text-muted-foreground mb-4">Henüz yazınız bulunmuyor</p>
            <Button asChild>
              <Link href="/write">
                <Edit className="mr-2 h-4 w-4" /> Yeni Yazı Oluştur
              </Link>
            </Button>
          </div>
        ) : (
          articles.map((article) => (
            <Card key={article.id} className="flex flex-col h-full">
              <CardContent className="p-4 flex flex-col h-full">
                <div className="mb-2 flex justify-between items-start">
                  <h3 className="font-medium truncate pr-4">{article.title}</h3>
                  {getStatusBadge(article)}
                </div>
                
                {article.status === ArticleStatus.DRAFT && article.rejection?.reason && (
                  <div className="mb-3 p-2 bg-red-50 rounded text-xs">
                    <p className="text-xs text-red-600 font-medium">Reddedilme nedeni:</p>
                    <p className="text-xs text-red-600">{article.rejection.reason}</p>
                  </div>
                )}
                
                <div className="mt-auto grid grid-cols-3 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      if (article.id) {
                        router.push(`/articles/${article.slug}`);
                      } else {
                        toast.error("Makale kimliği bulunamadı");
                      }
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" /> Görüntüle
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      if (article.id) {
                        router.push(`/write/${article.id}`);
                      } else {
                        toast.error("Makale kimliği bulunamadı");
                      }
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" /> Düzenle
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    className="w-full"
                    onClick={() => handleDeleteClick(article)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Sil
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      <Card className="md:block hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground mb-4">Henüz yazınız bulunmuyor</p>
              <Button asChild>
                <Link href="/write">
                  <Edit className="mr-2 h-4 w-4" /> Yeni Yazı Oluştur
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Başlık</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Oluşturulma</TableHead>
                    <TableHead>Güncellenme</TableHead>
                    <TableHead>Görüntülenme</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {articles.map((article) => (
                    <TableRow key={article.id}>
                      <TableCell className="font-medium">{article.title}</TableCell>
                      <TableCell>{getStatusBadge(article)}</TableCell>
                      <TableCell>{formatDate(article.createdAt)}</TableCell>
                      <TableCell>{formatDate(article.updatedAt)}</TableCell>
                      <TableCell>{article.views || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              if (article.id) {
                                router.push(`/articles/${article.slug}`);
                              } else {
                                toast.error("Makale kimliği bulunamadı");
                              }
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              if (article.id) {
                                router.push(`/write/${article.id}`);
                              } else {
                                toast.error("Makale kimliği bulunamadı");
                              }
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteClick(article)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {!loading && articles.length > 0 && totalPages > 1 && (
          <CardFooter className="flex justify-center p-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => {
                      if (currentPage === 1) return;
                      handlePageChange(currentPage - 1);
                    }}
                    className={currentPage === 1 ? "opacity-50 cursor-not-allowed" : ""}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      isActive={currentPage === page}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => {
                      if (currentPage === totalPages) return;
                      handlePageChange(currentPage + 1);
                    }}
                    className={currentPage === totalPages ? "opacity-50 cursor-not-allowed" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </CardFooter>
        )}
      </Card>

      {/* Silme Onay Dialogu */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Makaleyi Sil</DialogTitle>
            <DialogDescription>
              Bu makaleyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          {articleToDelete && (
            <div className="py-3">
              <h4 className="font-medium">{articleToDelete.title}</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {getStatusText(articleToDelete.status as ArticleStatus)} • 
                Oluşturulma: {formatDate(articleToDelete.createdAt)}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={cancelDelete}>İptal</Button>
            <Button variant="destructive" onClick={confirmDelete}>Sil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}
