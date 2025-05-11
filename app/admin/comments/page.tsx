"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Trash2, Reply } from "lucide-react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
// Kullanıcı rolü için enum
enum UserRole {
  USER = "USER",
  ADMIN = "ADMIN",
  SUPERADMIN = "SUPERADMIN"
}

// Yorum tipi için arayüz
interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  articleId: string;
  articleTitle: string;
  createdAt: string;
  isReply: boolean;
  parentId?: string;
  parentAuthorName?: string;
  parentContent?: string;
}

// Yorumlar sayfası
export default function CommentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [authorFilter, setAuthorFilter] = useState("all"); // Yazar filtresi için durum
  const [articleFilter, setArticleFilter] = useState("all"); // Makale filtresi için durum
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Yazar listesi sorgusu
  const { data: authors } = useQuery({
    queryKey: ["comment-authors"],
    queryFn: async () => {
      try {
        const response = await api.get("/api/admin/comments/authors");
        return response.data.authors || [];
      } catch (error) {
        return [];
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Makale listesi sorgusu
  const { data: articles } = useQuery({
    queryKey: ["comment-articles"],
    queryFn: async () => {
      try {
        const response = await api.get("/api/admin/comments/articles");
        return response.data.articles || [];
      } catch (error) {
        return [];
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Yorum verisini çekme
  const {
    data: comments,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["comments", searchTerm, authorFilter, articleFilter],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (searchTerm) params.append("search", searchTerm);
        if (authorFilter && authorFilter !== "all")
          params.append("author", authorFilter);
        if (articleFilter && articleFilter !== "all")
          params.append("article", articleFilter);

        const response = await api.get(`/api/admin/comments?${params.toString()}`);
        return response.data.comments;
      } catch (error) {
        throw error;
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Yorum silme işlemi
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      return await api.delete(`/api/admin/comments?id=${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments"] });
      toast.success("Yorum başarıyla silindi");
      setConfirmDeleteId(null);
    },
    onError: (error: any) => {
      toast.error("Yorum silinirken bir hata oluştu", {
        description:
          "Bilinmeyen bir hata oluştu",
      });
    },
  });

  // Arama işlemi için gecikme ekle
  useEffect(() => {
    const timer = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["comments"] });
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, authorFilter, articleFilter, queryClient]);

  // Hata durumunda hatayı konsola yazdıralım
  useEffect(() => {
    if (isError && error) {
      toast.error("Yorumlar yüklenirken bir hata oluştu", {
        description: "Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.",
      });
    }
  }, [isError, error]);

  // Oturum kontrolü
  const { data: session, status } = useSession();
  
  // Oturum yoksa giriş sayfasına yönlendir
  if (status === "unauthenticated") {
    redirect("/");
    return null;
  }

  // Kullanıcı yetkisi kontrol edilir
  const userRole = session?.user?.role as UserRole;
  if (userRole !== UserRole.ADMIN && userRole !== UserRole.SUPERADMIN) {
    redirect("/");
    return null;
  }

  // Filtre sıfırlama fonksiyonu
  const resetFilters = () => {
    setSearchTerm("");
    setAuthorFilter("all");
    setArticleFilter("all");
    queryClient.invalidateQueries({ queryKey: ["comments"] });
  };

  return (
    <div className="container max-w-7xl mx-auto py-10 px-4">
      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Yorum Yönetimi</CardTitle>
              <CardDescription>
                Tüm yorumları görüntüleyin ve yönetin
              </CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link href="/admin/dashboard" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" /> Yönetim Paneline Dön
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Arama ve filtreler */}
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Arama kutusu */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  İçerik
                </label>
                <div className="relative">
                  <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Yorum içeriği ile ara..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Yazar filtresi */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Yazar
                </label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={authorFilter}
                  onChange={(e) => setAuthorFilter(e.target.value)}
                >
                  <option value="all">Tüm yazarlar</option>
                  {authors?.map((author: any) => (
                    <option key={author.id} value={author.id}>
                      {author.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Makale filtresi */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Makale
                </label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={articleFilter}
                  onChange={(e) => setArticleFilter(e.target.value)}
                >
                  <option value="all">Tüm makaleler</option>
                  {articles?.map((article: any) => (
                    <option key={article.id} value={article.id}>
                      {article.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Aktif filtreler */}
            {(searchTerm ||
              authorFilter !== "all" ||
              articleFilter !== "all") && (
              <div className="flex items-center justify-between bg-muted p-2 rounded-md">
                <div className="text-sm">
                  <span className="font-medium">Aktif filtreler:</span>
                  {searchTerm && (
                    <Badge variant="secondary" className="ml-2">
                      İçerik: {searchTerm}
                    </Badge>
                  )}
                  {authorFilter !== "all" && (
                    <Badge variant="secondary" className="ml-2">
                      Yazar
                    </Badge>
                  )}
                  {articleFilter !== "all" && (
                    <Badge variant="secondary" className="ml-2">
                      Makale
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  Filtreleri Temizle
                </Button>
              </div>
            )}
          </div>

          {isLoading ? (
            <>
              {/* Mobil görünüm skeleton (Kartlar) */}
              <div className="md:hidden space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="mb-2">
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24 mb-2 bg-primary/20" />
                        <Skeleton className="h-16 w-full bg-primary/20" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-3/4 bg-primary/20" />
                          <Skeleton className="h-4 w-1/2 bg-primary/20" />
                          <Skeleton className="h-4 w-2/5 bg-primary/20" />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="border-t pt-4 flex justify-end">
                      <Skeleton className="h-9 w-16 bg-primary/20" />
                    </CardFooter>
                  </Card>
                ))}
              </div>

              {/* Masaüstü görünüm skeleton (Tablo) */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>İçerik</TableHead>
                      <TableHead>Yazar</TableHead>
                      <TableHead>Makale</TableHead>
                      <TableHead>Tarih</TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium max-w-xs">
                          <Skeleton className="h-10 w-full bg-primary/20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24 bg-primary/20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-32 bg-primary/20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-28 bg-primary/20" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="h-8 w-8 bg-primary/20 ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : isError ? (
            <div className="text-center py-10 text-red-500">
              <p>Yorumlar yüklenirken bir hata oluştu.</p>
              <p className="text-sm mt-2">
                Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() =>
                  queryClient.invalidateQueries({ queryKey: ["comments"] })
                }
              >
                Yeniden Dene
              </Button>
            </div>
          ) : (
            <>
              {/* Mobil görünüm (Kartlar) */}
              <div className="md:hidden space-y-4">
                {comments && comments.length > 0 ? (
                  comments.map((comment: Comment) => (
                    <Card key={comment.id} className="mb-2">
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          {comment.isReply && (
                            <div className="mb-2">
                              <Badge
                                variant="outline"
                                className="mb-2 flex items-center"
                              >
                                <Reply className="h-3 w-3 mr-1" /> Yanıt
                              </Badge>
                              <div className="bg-muted p-2 rounded-md text-xs">
                                <div className="font-medium">
                                  {comment.parentAuthorName} yorumuna yanıt:
                                </div>
                                <div className="truncate text-muted-foreground">
                                  {comment.parentContent}
                                </div>
                              </div>
                            </div>
                          )}
                          <p className="font-medium line-clamp-2">
                            {comment.content}
                          </p>
                          <div className="text-sm text-muted-foreground">
                            <p>
                              <span className="font-medium">Yazar:</span>{" "}
                              {comment.authorName}
                            </p>
                            <p className="truncate">
                              <span className="font-medium">Makale:</span>{" "}
                              <Link
                                href={`/articles/${comment.articleId}`}
                                className="hover:underline"
                              >
                                {comment.articleTitle}
                              </Link>
                            </p>
                            <p>
                              <span className="font-medium">Tarih:</span>{" "}
                              {formatDistanceToNow(
                                new Date(comment.createdAt),
                                { addSuffix: true, locale: tr }
                              )}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="border-t pt-4 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmDeleteId(comment.id)}
                          className="text-red-500 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Sil
                        </Button>
                      </CardFooter>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-6">
                    {searchTerm
                      ? "Arama sonucuna uygun yorum bulunamadı."
                      : "Henüz yorum bulunmuyor."}
                  </div>
                )}
              </div>

              {/* Masaüstü görünüm (Tablo) */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>İçerik</TableHead>
                      <TableHead>Yazar</TableHead>
                      <TableHead>Makale</TableHead>
                      <TableHead>Tarih</TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comments && comments.length > 0 ? (
                      comments.map((comment: Comment) => (
                        <TableRow key={comment.id}>
                          <TableCell className="font-medium max-w-xs">
                            <div>
                              {comment.isReply && (
                                <div className="mb-2">
                                  <Badge
                                    variant="outline"
                                    className="mb-1 flex items-center w-fit"
                                  >
                                    <Reply className="h-3 w-3 mr-1" /> Yanıt
                                  </Badge>
                                  <div className="bg-muted p-2 rounded-md text-xs">
                                    <div className="font-medium">
                                      {comment.parentAuthorName} yorumuna yanıt:
                                    </div>
                                    <div className="truncate text-muted-foreground">
                                      {comment.parentContent}
                                    </div>
                                  </div>
                                </div>
                              )}
                              <div className="truncate">{comment.content}</div>
                            </div>
                          </TableCell>
                          <TableCell>{comment.authorName}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            <Link
                              href={`/articles/${comment.articleId}`}
                              className="hover:underline"
                            >
                              {comment.articleTitle}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {formatDistanceToNow(new Date(comment.createdAt), {
                              addSuffix: true,
                              locale: tr,
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setConfirmDeleteId(comment.id)}
                              title="Sil"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6">
                          {searchTerm
                            ? "Arama sonucuna uygun yorum bulunamadı."
                            : "Henüz yorum bulunmuyor."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Silme Onay Dialog'u */}
      <Dialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yorumu Sil</DialogTitle>
            <DialogDescription>
              Bu yorumu silmek istediğinizden emin misiniz? Bu işlem geri
              alınamaz.
              {comments &&
                confirmDeleteId &&
                !comments.find((c: Comment) => c.id === confirmDeleteId)
                  ?.isReply &&
                " Bu yoruma ait tüm yanıtlar da silinecektir."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                confirmDeleteId && deleteCommentMutation.mutate(confirmDeleteId)
              }
              disabled={deleteCommentMutation.isPending}
            >
              {deleteCommentMutation.isPending ? "Siliniyor..." : "Evet, Sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
