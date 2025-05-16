"use client";

import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Menu, Moon, MoveRight, Shield, Sun, X } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { UserRole } from "@/models/User";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Avatar bileşenini import ediyoruz
import api from "@/lib/api";

function Header({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();

  const navigationItems = [
    {
      title: "Ana Sayfa",
      href: "/",
    },
    {
      title: "Hakkımızda",
      href: "/about",
    },
    {
      title: "Yazılar",
      href: "/articles",
    },
    {
      title: "Etkinlikler",
      href: "/events",
    },
    {
      title: "İletişim",
      href: "/contact",
    },
  ];

  // Bir yolun aktif olup olmadığını kontrol eden yardımcı fonksiyon
  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true;
    if (path !== "/" && pathname.startsWith(path)) return true;
    return false;
  };

  const [isOpen, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const { data: session, status } = useSession();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState({
    name: "",
    profileImage: "",
    slug: "", // Slug alanını ekle
  });

  // Session değişikliklerini izle
  useEffect(() => {
    setIsLoggedIn(status === "authenticated");

    if (session?.user) {
      setUserData({
        name: `${session.user.name || ""} ${
          session.user.lastname || ""
        }`.trim(),
        profileImage: session.user.avatar || "",
        slug: session.user.slug || "", // Access slug property directly from the user object
      });
    } else {
      // Session yoksa kullanıcı bilgilerini sıfırla
      setUserData({
        name: "",
        profileImage: "",
        slug: "",
      });
    }

    // EventBus'a profil güncellemelerini dinleyici ekle
    const handleProfileUpdate = () => {
      // Manuel session yenileme
      const refreshSessionData = async () => {
        try {
          const response = await api.get("/api/auth/session");
          if (response.status === 200) {
            const sessionData = response.data;
            if (sessionData?.user) {
              setUserData({
                name: `${sessionData.user.name || ""} ${
                  sessionData.user.lastname || ""
                }`.trim(),
                profileImage: sessionData.user.avatar || "",
                slug: sessionData.user.slug || "", // API'dan gelen slug değerini al
              });
            }
          }
        } catch (error) {}
      };

      refreshSessionData();
    };

    // Özel olayları dinle
    window.addEventListener("profile-updated", handleProfileUpdate);

    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdate); // Düzeltildi - removeEventListener kullanılmalı
    };
  }, [session, status]);

  // Kullanıcı rollerine göre yetkiler
  const isAdmin =
    isLoggedIn &&
    (session?.user?.role === UserRole.ADMIN ||
      session?.user?.role === UserRole.SUPERADMIN);

  // Süper yönetici kontrolü
  const isSuperAdmin =
    isLoggedIn && session?.user?.role === UserRole.SUPERADMIN;

  // Function to generate fallback avatar if user has no profile image
  const getProfileImage = () => {
    if (userData.profileImage) return userData.profileImage;
    // Return a placeholder image URL
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      userData.name || "User"
    )}&background=random`;
  };
  
  // Component for user profile display
  const UserProfileSection = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={userData.profileImage} alt="Profile" />
            <AvatarFallback>{userData.name.substring(0, 2)}</AvatarFallback>
          </Avatar>
          <span>{userData.name}</span>
          {isSuperAdmin && (
            <Shield
              className="h-4 w-4 text-destructive"
              aria-label="Süper Yönetici"
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[200]">
        <DropdownMenuItem>
          <Link href="/profile" className="w-full">
            Profil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link href={`/u/${userData.slug}`} className="w-full">
            Herkese Açık Profilim
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link href="/applications" className="w-full">
            Başvurularım
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem>
            <Link href="/admin/dashboard" className="w-full">
              Yönetim Paneli
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
          Çıkış Yap
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Component for auth buttons
  const AuthButtons = () => (
    <>
      <a href="/signin">
        <div className="border-r hidden md:inline"></div>
        <Button variant="outline">Giriş Yap</Button>
      </a>
      <a href="/signup">
        <Button className="w-full justify-between">
          <span>Kayıt Ol</span>
        </Button>
      </a>
    </>
  );

  // Tema değiştirme fonksiyonu
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Client-side rendering için state ekleyelim
  const [mounted, setMounted] = useState(false);

  // Component mount olduktan sonra istemci tarafında olduğumuzu anlamak için
  useEffect(() => {
    setMounted(true);
  }, []);

  // Tema değiştirme butonunu render eden fonksiyon
  const ThemeToggleButton = () => {
    // İkon göstermek için istemci tarafında olmamız gerekiyor
    const icon = !mounted ? null : theme === "dark" ? (
      <Sun className="h-4 w-4" />
    ) : (
      <Moon className="h-4 w-4" />
    );

    return (
      <Button
        variant="outline"
        size="icon"
        onClick={toggleTheme}
        className="rounded-full"
        aria-label="Temayı Değiştir"
      >
        {icon}
      </Button>
    );
  };

  return (
    <>
      <header className="w-full z-[100] fixed top-0 left-0 bg-background border-b shadow-sm">
        <div className="container mx-auto py-2 flex gap-2 flex-row lg:grid lg:grid-cols-12 items-center">
          {/* Logo ve Başlık - Sol taraf */}
          <div className="flex lg:col-span-3 justify-start items-center pl-3 lg:pl-0">
            <Link
              href="/"
              className="text-m lg:text-xl font-bold flex items-center gap-2"
            >
              <Image
                src="https://res.cloudinary.com/dkqu2s9gz/image/upload/v1742649496/eewobokrrfmwt5maygoh.png"
                alt="Logo"
                width={48}
                height={48}
                className="object-contain"
              />
              <span className="text-lg lg:text-xl">
                Türkiye'nin Kıvılcımları
              </span>
            </Link>
          </div>

          {/* Navigasyon Menüsü - Orta kısım */}
          <div className="justify-center items-center gap-2 lg:gap-4 lg:flex hidden lg:col-span-6">
            <NavigationMenu className="flex justify-center items-center">
              <NavigationMenuList className="flex justify-center gap-1 md:gap-2 flex-row">
                {navigationItems.map((item) => (
                  <NavigationMenuItem key={item.title}>
                    <Link href={item.href} legacyBehavior passHref>
                      <NavigationMenuLink asChild>
                        <Button
                          variant={isActive(item.href) ? "default" : "ghost"}
                          size="default"
                          className={
                            isActive(item.href)
                              ? "bg-primary text-primary-foreground"
                              : ""
                          }
                        >
                          {item.title}
                        </Button>
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Kullanıcı ve Tema Kontrolleri - Sağ taraf */}
          <div className="hidden md:flex lg:col-span-3 justify-end w-full gap-2 ml-auto">
            {isLoggedIn ? <UserProfileSection /> : <AuthButtons />}
            <ThemeToggleButton />
          </div>

          {/* Mobil Menü Açma Düğmesi */}
          <div className="flex ml-auto mr-0 md:hidden items-center justify-end gap-2">
            <ThemeToggleButton />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(!isOpen)}
              className="p-0"
            >
              {isOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
        {isOpen && (
          <div className="fixed inset-0 top-16 bg-background/95 backdrop-blur-sm z-[100] overflow-y-auto max-h-[calc(100vh-4rem)]">
            <div className="container mx-auto py-4 px-4">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  {navigationItems.map((item) => (
                    <div key={item.title} className="flex flex-col gap-1">
                      <Link href={item.href} onClick={() => setOpen(false)}>
                        <Button
                          variant={isActive(item.href) ? "default" : "ghost"}
                          className={`w-full justify-start text-base ${
                            isActive(item.href)
                              ? "bg-primary text-primary-foreground"
                              : ""
                          }`}
                        >
                          {item.title}
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-3 mt-4 border-t pt-4">
                  {isLoggedIn ? (
                    <>
                      <div className="flex items-center gap-2 p-2">
                        <Avatar className="w-8 h-8">
                          <AvatarImage
                            src={userData.profileImage}
                            alt="Profile"
                          />
                          <AvatarFallback>
                            {userData.name.substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{userData.name}</span>
                        {isSuperAdmin && (
                          <Shield
                            className="h-4 w-4 text-destructive"
                            aria-label="Süper Yönetici"
                          />
                        )}
                      </div>
                      <Link href="/profile" onClick={() => setOpen(false)}>
                        <Button
                          variant="outline"
                          className="w-full justify-between"
                        >
                          <span>Profil</span>
                          <MoveRight className="w-4 h-4 stroke-1" />
                        </Button>
                      </Link>
                      <Link href="/applications" onClick={() => setOpen(false)}>
                        <Button
                          variant="outline"
                          className="w-full justify-between"
                        >
                          <span>Başvurularım</span>
                          <MoveRight className="w-4 h-4 stroke-1" />
                        </Button>
                      </Link>
                      {isAdmin && (
                        <Link
                          href="/admin/dashboard"
                          onClick={() => setOpen(false)}
                        >
                          <Button
                            variant="outline"
                            className="w-full justify-between"
                          >
                            <span>Yönetim Paneli</span>
                            <MoveRight className="w-4 h-4 stroke-1" />
                          </Button>
                        </Link>
                      )}
                      <Button
                        variant="destructive"
                        className="w-full justify-between"
                        onClick={() => {
                          setOpen(false);
                          signOut({ callbackUrl: "/" });
                        }}
                      >
                        <span>Çıkış Yap</span>
                        <MoveRight className="w-4 h-4 stroke-1" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <a
                        href="/signin"
                        onClick={(e) => {
                          e.preventDefault();
                          setOpen(false);
                          window.location.href = "/signin";
                        }}
                      >
                        <Button
                          variant="outline"
                          className="w-full justify-between"
                        >
                          <span>Giriş Yap</span>
                          <MoveRight className="w-4 h-4 stroke-1" />
                        </Button>
                      </a>
                      <a
                        href="/signup"
                        onClick={(e) => {
                          e.preventDefault();
                          setOpen(false);
                          window.location.href = "/signup";
                        }}
                      >
                        <Button className="w-full justify-between">
                          <span>Kayıt Ol</span>
                          <MoveRight className="w-4 h-4 stroke-1" />
                        </Button>
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </header>
      <div className="pt-16 relative z-0">{children}</div>
    </>
  );
}

export { Header };
