"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersList } from "@/components/admin/UsersList";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Loader2, ArrowLeft, Shield } from "lucide-react";
import { UserRole } from "@/models/User";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";

export default function UsersPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Oturum yükleniyor
  const { data: session, status } = useSession();

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

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      let url = `/admin/users?page=${page}&limit=${pageSize}`;

      if (roleFilter !== "all") {
        url += `&role=${roleFilter}`;
      }

      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }

      const response = await api.get(url);
      setUsers(response.data.users);
      setTotalUsers(response.data.total);
      setTotalPages(response.data.pages);
    } catch (error) {
      toast.error("Kullanıcılar yüklenirken bir hata oluştu");
    } finally {
      setIsLoading(false);
    }
  };

  // Kullanıcı silme işlemi
  const handleDeleteUser = async (userId: string) => {
    try {
      setDeletingUserId(userId);
      await api.delete(`/admin/users/${userId}`);
      toast.success("Kullanıcı başarıyla silindi");
      fetchUsers();
    } catch (error: any) {
      toast.error("Kullanıcı silinirken bir hata oluştu");
    } finally {
      setDeletingUserId(null);
      setConfirmDialogOpen(false);
    }
  };

  // Kullanıcı düzenleme işlemi
  const handleEditUser = async (formData: any) => {
    try {
      setIsUpdating(true);
      const response = await api.put(
        `/admin/users/${selectedUser?.id}`, // URL'i doğrudan admin endpoint'ine yönlendir
        formData
      );
      toast.success("Kullanıcı bilgileri güncellendi");
      setEditModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast.error("Kullanıcı güncellenirken bir hata oluştu");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex min-h-screen justify-center">
      <div className="container max-w-7xl py-8 px-4 md:py-12 md:px-3">
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Kullanıcı Yönetimi</h1>
        </div>

        {/* Sadece SUPERADMIN için erişim butonunu göster */}
        {session?.user?.role === UserRole.SUPERADMIN && (
          <div className="mb-6">
            <Button variant="destructive">
              <Shield className="mr-2 h-4 w-4" />
              Şu anda Süper Yönetici olarak oturum açtınız.
            </Button>
            <p className="mt-2 text-sm text-muted-foreground">
              Süper yönetici olarak, normal yöneticilerin yapabildiği tüm işlemleri yapabilir ve ek olarak yedekleme izinlerini ayarlayabilirsiniz.
            </p>
          </div>
        )}

        <Card className="overflow-hidden mb-8 md:mb-10">
          <CardHeader className="bg-muted/50 px-4 py-4 md:p-6">
            <CardTitle className="text-lg md:text-xl">Tüm Kullanıcılar</CardTitle>
            <CardDescription className="text-sm md:text-base">
              Sisteme kayıtlı tüm kullanıcıları (Üye, Topluluk Temsilcisi, Yönetim Üyesi ve Süper Yönetici) burada görebilir, rollerini değiştirebilir veya silebilirsiniz.
              {session?.user?.role === UserRole.SUPERADMIN && (
                <> Ayrıca yönetici hesaplarının yedekleme izinlerini de bu sayfadan yönetebilirsiniz.</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <UsersList currentUserId={session?.user?.id || ""} />
          </CardContent>
        </Card>

        <div className="flex justify-center gap-4 mt-8 md:mt-10">
          <Button variant="outline" asChild className="flex items-center gap-2 w-full md:w-auto">
            <Link href="/admin/dashboard">
              <ArrowLeft className="h-4 w-4" /> Yönetim Paneline Dön
            </Link>
          </Button>
          <Button variant="outline" asChild className="flex items-center gap-2 w-full md:w-auto">
            <Link href="/profile">
              <ArrowLeft className="h-4 w-4" /> Profile Dön
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
