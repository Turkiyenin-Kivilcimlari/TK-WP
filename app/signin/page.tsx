"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn, useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, EyeOff, Eye } from "lucide-react";
import { CloudflareTurnstile } from "@/components/ui/cloudflare-turnstile";
import { useAuth, useAuthStore } from "@/hooks/useAuth";
import api from "@/lib/api";
import { SearchParamsProvider } from "@/components/utils/SearchParamsProvider";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const signInSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi girin"),
  password: z.string(),
});

// Ayrı bir bileşen olarak URL parametrelerini işleyen kısmı ayırıyoruz
function SignInWithSearchParams() {
  // Bu bileşen Suspense içinde çalışacak, useSearchParams güvenli
  const { data: session, status } = useSession();
  const router = useRouter();
  const { useSearchParams } = require('next/navigation');
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("/");
  const { show2FA, email2FA, password2FA, setShow2FA, setEmail2FA, setPassword2FA } = useAuthStore();
  const { login, isLoggingIn } = useAuth();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileVerified, setTurnstileVerified] = useState(false);
  const [turnstileKey, setTurnstileKey] = useState(Date.now().toString());

  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Callback URL işleme
  useEffect(() => {
    const callbackParam = searchParams.get("callbackUrl");
    if (callbackParam) {
      setCallbackUrl(callbackParam);
    }
  }, [searchParams]);

  // Error işleme
  useEffect(() => {
    const error = searchParams.get("error");
    const emailParam = searchParams.get("email");

    if (error) {

      if (error === "TwoFactorRequired" || error.includes("TwoFactorRequired")) {
        if (emailParam) {
          setEmail2FA(emailParam);
          form.setValue("email", emailParam);
          setShow2FA(true);
        }
      } else if (error === "EmailNotVerified" || error.includes("EmailNotVerified")) {
        // E-posta parametresini ve login durumunu kontrol et
        let emailToVerify = null;
        
        // 1. URL parametresini kontrol et
        if (emailParam && emailParam !== "undefined") {
          emailToVerify = emailParam;
        } 
        // 2. Form değerini kontrol et
        else if (form.getValues("email")) {
          emailToVerify = form.getValues("email");
        }
        // 3. Global store'daki e-posta değerini kontrol et
        else if (email2FA) {
          emailToVerify = email2FA;
        }
        
        if (emailToVerify) {
          setLoading(true);
          
          api.post('/auth/send-verification', {
            email: emailToVerify,
            forceNew: true
          })
            .then((response) => {
              setLoading(false);
              router.push(`/verify-email?email=${encodeURIComponent(emailToVerify!)}`);
            })
            .catch((error) => {
              setLoading(false);
              setError("Email doğrulama bağlantısı gönderilemedi.");
            });
        } else {
          setError("E-posta doğrulama için lütfen e-posta adresinizi girin.");
        }
      } else {
        setError("Giriş başarısız!");
      }
    }
  }, [searchParams, form, router, setEmail2FA, setShow2FA]);

  // Form gönderme işleyicisi
  async function handleSubmit(data: z.infer<typeof signInSchema>) {
    setLoading(true);
    setError("");

    try {
      // Temizlenmiş veri ile gönderim yap
      setEmail2FA(data.email.trim().toLowerCase());
      setPassword2FA(data.password);

      await login({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        turnstileToken: turnstileToken || "localhost-dev-verification-token",
      });
    } catch (error: any) {

      if (error.message === "2FA_REQUIRED") {
      } else if (!error.message.startsWith("EMAIL_NOT_VERIFIED")) {
        setError("Giriş sırasında bir hata oluştu");
      }
    } finally {
      setLoading(false);
    }
  }

  // 2FA ile giriş
  async function handleTwoFactorSubmit() {
    try {
      setLoading(true);
      setError("");

      if (twoFactorCode.length !== 6 || !/^\d+$/.test(twoFactorCode)) {
        setError("Lütfen 6 haneli geçerli bir doğrulama kodu girin");
        return;
      }

      const result = await signIn("credentials", {
        email: email2FA,
        password: password2FA,
        twoFactorCode,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {

        if (result.error.includes("2FA")) {
          setError("Geçersiz doğrulama kodu. Lütfen tekrar deneyin.");
        } else {
          setError("Bir hata oluştu. Lütfen tekrar deneyin.");
        }
      } else if (result?.url) {
        toast.success("Başarıyla giriş yapıldı", {
          description: "Ana sayfaya yönlendiriliyorsunuz...",
        });
        router.push(result.url);
      }
    } catch (error: any) {
      setError("Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  // Yönlendirme kontrolü
  if (status === "authenticated") {
    router.push(callbackUrl || "/");
    return null;
  }

  if (show2FA) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center px-4 ">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-xl">İki Faktörlü Doğrulama</CardTitle>
            <CardDescription>
              Hesabınıza erişmek için kimlik doğrulama uygulamanızdaki 6 haneli kodu giriniz
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="twoFactorCode">Doğrulama Kodu</Label>
                <div className="flex justify-center">
                  <InputOTP
                    value={twoFactorCode}
                    onChange={setTwoFactorCode}
                    maxLength={6}
                    render={({ slots }) => (
                      <InputOTPGroup className="gap-2">
                        {slots.map((slot, index) => (
                          <InputOTPSlot key={index} {...slot} />
                        ))}
                      </InputOTPGroup>
                    )}
                    onComplete={(value) => {
                      if (value.length === 6 && !loading) {
                        handleTwoFactorSubmit();
                      }
                    }}
                  />
                </div>
              </div>
              {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <div className="flex flex-col space-y-4 w-full">
              <Button
                onClick={handleTwoFactorSubmit}
                disabled={loading || twoFactorCode.length !== 6}
                className="w-full"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Doğrula ve Giriş Yap
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShow2FA(false)}
              >
                Geri Dön
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-6">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 max-w-sm">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Giriş Yap</h1>
          <p className="text-sm text-muted-foreground">
            E-posta ve şifrenizi girerek hesabınıza giriş yapın
          </p>
        </div>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              type="email"
              placeholder="ornek@email.com"
              {...form.register("email")}
              disabled={loading || isLoggingIn}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Şifre</Label>
                <a
                href="/forgot-password"
                className="text-xs text-muted-foreground hover:text-primary"
                >
                Şifremi Unuttum
                </a>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                {...form.register("password")}
                disabled={loading || isLoggingIn}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading || isLoggingIn}
              >
                {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              </Button>
            </div>
            {form.formState.errors.password && (
              <p className="text-sm text-destructive">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          <div className="mt-1 mb-2">
            <div className="text-sm text-muted-foreground mb-2">
              Lütfen robot olmadığınızı doğrulayın
            </div>
            <CloudflareTurnstile
              key={turnstileKey}
              onVerify={(token) => {
                setTurnstileToken(token);
                setTurnstileVerified(true);
              }}
              onError={() => {
                setTurnstileToken(null);
                setTurnstileVerified(false);
                setError("Robot doğrulama başarısız oldu. Lütfen tekrar deneyin.");
              }}
            />
            {turnstileVerified && (
              <div className="flex items-center text-sm text-green-600 mt-2">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                <span>Robot doğrulaması başarılı</span>
              </div>
            )}
          </div>

          <Button
            disabled={
              loading || isLoggingIn || (!turnstileVerified && process.env.NODE_ENV !== "development")
            }
            type="submit"
            className="w-full"
          >
            {(loading || isLoggingIn) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Giriş Yapılıyor...
              </>
            ) : (
              "Giriş Yap"
            )}
          </Button>
        </form>
        <div className="px-8 text-center text-sm space-y-2">
          <p className="text-muted-foreground">
            Hesabınız yok mu?{" "}
            <a
              href="/signup"
              className="underline underline-offset-4 hover:text-primary"
            >
              Hemen kaydolun
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

// Ana bileşenimiz artık sadece bir wrapper olarak çalışıyor
export default function SignInPage() {
  return (
    <SearchParamsProvider>
      <SignInWithSearchParams />
    </SearchParamsProvider>
  );
}