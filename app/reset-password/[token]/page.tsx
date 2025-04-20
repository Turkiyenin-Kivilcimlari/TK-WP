"use client";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import api from "@/lib/api";

// Şema tanımlama
const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Şifre en az 8 karakter olmalıdır')
    .regex(/[a-z]/, 'Şifre en az bir küçük harf içermelidir')
    .regex(/[A-Z]/, 'Şifre en az bir büyük harf içermelidir')
    .regex(/\d/, 'Şifre en az bir rakam içermelidir'),
  confirmPassword: z
    .string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Şifreler eşleşmiyor",
  path: ["confirmPassword"],
});

export default function ResetPasswordPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const handleSubmit = async (values: z.infer<typeof resetPasswordSchema>) => {
    try {
      setLoading(true);
      setError("");

      // Mail ile şifre sıfırlama için 2FA gerekmiyor - token ile doğrulama yeterli
      // token parametresi zaten mail doğrulaması anlamına geliyor
      const response = await api.post('/auth/reset-password', {
        token: params.token,
        password: values.password,
        confirmPassword: values.confirmPassword,
        skipTwoFactor: true // 2FA doğrulamasını atla
      });

      if (response.data.success) {
        setSuccess(true);
        toast.success("Şifre sıfırlandı", {
          description: "Şifreniz başarıyla sıfırlandı. Giriş yapabilirsiniz.",
        });
        
        // Başarılı şifre sıfırlama sonrası 3 saniye bekleyip giriş sayfasına yönlendir
        setTimeout(() => {
          router.push('/signin');
        }, 3000);
      }
    } catch (error: any) {
      
      // 2FA artık gerekli olmamalı, ancak yine de kontrol edelim (backward compatibility için)
      if (error.response?.data?.requires2FA) {
        setRequires2FA(true);
        setError("İki faktörlü doğrulama kodu gerekiyor");
      } else {
        setError("Şifre sıfırlama sırasında bir hata oluştu");
      }
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async () => {
    if (!twoFactorCode || twoFactorCode.length !== 6) {
      setError("Lütfen 6 haneli doğrulama kodunu girin");
      return;
    }
    
    // Form değerlerini al ve şifre sıfırlama isteğini tekrar gönder
    const values = form.getValues();
    await handleSubmit(values);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 ">
      <div className="mx-auto flex w-full justify-center space-y-6 max-w-sm">
    <div className="container flex justify-center items-center min-h-screen ">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Şifre Sıfırlama</CardTitle>
          <CardDescription>Hesabınız için yeni şifre belirleyin</CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <Alert className="bg-green-50 border-green-200 mb-4">
              <Check className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-700">Şifre Sıfırlandı</AlertTitle>
              <AlertDescription className="text-green-700">
                Şifreniz başarıyla sıfırlandı. Giriş sayfasına yönlendiriliyorsunuz...
              </AlertDescription>
            </Alert>
          ) : requires2FA ? (
            // İki faktörlü doğrulama gerekliyse, 2FA kodu girişi göster
            <div className="space-y-4">
              <Alert className="mb-4 border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-700">İki Faktörlü Doğrulama Gerekli</AlertTitle>
                <AlertDescription className="text-amber-700">
                  Hesabınızın güvenliği için şifre sıfırlamadan önce iki faktörlü doğrulama kodunu girmeniz gerekiyor.
                </AlertDescription>
              </Alert>
              
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Hata</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-1">
                <FormLabel>2FA Doğrulama Kodu</FormLabel>
                <Input
                  placeholder="6 haneli doğrulama kodu"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                />
                <p className="text-xs text-muted-foreground">
                  Mobil kimlik doğrulama uygulamanızdaki 6 haneli kodu girin
                </p>
              </div>
              
              <Button 
                type="button" 
                onClick={handle2FASubmit} 
                disabled={loading || twoFactorCode.length !== 6} 
                className="w-full"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Doğrula ve Şifreyi Sıfırla
              </Button>
            </div>
          ) : (
            // Normal şifre sıfırlama formu
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Hata</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Yeni Şifre</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Yeni şifreniz" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Şifreyi Tekrarla</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Şifrenizi tekrar girin" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Şifreyi Sıfırla
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="link" className="px-0" onClick={() => router.push('/signin')}>
            Giriş sayfasına dön
          </Button>
        </CardFooter>
      </Card>
    </div>
      </div>
    </div>
  );
}
