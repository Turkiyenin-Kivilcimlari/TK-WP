"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import {
  Loader2,
  Users,
  FileText,
  Settings,
  BarChart3,
  ArrowLeft,
  MessageSquare,
  Shield,
} from "lucide-react";
import { UserRole } from "@/models/User";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useUserStats } from "@/hooks/useUserStats";
import { useEffect, useState } from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import api from "@/lib/api";

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const { stats, isLoading: statsLoading, error: statsError } = useUserStats();
  const [articleCount, setArticleCount] = useState(1);
  const [articleChange, setArticleChange] = useState(0);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [articlesError, setArticlesError] = useState<string | null>(null);
  const [hasComparisonData, setHasComparisonData] = useState(false);

  // İstatistiklerde karşılaştırma verisi olup olmadığını kontrol eden yardımcı fonksiyon
  interface HasComparisonFunction {
    (value: number | null | undefined): boolean;
  }

  const hasComparison: HasComparisonFunction = (
    value: number | null | undefined
  ): boolean => {
    return value !== undefined && value !== null;
  };

  useEffect(() => {
    async function fetchArticleStats() {
      try {
        const response = await api.get("/api/admin/stats");

        if (response.status !== 200) {
          throw new Error("Yazı istatistikleri alınamadı");
        }

        const data = response.data;
        // Eğer dönen değer 0 ise, en az 1 olmalı
        setArticleCount(data.totalCount > 0 ? data.totalCount : 1);

        // Geçen ay verisi varsa kaydet
        if (data.monthlyChange !== undefined && data.monthlyChange !== null) {
          setArticleChange(data.monthlyChange);
          setHasComparisonData(true);
        } else {
          // Karşılaştırma verisi yoksa
          setHasComparisonData(false);
        }
        setArticlesError(null);
      } catch (error: any) {
        // Hata durumunda varsayılan olarak 1 göster
        setArticleCount(1);
        setHasComparisonData(false);
        setArticlesError("API bağlantı hatası");
      } finally {
        setArticlesLoading(false);
      }
    }

    fetchArticleStats();
  }, []);

  // Varsayılan stats değerleri - API hata durumunda kullanılır
  const fallbackStats = {
    totalUsers: 1,
    newUsers: { count: 0, percentChange: 0 },
    activeProjects: { count: 0, change: 0 },
    contentCount: { count: 1, change: 0 },
  };

  // API hatası durumunda kullanılacak stats
  const displayStats = statsError ? fallbackStats : stats;

  // Yüzde değişimi gösterme fonksiyonu
  const formatPercentChange = (value: number | null | undefined): string => {
    if (value === undefined || value === null) return "";

    // Değer 0 ise bu önceki ay veri yokken bu ay veri olduğunu gösterir
    // Bu durumda 100% artış olarak gösteriyoruz
    if (value === 0) return "+100%";

    return `${value > 0 ? "+" : ""}${value}%`;
  };

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
    redirect("/");
    return null;
  }

  // Kullanıcı yetkisi kontrol edilir
  const userRole = session?.user?.role as UserRole;
  // ADMIN veya SUPERADMIN rolüne sahip kullanıcılar erişebilir
  if (userRole !== UserRole.ADMIN && userRole !== UserRole.SUPERADMIN) {
    redirect("/");
    return null;
  }

  return (
    <div className="flex min-h-screen justify-center items-center">
      <div className="container py-12 px-3 max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">Yönetim Paneli</h1>
          <p className="text-muted-foreground mt-2">
            Türkiye'nin Kıvılcımları platformu yönetim arayüzü
          </p>
        </div>

        {/* Sadece SUPERADMIN için gösterilen bilgi kartı */}
        {session?.user?.role === UserRole.SUPERADMIN && (
          <div className="mb-6">
            <Alert
              variant="default"
              className="bg-destructive/10 border-destructive"
            >
              <Shield className="h-4 w-4 text-destructive" />
              <AlertTitle className="text-destructive">
                Süper Yönetici Modu
              </AlertTitle>
              <AlertDescription>
                Şu anda süper yönetici yetkileriyle oturum açtınız. Tüm platform
                işlevlerine erişiminiz vardır.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Toplam Kullanıcı
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    Yükleniyor...
                  </span>
                </div>
              ) : statsError ? (
                <>
                  <div className="text-2xl font-bold">
                    {displayStats.totalUsers}
                  </div>
                  <p className="text-xs text-red-500">
                    İstatistikler yüklenirken hata oluştu
                  </p>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {displayStats.totalUsers}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {hasComparison(displayStats.newUsers.percentChange) ? (
                      <>
                        {formatPercentChange(
                          displayStats.newUsers.percentChange
                        )}{" "}
                        geçen aya göre
                      </>
                    ) : (
                      "Yeni kullanıcı platformu"
                    )}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Aktif Proje</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    Yükleniyor...
                  </span>
                </div>
              ) : statsError ? (
                <>
                  <div className="text-2xl font-bold">
                    {displayStats.activeProjects.count}
                  </div>
                  <p className="text-xs text-red-500">
                    İstatistikler yüklenirken hata oluştu
                  </p>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {displayStats.activeProjects.count}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {hasComparison(displayStats.activeProjects.change) ? (
                      <>
                        {formatPercentChange(
                          displayStats.activeProjects.change
                        )}{" "}
                        geçen aya göre
                      </>
                    ) : (
                      "İlk projeler bu ay oluşturuldu"
                    )}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Yeni Üyeler</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    Yükleniyor...
                  </span>
                </div>
              ) : statsError ? (
                <>
                  <div className="text-2xl font-bold">
                    {displayStats.newUsers.count}
                  </div>
                  <p className="text-xs text-red-500">
                    İstatistikler yüklenirken hata oluştu
                  </p>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {displayStats.newUsers.count}
                  </div>
                  <p className="text-xs text-muted-foreground">Bu ay</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Paylaşılan Yazı Sayısı
              </CardTitle>
            </CardHeader>
            <CardContent>
              {articlesLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    Yükleniyor...
                  </span>
                </div>
              ) : articlesError ? (
                <>
                  <div className="text-2xl font-bold">{articleCount}</div>
                  <p className="text-xs text-red-500">
                    İstatistikler yüklenirken hata oluştu
                  </p>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">{articleCount}</div>
                  <p className="text-xs text-muted-foreground">
                    {hasComparisonData ? (
                      <>
                        {articleChange === 0
                          ? "+100%"
                          : `${
                              articleChange > 0 ? "+" : ""
                            }${articleChange}%`}{" "}
                        geçen aya göre
                      </>
                    ) : (
                      "İlk içerikler bu ay paylaşıldı"
                    )}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Kullanıcı Yönetimi
              </CardTitle>
              <CardDescription>
                Kullanıcıları görüntüle ve yönet
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/admin/users">Kullanıcılar</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" /> İçerik Yönetimi
              </CardTitle>
              <CardDescription>
                İçerikler, blog ve sayfaları yönet
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/admin/content">İçerikler</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" /> Yorum Yönetimi
              </CardTitle>
              <CardDescription>Kullanıcı yorumlarını yönet</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/admin/comments">Yorumlar</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" /> Etkinlik Yönetimi
              </CardTitle>
              <CardDescription>Topluluk etkinliklerini yönet</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/admin/events">Etkinlikler</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Yönetim Kurulu
              </CardTitle>
              <CardDescription>
                Yönetim kurulu üyelerini düzenle
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/admin/board">Yönetim Kurulu</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="flex justify-center mt-10">
          <Button variant="outline" asChild className="flex items-center gap-2">
            <Link href="/profile">
              <ArrowLeft className="h-4 w-4" /> Profile Dön
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
