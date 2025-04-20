"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Smartphone, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CloudflareTurnstile } from "@/components/ui/cloudflare-turnstile";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [has2FA, setHas2FA] = useState(false);
  const [step, setStep] = useState<"email" | "options" | "success">("email");
  const router = useRouter();
  
  // Turnstile doğrulaması için state'ler
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const [turnstileVerified, setTurnstileVerified] = useState<boolean>(false);
  const [turnstileKey, setTurnstileKey] = useState(Date.now().toString());

  // Sayfa yüklendiğinde Turnstile'ı sıfırla
  useEffect(() => {
    setTurnstileToken("");
    setTurnstileVerified(false);
    setTurnstileKey(Date.now().toString());
  }, []);

  // Turnstile doğrulama işleyicisi
  const handleTurnstileVerify = (token: string) => {
    setTurnstileToken(token);
    setTurnstileVerified(true);
  };

  // Turnstile hata işleyicisi
  const handleTurnstileError = () => {
    setTurnstileToken("");
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

  const checkEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast.error('Lütfen geçerli bir e-posta adresi girin');
      return;
    }
    
    // Turnstile doğrulaması kontrolü
    if (!turnstileVerified && process.env.NODE_ENV !== 'development') {
      toast.error('Lütfen robot olmadığınızı doğrulayın');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Öncelikle kullanıcının 2FA durumunu kontrol et
      const checkResponse = await api.post('/auth/check-account', { 
        email,
        turnstileToken 
      });
      
      if (checkResponse.data.success) {
        // Kullanıcının 2FA durumunu kaydet
        setHas2FA(checkResponse.data.has2FA || false);
        
        if (checkResponse.data.has2FA) {
          // Kullanıcının 2FA'sı var, seçenekleri göster
          setStep("options");
        } else {
          // 2FA yok, doğrudan e-posta ile sıfırlama gönder
          await sendResetEmail();
        }
      } else {
        // Hata durumunda bile başarılı gibi göster (güvenlik için)
        await sendResetEmail();
      }
    } catch (error) {
      // Hata durumunda bile başarılı gibi göster (güvenlik için)
      await sendResetEmail();
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendResetEmail = async () => {
    try {
      setIsSubmitting(true);
      const response = await api.post('/auth/forgot-password', { 
        email,
        turnstileToken 
      });
      
      if (response.data.success) {
        setStep("success");
        toast.success('E-posta gönderildi', {
          description: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.'
        });
      } else {
        // Güvenlik için başarılı gibi göster
        setStep("success");
        toast.success('E-posta gönderildi', {
          description: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.'
        });
      }
    } catch (error) {
      // Güvenlik için başarılı gibi göster
      setStep("success");
      toast.success('E-posta gönderildi', {
        description: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinueWith2FA = () => {
    router.push(`/reset-password-2fa?email=${encodeURIComponent(email)}`);
  };

  // Başarılı ekranı göster
  if (step === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="mx-auto w-full max-w-md space-y-8 p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">E-posta Gönderildi</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.
              Lütfen gelen kutunuzu kontrol edin.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <Button variant="outline" asChild>
              <a href="/signin">Giriş Sayfasına Dön</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Seçenekler ekranı - 2FA etkin ise
  if (step === "options") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Şifre Sıfırlama</CardTitle>
            <CardDescription>
              Hesabınızda iki faktörlü kimlik doğrulama etkinleştirilmiş. 
              Şifrenizi nasıl sıfırlamak istersiniz?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertTitle className="text-blue-700">Güvenli Hesap</AlertTitle>
              <AlertDescription className="text-blue-700">
                Hesabınız iki faktörlü kimlik doğrulama ile korunuyor.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <Button 
                onClick={handleContinueWith2FA} 
                className="w-full flex items-center justify-between"
                variant="outline"
              >
                <div className="flex items-center">
                  <Smartphone className="mr-2 h-4 w-4" />
                  İki Faktörlü Doğrulama ile Devam Et
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>
              
              <Button 
                onClick={sendResetEmail} 
                className="w-full flex items-center justify-between"
                variant="outline"
                disabled={isSubmitting}
              >
                <div className="flex items-center">
                  <Mail className="mr-2 h-4 w-4" />
                  E-posta ile Şifre Sıfırlama Bağlantısı Gönder
                </div>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button variant="link" className="px-0" asChild>
              <a href="/signin">Giriş sayfasına dön</a>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // İlk adım - e-posta girişi
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="mx-auto w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Şifremi Unuttum</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            E-posta adresinizi girin ve size şifre sıfırlama seçeneklerini gösterelim.
          </p>
        </div>
        
        <form className="space-y-6" onSubmit={checkEmail}>
          <div className="space-y-2">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              type="email"
              placeholder="ornek@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>
          
          {/* Cloudflare Turnstile Widget */}
          <div className="mt-1 mb-2">
            <div className="text-sm text-muted-foreground mb-2">
              Lütfen robot olmadığınızı doğrulayın
            </div>
            <CloudflareTurnstile 
              key={turnstileKey}
              onVerify={handleTurnstileVerify}
              onError={handleTurnstileError}
            />
            {turnstileVerified && renderVerificationSuccess()}
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting || (!turnstileVerified && process.env.NODE_ENV !== 'development')}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Kontrol Ediliyor...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Devam Et
              </>
            )}
          </Button>
        </form>
        
        <div className="text-center text-sm">
            <a href="/signin" className="text-primary hover:underline">
            Giriş sayfasına dön
            </a>
        </div>
      </div>
    </div>
  );
}
