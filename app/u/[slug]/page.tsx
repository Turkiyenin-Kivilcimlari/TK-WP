"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import api from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Loader2, 
  CalendarDays, 
  FileText, 
  Clock, 
  UserCheck
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { UserRole } from "@/models/User";
import Link from "next/link";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { FaKaggle } from "react-icons/fa";
import { SiHuggingface } from "react-icons/si";
import { FaLinkedin  } from "react-icons/fa";
import { FaGithub } from "react-icons/fa";
import { CgWebsite } from "react-icons/cg";

interface ProfileData {
  user: {
    id: string;
    name: string;
    lastname: string;
    fullName: string;
    avatar: string;
    role: UserRole;
    slug: string;
    about: string;
    title: string;
    createdAt: string;
    github?: string;
    linkedin?: string;
    kaggle?: string;
    huggingface?: string;
    website?: string;
  };
  articles: Array<{
    id: string;
    title: string;
    slug: string;
    createdAt: string;
    thumbnail: string;
  }>;
  events: Array<{
    id: string;
    title: string;
    slug: string;
    coverImage: string;
    eventType: string;
    status: string;
    eventDate: string | null;
  }>;
  participatedEvents: Array<{
    id: string;
    title: string;
    slug: string;
    coverImage: string;
    eventType: string;
    status: string;
    eventDate: string | null;
  }>;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  // Profil verilerini getir
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await api.get(`/users/profile/${slug}`);
        console.log("Profil verisi:", response.data); // API yanıtını kontrol etmek için

        // API yanıtında participatedEvents alanı yoksa, boş bir dizi olarak ekle
        if (!response.data.participatedEvents) {
          response.data.participatedEvents = [];
        }

        setProfileData(response.data);
      } catch (err: any) {
        console.error("Profil yükleme hatası:", err);
        setError("Kullanıcı profili yüklenirken bir hata oluştu.");
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      fetchProfileData();
    }
  }, [slug]);

  // Kullanıcı rolünü formatlayarak görüntüle
  const formatUserRole = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPERADMIN:
        return "Süper Yönetici";
      case UserRole.ADMIN:
        return "Yönetici";
      case UserRole.REPRESENTATIVE:
        return "Topluluk Temsilcisi";
      case UserRole.MEMBER:
        return "Üye";
      default:
        return role;
    }
  };

  // Kullanıcı rolüne göre badge sınıfları
  const getRoleBadgeClasses = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPERADMIN:
        return "bg-red-100 text-red-800 border-red-300 font-medium";
      case UserRole.ADMIN:
        return "bg-blue-100 text-blue-800 border-blue-300 font-medium";
      case UserRole.REPRESENTATIVE:
        return "bg-amber-100 text-amber-800 border-amber-300 font-medium";
      case UserRole.MEMBER:
        return "bg-emerald-100 text-emerald-800 border-emerald-300 font-medium";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300 font-medium";
    }
  };

  // Etkinlik türlerini Türkçe'ye çevir
  const formatEventType = (eventType: string) => {
    switch (eventType) {
      case "IN_PERSON":
        return "Fiziksel";
      case "ONLINE":
        return "Online";
      case "HYBRID":
        return "Hibrit";
      default:
        return eventType;
    }
  };

  // Etkinlik türüne göre badge sınıfları
  const getEventTypeBadgeClasses = (eventType: string) => {
    const eventTypeStr = eventType.toUpperCase();

    if (eventTypeStr.includes("ONLINE")) {
      return "bg-green-50 text-green-700 border-green-200";
    } else if (eventTypeStr.includes("HYBRID")) {
      return "bg-purple-50 text-purple-700 border-purple-200";
    } else {
      // Default for IN_PERSON
      return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  // Kullanıcının baş harflerini al
  const getUserInitials = (name: string, lastname: string) => {
    const firstInitial = name ? name.charAt(0).toUpperCase() : "";
    const lastInitial = lastname ? lastname.charAt(0).toUpperCase() : "";
    return `${firstInitial}${lastInitial}`;
  };

  // Safely format date strings
  const safeFormatDate = (dateString: string | null) => {
    if (!dateString) return "Belirtilmemiş";

    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "Belirtilmemiş";
      }
      return format(date, "d MMMM yyyy", { locale: tr });
    } catch (e) {
      return "Belirtilmemiş";
    }
  };

  // Sosyal medya linklerini kontrol eden yardımcı fonksiyon
  const hasSocialLinks = (user: ProfileData['user']) => {
    return !!(user.github || user.linkedin || user.kaggle || user.huggingface || user.website);
  };

  // Yükleniyor durumu
  if (isLoading) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-6xl">
        {/* Profil kartı skeleton */}
        <Card className="mb-8">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-20 w-20 rounded-full bg-primary/20" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48 bg-primary/20" />
                <Skeleton className="h-4 w-32 bg-primary/20" />
                <Skeleton className="h-5 w-24 bg-primary/20" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full bg-primary/20 mb-2" />
            <Skeleton className="h-4 w-5/6 bg-primary/20 mb-2" />
            <Skeleton className="h-4 w-4/6 bg-primary/20" />
          </CardContent>
        </Card>

        {/* Tabs skeleton */}
        <div className="mb-6">
          <Skeleton className="h-10 w-96 bg-primary/20" />
        </div>

        {/* İçerik skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-64 bg-primary/20" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array(4).fill(0).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-36 w-full bg-primary/20" />
                <CardContent className="p-3">
                  <Skeleton className="h-4 w-full bg-primary/20 mb-2" />
                  <Skeleton className="h-4 w-5/6 bg-primary/20 mb-2" />
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-3 w-20 bg-primary/20" />
                    <Skeleton className="h-3 w-16 bg-primary/20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Hata durumu
  if (error || !profileData) {
    return (
      <div className="container mx-auto py-12 px-4">
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle className="text-center">Kullanıcı Bulunamadı</CardTitle>
            <CardDescription className="text-center">
              {error || "İstediğiniz profil mevcut değil veya kaldırılmış olabilir."}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button variant="outline" asChild>
              <Link href="/">Ana Sayfaya Dön</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const { user, articles, events } = profileData;
  const participatedEvents = profileData.participatedEvents || [];
  const isOwnProfile = session?.user?.id === user.id;

  return (
    <div className="container mx-auto py-12 px-4 max-w-6xl">
      <Card className="mb-8">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-4">
            <div
              className={`relative ${
                user.role === UserRole.SUPERADMIN || user.role === UserRole.ADMIN
                  ? "ring-2 ring-offset-2 ring-primary rounded-full"
                  : ""
              }`}
            >
              <Avatar className="h-16 w-16 md:h-20 md:w-20">
                <AvatarImage src={user.avatar} alt={user.fullName} />
                <AvatarFallback>{getUserInitials(user.name, user.lastname)}</AvatarFallback>
              </Avatar>
            </div>
            <div className="w-full">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle className="text-2xl md:text-3xl">{user.fullName}</CardTitle>
                  {user.title && <p className="text-muted-foreground mt-1">{user.title}</p>}
                  <div className="flex items-center mt-1">
                    <Badge variant="outline" className={`${getRoleBadgeClasses(user.role)}`}>
                      {formatUserRole(user.role)}
                    </Badge>
                    {isOwnProfile && (
                      <Button variant="ghost" size="sm" className="ml-2" asChild>
                        <Link href="/profile">Profili Düzenle</Link>
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center mt-2 text-sm text-muted-foreground">
                    <Clock className="mr-2 h-4 w-4" />
                    <span>Kayıt Tarihi: {safeFormatDate(user.createdAt)}</span>
                  </div>
                </div>
                
                {/* Sosyal Medya Linkleri */}
                {hasSocialLinks(user) && (
                  <div className="flex flex-wrap items-center gap-2 mt-3 md:mt-0">
                    {user.website && (
                      <Link
                        href={user.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title="Kişisel Web Sitesi"
                      >
                        <CgWebsite className="h-5 w-5" />
                      </Link>
                    )}
                    
                    {user.github && (
                      <Link 
                        href={user.github} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title="GitHub"
                      >
                        <FaGithub className="h-5 w-5" />
                      </Link>
                    )}
                    
                    {user.linkedin && (
                      <Link 
                        href={user.linkedin} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title="LinkedIn"
                      >
                        <FaLinkedin  className="h-5 w-5" />
                      </Link>
                    )}
                    
                    {user.kaggle && (
                      <Link 
                        href={user.kaggle} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title="Kaggle"
                      >
                        <FaKaggle className="h-5 w-5" />
                      </Link>
                    )}
                    
                    {user.huggingface && (
                      <Link 
                        href={user.huggingface} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title="Hugging Face"
                      >
                        <SiHuggingface className="h-5 w-5" />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        {user.about && (
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <h4 className="text-lg font-medium mb-2">Hakkında</h4>
              <p className="text-muted-foreground whitespace-pre-wrap">{user.about}</p>
            </div>
          </CardContent>
        )}
      </Card>

      <Tabs defaultValue="articles" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="articles">Yazılar</TabsTrigger>
          <TabsTrigger value="events">Etkinlikler</TabsTrigger>
          <TabsTrigger value="participated">Katıldığı Etkinlikler</TabsTrigger>
        </TabsList>

        <TabsContent value="articles">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              {user.name} tarafından yazılan makaleler
            </h3>

            {articles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {articles.map((article) => (
                  <Card key={article.id} className="overflow-hidden">
                    <Link href={`/articles/${article.slug}`}>
                      <div className="aspect-video relative bg-muted">
                        {article.thumbnail ? (
                          <Image
                            src={article.thumbnail}
                            alt={article.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full bg-muted">
                            <FileText className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </Link>
                    <CardContent className="p-3">
                      <h4 className="font-medium mb-2 line-clamp-2 text-sm">
                        <Link href={`/articles/${article.slug}`} className="hover:underline">
                          {article.title}
                        </Link>
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {safeFormatDate(article.createdAt)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Henüz yayınlanmış makale bulunmuyor.</p>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="events">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <CalendarDays className="mr-2 h-5 w-5" />
              {user.name} tarafından oluşturulan etkinlikler
            </h3>

            {events.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {events.map((event) => (
                  <Card key={event.id} className="overflow-hidden">
                    <Link href={`/events/${event.slug}`}>
                      <div className="aspect-video relative bg-muted">
                        {event.coverImage ? (
                          <Image
                            src={event.coverImage}
                            alt={event.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full bg-muted">
                            <CalendarDays className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </Link>
                    <CardContent className="p-3">
                      <h4 className="font-medium mb-2 line-clamp-2 text-sm">
                        <Link href={`/events/${event.slug}`} className="hover:underline">
                          {event.title}
                        </Link>
                      </h4>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {safeFormatDate(event.eventDate)}
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-xs px-1 py-0 ${getEventTypeBadgeClasses(event.eventType)}`}
                        >
                          {formatEventType(event.eventType)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Henüz oluşturulmuş etkinlik bulunmuyor.</p>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="participated">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <UserCheck className="mr-2 h-5 w-5" />
              {user.name} tarafından katılınan etkinlikler
            </h3>

            {participatedEvents && participatedEvents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {participatedEvents.map((event) => (
                  <Card key={event.id} className="overflow-hidden">
                    <Link href={`/events/${event.slug}`}>
                      <div className="aspect-video relative bg-muted">
                        {event.coverImage ? (
                          <Image
                            src={event.coverImage}
                            alt={event.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full bg-muted">
                            <CalendarDays className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </Link>
                    <CardContent className="p-3">
                      <h4 className="font-medium mb-2 line-clamp-2 text-sm">
                        <Link href={`/events/${event.slug}`} className="hover:underline">
                          {event.title}
                        </Link>
                      </h4>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {safeFormatDate(event.eventDate)}
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-xs px-1 py-0 ${getEventTypeBadgeClasses(event.eventType)}`}
                        >
                          {formatEventType(event.eventType)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Henüz katıldığı etkinlik bulunmuyor.</p>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
