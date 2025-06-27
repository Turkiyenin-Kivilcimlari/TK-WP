import { Metadata } from "next";
import { TwoFactorSetup } from "@/components/user/TwoFactorSetup";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProfileContent from "@/components/user/ProfileContent";
import { UserRole } from "@/models/User";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profil - Türkiye'nin Kıvılcımları",
  description: "Kullanıcı profili ve güvenlik ayarları",
};

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  // Oturum kontrolü - kullanıcı giriş yapmamışsa giriş sayfasına yönlendir
  if (!session || !session.user) {
    // Kullanıcının girmeye çalıştığı sayfayı callbackUrl olarak ekleyerek giriş sayfasına yönlendir
    redirect("/signin?callbackUrl=/profile");
    // Kod buradan sonra çalışmayacağı için return kullanmaya gerek yok
  }

  // Kullanıcının slug bilgisini veritabanından getir
  let userSlug = null;
  try {
    await connectToDatabase();
    const user = await User.findById(session.user.id).select("slug");
    userSlug = user?.slug;
  } catch (error) {
  }

  // Kullanıcı rolü kontrolü - session'dan alır
  const userRole = session.user.role;
  const isAdmin =
    userRole === UserRole.ADMIN || userRole === UserRole.SUPERADMIN;

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 md:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">Profil Ayarları</h1>

        {userSlug && (
          <Button
            variant="outline"
            asChild
            className="flex items-center gap-2 w-fit"
          >
            <Link href={`/u/${userSlug}`} target="_blank">
              <ExternalLink className="h-4 w-4" />
              Herkese Açık Profilimi Görüntüle
            </Link>
          </Button>
        )}
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="general">Genel Bilgiler</TabsTrigger>
          <TabsTrigger value="security">Güvenlik</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <ProfileContent />
        </TabsContent>

        <TabsContent value="security">
          <div className="space-y-8">
            <div className="p-6 rounded-lg shadow-sm border">
              <h2 className="text-xl font-semibold mb-4">
                İki Faktörlü Kimlik Doğrulama
              </h2>
              <TwoFactorSetup />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
