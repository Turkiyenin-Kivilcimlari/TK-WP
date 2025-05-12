"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

function VerifyEmailClient() {
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // URL'den e-posta parametresini al
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  useEffect(() => {
    // Geri sayım
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && resendDisabled) {
      setResendDisabled(false);
    }
  }, [countdown, resendDisabled]);

  // Doğrulama kodunu yeniden gönder
  const handleResendCode = async () => {
    if (!email) {
      toast.error("E-posta adresi gereklidir");
      return;
    }

    // Email formatını kontrol et - güvenlik için
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Geçersiz e-posta formatı");
      return;
    }

    setResendDisabled(true);
    setCountdown(60); // 60 saniye bekleme süresi

    try {
      const response = await api.post("/auth/send-verification", { 
        email: email.trim().toLowerCase(), // Normalize email
        forceNew: true 
      });

      if (response.status === 200) {
        toast.success("Doğrulama kodu gönderildi", {
          description: "Lütfen e-posta kutunuzu kontrol edin",
        });
      } else {
        toast.error("Doğrulama kodu gönderilemedi", {
          description: response.data.message,
        });
        setResendDisabled(false);
        setCountdown(0);
      }
    } catch (error: any) {
      toast.error("Doğrulama kodu gönderilemedi", {
        description: "Bir hata oluştu",
      });
      setResendDisabled(false);
      setCountdown(0);
    }
  };

  // Yeni doğrulama kodu iste
  const requestNewCode = async () => {
    if (!email) {
      toast.error("Lütfen e-posta adresinizi girin");
      return;
    }

    if (resendDisabled) {
      return;
    }

    setResendDisabled(true);
    setCountdown(60); // 60 saniye bekletme süresi

    try {
      const response = await api.post("/auth/send-verification", {
        email,
        forceNew: true, // Yeni bir token oluşturulmasını zorla
      });

      if (response.status === 200) {
        toast.success("Doğrulama kodu gönderildi", {
          description: "Lütfen e-posta kutunuzu kontrol edin",
        });
      } else {
        toast.error("Doğrulama kodu gönderilemedi", {
          description: response.data.message,
        });
        setResendDisabled(false);
        setCountdown(0);
      }
    } catch (error: any) {
      toast.error("Doğrulama kodu gönderilemedi", {
        description: "Bir hata oluştu",
      });
      setResendDisabled(false);
      setCountdown(0);
    }
  };

  // OTP kodunu doğrula
  const handleVerifyOtp = useCallback(async () => {
    if (otpCode.length !== 6) {
      toast.error("Lütfen 6 haneli kodu eksiksiz girin");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post("/auth/verify-email", { email, code: otpCode });

      if (response.status === 200) {
        setIsVerified(true);
        toast.success("E-posta adresiniz doğrulandı");

        // 2 saniye sonra giriş sayfasına yönlendir
        setTimeout(() => {
          router.push("/signin");
        }, 2000);
      } else {
        toast.error("Doğrulama başarısız", {
          description: response.data.message,
        });
      }
    } catch (error: any) {
      toast.error("Doğrulama hatası", {
        description: "Bir hata oluştu",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [otpCode, email, router]);

  // OTP kodu değiştiğinde ve 6 hane olduğunda otomatik doğrulama yap
  useEffect(() => {
    if (otpCode.length === 6 && !isSubmitting && !isVerified) {
      handleVerifyOtp();
    }
  }, [otpCode, isSubmitting, isVerified, handleVerifyOtp]);

  if (isVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="mx-auto w-full max-w-md space-y-8 p-8">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">E-posta Doğrulandı</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              E-posta adresiniz başarıyla doğrulandı. Giriş sayfasına yönlendiriliyorsunuz...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="mx-auto w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">E-posta Doğrulama</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            E-posta adresinize gönderilen 6 haneli kodu girin
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">E-posta Adresi</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@email.com"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Doğrulama Kodu</Label>
            <div className="flex justify-center">
              <InputOTP 
                maxLength={6}
                value={otpCode}
                onChange={(value) => setOtpCode(value)}
                disabled={isSubmitting}
                render={({ slots }) => (
                  <InputOTPGroup className="gap-2">
                    {slots.map((slot, index) => (
                      <InputOTPSlot 
                        key={index} 
                        {...slot}
                        className="h-12 w-12 text-center text-lg"
                      />
                    ))}
                  </InputOTPGroup>
                )}
              />
            </div>
          </div>

          <Button
            type="button"
            className="w-full"
            onClick={handleVerifyOtp}
            disabled={isSubmitting || otpCode.length < 6}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Doğrulanıyor...
              </>
            ) : (
              "Doğrula"
            )}
          </Button>

          <div className="text-center">
            <Button
              variant="link"
              size="sm"
              onClick={handleResendCode}
              disabled={resendDisabled}
            >
              {resendDisabled ? `Yeniden gönder (${countdown})` : "Kodu yeniden gönder"}
            </Button>
          </div>
        </div>

        <div className="text-center text-sm">
            <a href="/signin" className="text-primary hover:underline">
            Giriş sayfasına dön
            </a>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      }
    >
      <VerifyEmailClient />
    </Suspense>
  );
}
