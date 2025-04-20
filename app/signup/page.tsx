"use client";
import { SignupForm } from "@/components/form/SignupForm";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import { CloudflareTurnstile } from "@/components/ui/cloudflare-turnstile";

export default function SignupPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  // Turnstile için gerekli state'ler
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileVerified, setTurnstileVerified] = useState(false);
  const [turnstileKey, setTurnstileKey] = useState(Date.now().toString());
  
  // Turnstile doğrulama işleyicileri
  const handleTurnstileVerify = (token: string) => {
    setTurnstileToken(token);
    setTurnstileVerified(true);
  };

  const handleTurnstileError = () => {
    setTurnstileToken(null);
    setTurnstileVerified(false);
  };

  // Doğrulama başarılı olduğunda gösterilecek bileşen
  const renderVerificationSuccess = () => {
    return (
      <div className="flex items-center text-sm text-green-600 mt-2">
        <CheckCircle2 className="h-4 w-4 mr-2" />
        <span>Robot doğrulaması başarılı</span>
      </div>
    );
  };
  
  // Kullanıcı oturumu kontrolü
  useEffect(() => {
    // Sayfa açıldığında Turnstile'ı sıfırla
    setTurnstileToken(null);
    setTurnstileVerified(false);
    setTurnstileKey(Date.now().toString());
    
    if (status === "authenticated" && session) {
      router.push("/");
    }
  }, [session, status, router]);
  
  // Eğer oturum durumu kontrol ediliyorsa yükleme ekranı göster
  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  // Kullanıcının oturumu varsa, yönlendirme işlemi useEffect içinde gerçekleşecek
  if (status === "authenticated") {
    return null;
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[450px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Hesap Oluştur
          </h1>
          <p className="text-sm text-muted-foreground">
            Bilgilerinizi girerek yeni bir hesap oluşturun
          </p>
        </div>
        
        <SignupForm turnstileToken={turnstileToken || undefined} turnstileVerified={turnstileVerified} />
        
        <p className="px-8 text-center text-sm text-muted-foreground">
          Zaten hesabınız var mı?{" "}
            <a 
            href="/signin" 
            className="underline underline-offset-4 hover:text-primary"
            >
            Giriş yapın
            </a>
        </p>
      </div>
    </div>
  );
}
