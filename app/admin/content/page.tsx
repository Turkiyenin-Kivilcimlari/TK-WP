"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { UserRole } from "@/models/User";
import { ArticleStatus } from "@/models/Article";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  Calendar,
  User,
  Eye,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Filter,
  Search,
  RefreshCw,
  ArrowUpDown,
  Trash2,
  Tag,
  ImageIcon,
  Settings,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import api from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ARTICLE_TAGS } from "@/lib/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const sanitizeAndTruncateHTML = (html: string, maxLength: number = 150) => {
  const plainText = html.replace(/<[^>]*>/g, "");
  if (plainText.length <= maxLength) return plainText;
  return plainText.substring(0, maxLength) + "...";
};

const formatViewCount = (views: number): string => {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (views >= 1000) {
    return `${(views / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return views.toString();
};

const renderTags = (tags: string[], maxTags: number = 3) => {
  if (!tags || tags.length === 0) return null;

  const visibleTags = tags.slice(0, maxTags);
  const remainingCount = tags.length - maxTags;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      <span className="flex items-center text-xs text-muted-foreground mr-1">
        <Tag className="h-3 w-3 mr-0.5" />
      </span>
      {visibleTags.map((tag: string) => (
        <Badge key={tag} variant="outline" className="text-xs">
          {ARTICLE_TAGS.find((t) => t.value === tag)?.label || tag}
        </Badge>
      ))}
      {remainingCount > 0 && (
        <Badge variant="outline" className="text-xs bg-muted">
          +{remainingCount}
        </Badge>
      )}
    </div>
  );
};

const ArticleThumbnail = ({ article, className = "" }: { article: any, className?: string }) => {
  const thumbnailUrl = article.thumbnail || article.image;
  
  if (!thumbnailUrl) {
    return (
      <div className={`bg-muted flex items-center justify-center ${className}`}>
        <ImageIcon className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Image 
        src={thumbnailUrl} 
        alt={article.title} 
        fill 
        className="object-cover rounded-md" 
      />
    </div>
  );
};

const HTMLContent = ({
  content,
  className,
}: {
  content: string;
  className?: string;
}) => {
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: content }} />
  );
};

export default function ContentManagementPage() {
  const { data: session, status } = useSession();
  const [articles, setArticles] = useState<any[]>([]);
  const [pendingArticles, setPendingArticles] = useState<any[]>([]);
  const [publishedArticles, setPublishedArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedArticleId, setSelectedArticleId] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [authorFilter, setAuthorFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [authors, setAuthors] = useState<any[]>([]);
  const [allAuthors, setAllAuthors] = useState<any[]>([]);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchAllAuthors = async () => {
    try {
      const response = await api.get(`/api/admin/articles`);
      const allArticles = response.data.articles || [];

      interface Author {
        id: string;
        name: string;
        lastname: string;
      }

      interface Article {
        id: string;
        author?: Author;
      }

      const uniqueAuthors = allArticles.reduce(
        (acc: Author[], article: Article) => {
          if (article.author) {
            if (!acc.find((a: Author) => a.id === article.author!.id)) {
              acc.push(article.author);
            }
          }
          return acc;
        },
        [] as Author[]
      );

      setAllAuthors(uniqueAuthors);
    } catch (error) {
      toast.error("Yazarlar yüklenirken bir hata oluştu");
    }
  };

  const fetchArticles = async () => {
    setLoading(true);
    try {
      let queryParams = new URLSearchParams();

      if (statusFilter !== "all") {
        queryParams.append("status", statusFilter);
      }

      if (dateFilter) {
        queryParams.append("date", dateFilter.toISOString().split("T")[0]);
      }

      if (authorFilter !== "all") {
        queryParams.append("author", authorFilter);
      }

      queryParams.append("sort", sortOrder);

      if (searchQuery.trim()) {
        queryParams.append("search", searchQuery.trim());
      }

      const response = await api.get(
        `/api/admin/articles?${queryParams.toString()}`
      );
      const allArticles = response.data.articles || [];

      setArticles(allArticles);

      setPendingArticles(
        allArticles.filter(
          (article: any) => article.status === "pending_approval"
        )
      );

      setPublishedArticles(
        allArticles.filter((article: any) => article.status === "published")
      );
    } catch (error) {
      toast.error("İçerikler yüklenirken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      (status === "authenticated" && session?.user?.role === UserRole.ADMIN) ||
      session?.user?.role === UserRole.SUPERADMIN
    ) {
      fetchAllAuthors();
    }
  }, [session, status]);

  useEffect(() => {
    if (
      (status === "authenticated" && session?.user?.role === UserRole.ADMIN) ||
      session?.user?.role === UserRole.SUPERADMIN
    ) {
      fetchArticles();
    }
  }, [session, status, statusFilter, dateFilter, authorFilter, sortOrder]);

  const handleSearch = () => {
    fetchArticles();
  };

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDateFilter(undefined);
    setAuthorFilter("all");
    setSortOrder("desc");
    fetchArticles();
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Lütfen bir ret nedeni girin");
      return;
    }

    setIsRejecting(true);
    try {
      await api.post(`/admin/articles/${selectedArticleId}/reject`, {
        reason: rejectionReason,
      });
      toast.success("Makale reddedildi");
      fetchArticles();
      setDialogOpen(false);
      setRejectionReason("");
    } catch (error: any) {
      toast.error("Hata", {
        description: "Makale reddedilemedi",
      });
    } finally {
      setIsRejecting(false);
    }
  };

  const handleApprove = async (articleId: string) => {
    setIsApproving(true);
    try {
      await api.patch(`/admin/articles/${articleId}/status`, {
        status: "published",
      });

      toast.success("Makale yayınlandı");
      fetchArticles();
    } catch (error: any) {
      toast.error("Hata", {
        description: "Makale yayınlanamadı",
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleDeleteArticle = async () => {
    if (!articleToDelete) {
      toast.error("Silinecek makale bulunamadı");
      return;
    }

    const articleToDeleteData = articles.find(
      (article) => article.id === articleToDelete
    );

    if (
      !(
        session?.user?.id === articleToDeleteData?.author?.id ||
        session?.user?.role === UserRole.ADMIN ||
        session?.user?.role === UserRole.SUPERADMIN
      )
    ) {
      toast.error("Bu işlem için yetkiniz bulunmuyor");
      return;
    }

    setIsDeleting(true);
    try {
      await api.delete(`/api/admin/articles/${articleToDelete}`);

      toast.success("Makale başarıyla silindi");
      fetchArticles();
      setDeleteDialogOpen(false);
      setArticleToDelete("");
    } catch (error: any) {
      toast.error("Hata", {
        description: "Makale silinemedi",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case ArticleStatus.DRAFT:
        return <Badge variant="outline">Taslak</Badge>;
      case ArticleStatus.PENDING_APPROVAL:
        return <Badge variant="secondary">Onay Bekliyor</Badge>;
      case ArticleStatus.PUBLISHED:
        return <Badge variant="default">Yayında</Badge>;
      case ArticleStatus.ARCHIVED:
        return <Badge variant="destructive">Arşivlenmiş</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleUpdateStatus = async (articleId: string, newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      await api.patch(`/api/admin/articles/${articleId}`, {
        status: newStatus,
      });

      toast.success("Makale durumu güncellendi");
      fetchArticles();
    } catch (error: any) {
      toast.error("Hata", {
        description: "Makale durumu güncellenemedi",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        {/* Header Skeleton */}
        <div className="text-center mb-6">
          <Skeleton className="h-10 w-64 bg-primary/20 rounded-lg mx-auto" />
          <Skeleton className="h-4 w-96 bg-primary/20 rounded-lg mx-auto mt-2" />
        </div>

        {/* Filters Skeleton */}
        <div className="mb-6 bg-muted/30 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {[...Array(3)].map((_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-20 bg-primary/20 rounded-md mb-1" />
                <Skeleton className="h-10 w-full bg-primary/20 rounded-md" />
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-9 w-40 bg-primary/20 rounded-md" />
            <Skeleton className="h-9 w-40 bg-primary/20 rounded-md" />
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="mt-6">
          <div className="border-b">
            <div className="flex gap-2 w-full mb-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-10 flex-1 bg-primary/20 rounded-md" />
              ))}
            </div>
          </div>

          {/* Tab Content Skeleton */}
          <div className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, index) => (
                <Card key={`skeleton-${index}`} className="overflow-hidden">
                  <Skeleton className="w-full h-40 bg-primary/20" />
                  <CardHeader className="pb-2">
                    <Skeleton className="h-6 w-full bg-primary/20 rounded-md" />
                    <Skeleton className="h-4 w-3/4 bg-primary/20 rounded-md mt-2" />
                  </CardHeader>
                  <CardContent className="pb-2">
                    <Skeleton className="h-4 w-full bg-primary/20 rounded-md mb-2" />
                    <Skeleton className="h-4 w-full bg-primary/20 rounded-md mb-2" /> 
                    <Skeleton className="h-4 w-2/3 bg-primary/20 rounded-md" />
                    <div className="flex gap-1 mt-2">
                      <Skeleton className="h-5 w-16 bg-primary/20 rounded-full" />
                      <Skeleton className="h-5 w-16 bg-primary/20 rounded-full" />
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col items-stretch gap-2">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-20 bg-primary/20 rounded-md" />
                      <Skeleton className="h-4 w-20 bg-primary/20 rounded-md" />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Skeleton className="h-9 w-full bg-primary/20 rounded-md" />
                      <Skeleton className="h-9 w-10 bg-primary/20 rounded-md" />
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    redirect("/");
    return null;
  }

  const userRole = session?.user?.role as UserRole;
  if (userRole !== UserRole.ADMIN && userRole !== UserRole.SUPERADMIN) {
    redirect("/");
    return null;
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold">İçerik Yönetimi</h1>
        <p className="text-muted-foreground mt-1">
          İçerik onaylama, düzenleme ve silme işlemleri
        </p>
      </div>

      <div className="mb-6 bg-muted/30 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Arama</label>
            <div className="flex">
              <Input
                placeholder="Başlık ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-r-none focus-visible:ring-0"
              />
              <Button
                variant="default"
                className="rounded-l-none"
                onClick={handleSearch}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Durum</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tüm Durumlar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                <SelectItem value={ArticleStatus.DRAFT}>Taslak</SelectItem>
                <SelectItem value={ArticleStatus.PENDING_APPROVAL}>
                  Onay Bekleyen
                </SelectItem>
                <SelectItem value={ArticleStatus.PUBLISHED}>
                  Yayında
                </SelectItem>
                <SelectItem value={ArticleStatus.ARCHIVED}>
                  Arşivlenmiş
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Yazar</label>
            <Select value={authorFilter} onValueChange={setAuthorFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tüm Yazarlar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Yazarlar</SelectItem>
                {allAuthors.map((author) => (
                  <SelectItem key={author.id} value={author.id}>
                    {author.name} {author.lastname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <Button variant="outline" size="sm" onClick={resetFilters}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Filtreleri Sıfırla
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setSortOrder(sortOrder === "desc" ? "asc" : "desc")
            }
          >
            <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
            {sortOrder === "desc" ? "En Yeni Başta" : "En Eski Başta"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="mt-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            Onay Bekleyen{" "}
            <Badge variant="secondary" className="ml-2">
              {pendingArticles.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="all">
            Tüm İçerikler{" "}
            <Badge variant="outline" className="ml-2">
              {articles.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="published">
            Yayında{" "}
            <Badge variant="default" className="ml-2">
              {publishedArticles.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, index) => (
                <Card key={`skeleton-${index}`} className="overflow-hidden">
                  <Skeleton className="w-full h-40 bg-primary/20" />
                  <CardHeader className="pb-2">
                    <Skeleton className="h-6 w-full bg-primary/20 rounded-md" />
                    <Skeleton className="h-4 w-3/4 bg-primary/20 rounded-md mt-2" />
                  </CardHeader>
                  <CardContent className="pb-2">
                    <Skeleton className="h-4 w-full bg-primary/20 rounded-md mb-2" />
                    <Skeleton className="h-4 w-full bg-primary/20 rounded-md mb-2" /> 
                    <Skeleton className="h-4 w-2/3 bg-primary/20 rounded-md" />
                    <div className="flex gap-1 mt-2">
                      <Skeleton className="h-5 w-16 bg-primary/20 rounded-full" />
                      <Skeleton className="h-5 w-16 bg-primary/20 rounded-full" />
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col items-stretch gap-2">
                    <Skeleton className="h-4 w-full bg-primary/20 rounded-md" />
                    <div className="flex gap-2">
                      <Skeleton className="h-9 w-full bg-primary/20 rounded-md" />
                      <Skeleton className="h-9 w-full bg-primary/20 rounded-md" />
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : pendingArticles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingArticles.map((article) => (
                <Card key={article.id} className="overflow-hidden">
                  <div className="w-full h-40 overflow-hidden">
                    <ArticleThumbnail article={article} className="w-full h-40" />
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{article.title}</CardTitle>
                    <CardDescription className="flex items-center gap-1 text-xs">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(article.createdAt), "dd MMMM yyyy", {
                        locale: tr,
                      })}
                      <span className="mx-1">•</span>
                      <User className="h-3 w-3" />
                      {article.author?.name} {article.author?.lastname}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    {article.blocks?.[0]?.content ? (
                      <HTMLContent
                        content={sanitizeAndTruncateHTML(
                          article.blocks[0].content
                        )}
                        className="text-sm line-clamp-3"
                      />
                    ) : (
                      <p className="text-sm">İçerik bulunamadı</p>
                    )}
                    {renderTags(article.tags || [])}
                  </CardContent>
                  <CardFooter className="flex flex-col items-stretch gap-2">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {formatViewCount(article.views || 0)} görüntülenme
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Dialog
                          open={
                            dialogOpen && selectedArticleId === article.id
                          }
                          onOpenChange={(open: boolean) => {
                            setDialogOpen(open);
                            if (!open) setSelectedArticleId("");
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="w-full"
                              onClick={(
                                e: React.MouseEvent<HTMLButtonElement>
                              ) => setSelectedArticleId(article.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reddet
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Makaleyi Reddet</DialogTitle>
                              <DialogDescription>
                                Makaleyi reddetme nedeninizi yazın. Bu bilgi
                                yazara gönderilecektir.
                              </DialogDescription>
                            </DialogHeader>
                            <Textarea
                              placeholder="Reddetme nedeni..."
                              value={rejectionReason}
                              onChange={(
                                e: React.ChangeEvent<HTMLTextAreaElement>
                              ) => setRejectionReason(e.target.value)}
                              rows={4}
                            />
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={(): void => {
                                  setDialogOpen(false);
                                  setRejectionReason("");
                                }}
                              >
                                İptal
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={handleReject}
                                disabled={
                                  isRejecting || !rejectionReason.trim()
                                }
                              >
                                {isRejecting ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    İşleniyor...
                                  </>
                                ) : (
                                  "Reddet"
                                )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="default"
                          size="sm"
                          className="w-full"
                          onClick={() => handleApprove(article.id)}
                          disabled={isApproving}
                        >
                          {isApproving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Onayla
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="mt-auto flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        asChild
                      >
                        <Link href={`/articles/${article.slug}`}>
                          Görüntüle
                        </Link>
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="secondary" size="sm" disabled={isUpdatingStatus}>
                            {isUpdatingStatus ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Settings className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => handleUpdateStatus(article.id, ArticleStatus.DRAFT)}
                          >
                            Taslak
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleUpdateStatus(article.id, ArticleStatus.PUBLISHED)}
                          >
                            Yayında
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleUpdateStatus(article.id, ArticleStatus.ARCHIVED)}
                          >
                            Arşivlenmiş
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-lg">
              <p className="text-muted-foreground">
                Onay bekleyen içerik bulunamadı
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          {loading ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thumbnail</TableHead>
                    <TableHead>Başlık</TableHead>
                    <TableHead>Yazar</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Görüntülenme</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(5)].map((_, index) => (
                    <TableRow key={`skeleton-row-${index}`}>
                      <TableCell>
                        <Skeleton className="w-16 h-16 bg-primary/20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-full max-w-[200px] bg-primary/20 rounded-md mb-2" />
                        <div className="flex gap-1">
                          <Skeleton className="h-4 w-16 bg-primary/20 rounded-full" />
                          <Skeleton className="h-4 w-16 bg-primary/20 rounded-full" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-32 bg-primary/20 rounded-md" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24 bg-primary/20 rounded-md" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24 bg-primary/20 rounded-md" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16 bg-primary/20 rounded-md" />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-end">
                          <Skeleton className="h-8 w-8 bg-primary/20 rounded-md" />
                          <Skeleton className="h-8 w-8 bg-primary/20 rounded-md" />
                          <Skeleton className="h-8 w-8 bg-primary/20 rounded-md" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : articles.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thumbnail</TableHead>
                    <TableHead>Başlık</TableHead>
                    <TableHead>Yazar</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Görüntülenme</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {articles.map((article) => (
                    <TableRow key={article.id}>
                      <TableCell>
                        <div className="w-16 h-16 relative">
                          <ArticleThumbnail article={article} className="w-16 h-16" />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="font-medium">{article.title}</div>
                        {renderTags(article.tags || [])}
                      </TableCell>
                      <TableCell>
                        {article.author?.name} {article.author?.lastname}
                      </TableCell>
                      <TableCell>{formatStatus(article.status)}</TableCell>
                      <TableCell>
                        {format(new Date(article.createdAt), "dd MMM yyyy", {
                          locale: tr,
                        })}
                      </TableCell>
                      <TableCell>
                        {formatViewCount(article.views || 0)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/articles/${article.slug}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" disabled={isUpdatingStatus}>
                                {isUpdatingStatus ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Settings className="h-4 w-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => handleUpdateStatus(article.id, ArticleStatus.DRAFT)}
                                disabled={article.status === ArticleStatus.DRAFT}
                                className={article.status === ArticleStatus.DRAFT ? "bg-muted" : ""}
                              >
                                Taslak
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleUpdateStatus(article.id, ArticleStatus.PUBLISHED)}
                                disabled={article.status === ArticleStatus.PUBLISHED}
                                className={article.status === ArticleStatus.PUBLISHED ? "bg-muted" : ""}
                              >
                                Yayında
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleUpdateStatus(article.id, ArticleStatus.ARCHIVED)}
                                disabled={article.status === ArticleStatus.ARCHIVED}
                                className={article.status === ArticleStatus.ARCHIVED ? "bg-muted" : ""}
                              >
                                Arşivlenmiş
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {article.status ===
                            ArticleStatus.PENDING_APPROVAL && (
                            <>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setSelectedArticleId(article.id);
                                  setDialogOpen(true);
                                }}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleApprove(article.id)}
                                disabled={isApproving}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          {(session?.user?.id === article.author?.id ||
                            session?.user?.role === UserRole.ADMIN ||
                            session?.user?.role === UserRole.SUPERADMIN) && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setArticleToDelete(article.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-lg">
              <p className="text-muted-foreground">İçerik bulunamadı</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="published" className="mt-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, index) => (
                <Card key={`skeleton-published-${index}`} className="overflow-hidden">
                  <Skeleton className="w-full h-40 bg-primary/20" />
                  <CardHeader className="pb-2">
                    <Skeleton className="h-6 w-full bg-primary/20 rounded-md" />
                    <Skeleton className="h-4 w-3/4 bg-primary/20 rounded-md mt-2" />
                  </CardHeader>
                  <CardContent className="pb-2">
                    <Skeleton className="h-4 w-full bg-primary/20 rounded-md mb-2" />
                    <Skeleton className="h-4 w-full bg-primary/20 rounded-md mb-2" />
                    <Skeleton className="h-4 w-2/3 bg-primary/20 rounded-md" />
                    <div className="flex gap-1 mt-2">
                      <Skeleton className="h-5 w-16 bg-primary/20 rounded-full" />
                      <Skeleton className="h-5 w-16 bg-primary/20 rounded-full" />
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col items-stretch gap-2">
                    <Skeleton className="h-4 w-full bg-primary/20 rounded-md" />
                    <div className="flex gap-2">
                      <Skeleton className="h-9 w-full bg-primary/20 rounded-md" />
                      <Skeleton className="h-9 w-10 bg-primary/20 rounded-md" />
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : publishedArticles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publishedArticles.map((article) => (
                <Card key={article.id} className="overflow-hidden">
                  <div className="w-full h-40 overflow-hidden">
                    <ArticleThumbnail article={article} className="w-full h-40" />
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{article.title}</CardTitle>
                    <CardDescription className="flex items-center gap-1 text-xs">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(article.createdAt), "dd MMMM yyyy", {
                        locale: tr,
                      })}
                      <span className="mx-1">•</span>
                      <User className="h-3 w-3" />
                      {article.author?.name} {article.author?.lastname}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    {article.blocks?.[0]?.content ? (
                      <HTMLContent
                        content={article.blocks[0].content}
                        className="text-sm line-clamp-3"
                      />
                    ) : (
                      <p className="text-sm">İçerik bulunamadı</p>
                    )}
                    {renderTags(article.tags || [])}
                  </CardContent>
                  <CardFooter className="flex flex-col items-stretch gap-2">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {formatViewCount(article.views || 0)} görüntülenme
                        </span>
                        <span className="text-green-500 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Yayında
                        </span>
                      </div>
                    </div>
                    <div className="mt-auto flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        asChild
                      >
                        <Link href={`/articles/${article.slug}`}>
                          Görüntüle
                        </Link>
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="secondary" size="sm" disabled={isUpdatingStatus}>
                            {isUpdatingStatus ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Settings className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => handleUpdateStatus(article.id, ArticleStatus.DRAFT)}
                          >
                            Taslak
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleUpdateStatus(article.id, ArticleStatus.PENDING_APPROVAL)}
                          >
                            Onay Bekliyor
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleUpdateStatus(article.id, ArticleStatus.PUBLISHED)}
                            className="bg-muted"
                            disabled
                          >
                            Yayında
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleUpdateStatus(article.id, ArticleStatus.ARCHIVED)}
                          >
                            Arşivlenmiş
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-lg">
              <p className="text-muted-foreground">
                Yayında içerik bulunamadı
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex justify-center gap-4 mt-10">
        <Button variant="outline" asChild className="flex items-center gap-2">
          <Link href="/admin/dashboard">
            <ArrowLeft className="h-4 w-4" /> Yönetim Paneline Dön
          </Link>
        </Button>

        <Button variant="outline" asChild className="flex items-center gap-2">
          <Link href="/profile">
            <ArrowLeft className="h-4 w-4" /> Profile Dön
          </Link>
        </Button>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Makaleyi Sil</DialogTitle>
            <DialogDescription>
              Bu makale kalıcı olarak silinecektir. Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setArticleToDelete("");
              }}
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteArticle}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Siliniyor...
                </>
              ) : (
                "Makaleyi Sil"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
