"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { AlertCircle, Check, Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import api from "@/lib/api";

// Şema tanımlama
const resetWith2FASchema = z.object({
  password: z
    .string()
    .min(8, 'Şifre en az 8 karakter olmalıdır')
    .regex(/[a-z]/, 'Şifre en az bir küçük harf içermelidir')
    .regex(/[A-Z]/, 'Şifre en az bir büyük harf içermelidir')
    .regex(/\d/, 'Şifre en az bir rakam içermelidir'),
  confirmPassword: z
    .string(),
  twoFactorCode: z
    .string()
    .min(6, 'Doğrulama kodu 6 haneli olmalıdır')
    .max(6, 'Doğrulama kodu 6 haneli olmalıdır')
}).refine(data => data.password === data.confirmPassword, {
  message: "Şifreler eşleşmiyor",
  path: ["confirmPassword"],
});

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    // E-posta yoksa giriş sayfasına yönlendir
    if (!email) {
      router.push('/forgot-password');
    }
  }, [email, router]);

  const form = useForm<z.infer<typeof resetWith2FASchema>>({
    resolver: zodResolver(resetWith2FASchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
      twoFactorCode: "",
    },
    mode: "onChange" // Form değerlerini değiştikçe doğrulama yap
  });

  const handleSubmit = async (values: z.infer<typeof resetWith2FASchema>) => {
    try {
      setLoading(true);
      setError("");

      const response = await api.post('/auth/reset-password-2fa', {
        email: email,
        password: values.password,
        confirmPassword: values.confirmPassword,
        twoFactorCode: values.twoFactorCode
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
      setError("Şifre sıfırlama sırasında bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };
  
  // Form değerlerini ve doğrulama durumunu izle
  const password = form.watch("password");
  const confirmPassword = form.watch("confirmPassword");
  const twoFactorCode = form.watch("twoFactorCode");
  
  // Form değerlerinin dolu olup olmadığını kontrol et
  const isFormFilled = password && confirmPassword && twoFactorCode && twoFactorCode.length === 6;

  return (
    <div className="container flex justify-center items-center min-h-screen py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>İki Faktörlü Doğrulama ile Şifre Sıfırlama</CardTitle>
          <CardDescription>
            Hesabınız için yeni şifre belirleyin ve mobil uygulamanızdaki 2FA kodunu girin
          </CardDescription>
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
          ) : (
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Hata</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Şifre sıfırlama işlemi bu e-posta adresine bağlı hesap için yapılacak
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Yeni Şifre</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Yeni şifreniz"
                    {...form.register("password")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-sm font-medium text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Şifreyi Tekrarla</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Şifrenizi tekrar girin"
                    {...form.register("confirmPassword")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
                {form.formState.errors.confirmPassword && (
                  <p className="text-sm font-medium text-destructive">
                    {form.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="twoFactorCode">2FA Doğrulama Kodu</Label>
                <Input
                  id="twoFactorCode"
                  placeholder="6 haneli doğrulama kodu"
                  {...form.register("twoFactorCode")}
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').substring(0, 6);
                    form.setValue("twoFactorCode", value);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Mobil kimlik doğrulama uygulamanızdaki 6 haneli kodu girin
                </p>
                {form.formState.errors.twoFactorCode && (
                  <p className="text-sm font-medium text-destructive">
                    {form.formState.errors.twoFactorCode.message}
                  </p>
                )}
              </div>
              
              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full mt-4"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Şifremi Sıfırla
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="link" className="px-0" onClick={() => router.push('/signin')}>
            Giriş sayfasına dön
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// Main page component with Suspense boundary
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
