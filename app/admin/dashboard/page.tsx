"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import {
  Loader2,
  Users,
  FileText,
  Settings,
  ArrowLeft,
  MessageSquare,
  Shield,
  Calendar,
  Building2,
  UsersRound,
  Heart,
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
import { useEffect, useState } from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import api from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

// Dashboard'da kullanılacak tüm istatistik verileri için tek bir tip tanımı
interface DashboardStats {
  totalUsers: number;
  newUsers: { count: number; percentChange: number };
  allEvents: { count: number; change: number };
  contentCount: { count: number; change: number };
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    newUsers: { count: 0, percentChange: 0 },
    allEvents: { count: 0, change: 0 },
    contentCount: { count: 0, change: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // İstatistiklerde karşılaştırma verisi olup olmadığını kontrol eden yardımcı fonksiyon
  const hasComparison = (value: number | null | undefined): boolean => {
    return value !== undefined && value !== null;
  };

  // Tüm istatistikleri tek bir API çağrısında getirme
  useEffect(() => {
    async function fetchAllStats() {
      try {
        setIsLoading(true);
        const response = await api.get("/admin/stats");

        if (response.status !== 200 || !response.data) {
          throw new Error("İstatistikler alınamadı");
        }

        const data = response.data;

        // API'den dönen tüm verileri kaydet
        setStats({
          totalUsers: data.totalUsers || 0,
          newUsers: {
            count: data.newUsers?.count || 0,
            percentChange: data.newUsers?.percentChange || 0,
          },
          allEvents: {
            count: data.allEvents?.count || 0,
            change: data.allEvents?.change || 0,
          },
          contentCount: {
            count: data.contentCount?.count || 0,
            change: data.contentCount?.change || 0,
          },
        });

        setError(null);
      } catch (error: any) {
        console.error("Stats loading error:", error);
        setError(error.message || "İstatistikler yüklenirken bir hata oluştu");
      } finally {
        setIsLoading(false);
      }
    }

    fetchAllStats();
  }, []);

  // Yüzde değişimi gösterme fonksiyonu
  const formatPercentChange = (value: number | null | undefined): string => {
    if (value === undefined || value === null) return "";
    if (value === 0) return "+0%";
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
          {/* Tüm kartlar için tek bir şablon kullanarak kod tekrarını önlüyoruz */}
          {[
            {
              title: "Toplam Kullanıcı",
              value: stats.totalUsers,
              description: hasComparison(stats.newUsers.percentChange)
                ? `${formatPercentChange(
                    stats.newUsers.percentChange
                  )} geçen aya göre`
                : "Yeni kullanıcı platformu",
            },
            {
              title: "Tüm Etkinlikler",
              value: stats.allEvents.count,
              description: hasComparison(stats.allEvents.change)
                ? `${formatPercentChange(
                    stats.allEvents.change
                  )} geçen aya göre`
                : "İlk etkinlikler bu ay oluşturuldu",
            },
            {
              title: "Yeni Üyeler",
              value: stats.newUsers.count,
              description: "Bu ay",
            },
            {
              title: "Paylaşılan Yazı Sayısı",
              value: stats.contentCount.count,
              description: hasComparison(stats.contentCount.change)
                ? `${formatPercentChange(
                    stats.contentCount.change
                  )} geçen aya göre`
                : "İlk içerikler bu ay paylaşıldı",
            },
          ].map((card, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      Yükleniyor...
                    </span>
                  </div>
                ) : error ? (
                  <>
                    <div className="text-2xl font-bold">{card.value}</div>
                    <p className="text-xs text-red-500">
                      İstatistikler yüklenirken hata oluştu
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{card.value}</div>
                    <p className="text-xs text-muted-foreground">
                      {card.description}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {isLoading ? (
            // Skeleton yükleme durumu
            <>
              {Array(8)
                .fill(0)
                .map((_, index) => (
                  <Card key={`skeleton-${index}`}>
                    <CardHeader>
                      <Skeleton className="h-6 w-40 bg-primary/20 mb-2" />
                      <Skeleton className="h-4 w-full bg-primary/20" />
                    </CardHeader>
                    <CardFooter>
                      <Skeleton className="h-10 w-full bg-primary/20" />
                    </CardFooter>
                  </Card>
                ))}
            </>
          ) : (
            <>
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
                    <Calendar className="h-5 w-5" /> Etkinlik Yönetimi
                  </CardTitle>
                  <CardDescription>
                    Topluluk etkinliklerini yönet
                  </CardDescription>
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
                    <Building2 className="h-5 w-5" /> Yönetim Kurulu
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

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UsersRound className="h-5 w-5" /> Topluluk Temsilcileri
                  </CardTitle>
                  <CardDescription>
                    Temsilcileri yönet ve düzenle
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href="/admin/community-team">
                      Topluluk Temsilcileri
                    </Link>
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" /> Topluluk Destekçileri
                  </CardTitle>
                  <CardDescription>
                    Destekçileri yönet ve düzenle
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href="/admin/supporters">Topluluk Destekçileri</Link>
                  </Button>
                </CardFooter>
              </Card>
            </>
          )}
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
