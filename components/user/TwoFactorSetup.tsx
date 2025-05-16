"use client"
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LockKeyhole, ShieldAlert, ShieldCheck, Copy, Check, RefreshCw } from 'lucide-react';
import { useTwoFactor } from '@/hooks/useTwoFactor';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UserRole } from '@/models/User';
import { useSession } from 'next-auth/react';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';


export function TwoFactorSetup() {
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDisableOpen, setConfirmDisableOpen] = useState(false);
  const [confirmChangeOpen, setConfirmChangeOpen] = useState(false);
  const [verificationToken, setVerificationToken] = useState('');
  const { data: session } = useSession();
  
  const {
    twoFactorStatus,
    isLoading,
    setupTwoFactor,
    enableTwoFactor,
    disableTwoFactor,
    verifyTwoFactor,
    isSettingUp,
    isEnabling,
    isDisabling,
    isVerifying
  } = useTwoFactor();

  const isAdmin = session?.user?.role === UserRole.ADMIN || session?.user?.role === UserRole.SUPERADMIN;

  const handleSetup = async () => {
    try {
      setLoading(true);
      
      const response = await setupTwoFactor();
      
      if (response && response.success && response.data) {
        
        setQrCode(response.data.qrCode);
        setSecret(response.data.secret);
        setSetupComplete(true);
        
      } else {
        toast.error('2FA kurulumu sırasında bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };


  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // 2 saniye sonra kopyalama durumunu sıfırla
    });
  };

  const handleEnable = () => {
    if (!token || token.length !== 6) return;
    
    // OTP girerken veriyi bir araya getirin ve SpaceKey girilmemesi için
    // Son kontrol - sadece sayısal karakterler içerdiğine emin olun
    const cleanToken = token.replace(/\s/g, '');
    
    if (/^\d{6}$/.test(cleanToken)) {
      enableTwoFactor(cleanToken);
      setToken('');
    } else {
      toast.error('Geçersiz token formatı. Lütfen 6 haneli bir kod girin.');
    }
  };

  const handleOpenDisableConfirm = () => {
    setVerificationToken('');
    setConfirmDisableOpen(true);
  };

  const handleOpenChangeConfirm = () => {
    setVerificationToken('');
    setConfirmChangeOpen(true);
  };

  const handleDisable = () => {
    if (!verificationToken || verificationToken.length !== 6) return;
    
    const cleanToken = verificationToken.replace(/\s/g, '');
    
    if (/^\d{6}$/.test(cleanToken)) {
      // Doğrulama kodu göndermeye devam et
      disableTwoFactor(cleanToken);
      
      // UI durumunu ancak başarılı yanıt gelirse güncelle
      // Bu kısım useTwoFactor hook'una taşınmalı veya başarı yanıtı kontrol edilmeli
    } else {
      toast.error('Geçersiz token formatı. Lütfen 6 haneli bir kod girin.');
    }
  };

  const handleChange = async () => {
    if (!verificationToken || verificationToken.length !== 6) return;
    
    const cleanToken = verificationToken.replace(/\s/g, '');
    
    if (/^\d{6}$/.test(cleanToken)) {
      try {
        // Önce mevcut tokeni doğrula
        const verifyResponse = await verifyTwoFactor(cleanToken);
        if (verifyResponse && verifyResponse.success) {
          // Doğrulama başarılıysa, yeni kurulumu başlat
          setConfirmChangeOpen(false);
          setVerificationToken('');
          await handleSetup();
        }
      } catch (error) {
        toast.error('Doğrulama sırasında bir hata oluştu. Lütfen tekrar deneyin.');
      }
    }
  };

  // Ana yükleme durumu
  if (isLoading) {
    return (
      <div className="flex flex-col space-y-4 py-10">
        <Skeleton className="h-[40px] w-full bg-primary/20" />
        <Skeleton className="h-[200px] w-full bg-primary/10" />
        <Skeleton className="h-[40px] w-full bg-primary/20" />
        <div className="flex space-x-3">
          <Skeleton className="h-[30px] w-full bg-primary/10" />
          <Skeleton className="h-[30px] w-1/3 bg-primary/20" />
        </div>
      </div>
    );
  }

  // QR kodu başarıyla döndürülmüşse onu göster
  if (setupComplete && qrCode && secret) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LockKeyhole className="h-5 w-5" />
            İki Faktörlü Kimlik Doğrulama Kurulumu
          </CardTitle>
          <CardDescription>
            Kimlik doğrulayıcı uygulamanızı kullanarak QR kodu tarayın.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <img
                src={qrCode}
                alt="QR Kodu"
                className="mx-auto"
                width="200"
                height="200"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Gizli Anahtar</Label>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 gap-1" 
                onClick={handleCopySecret}
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Kopyalandı</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Kopyala</span>
                  </>
                )}
              </Button>
            </div>
            <div className="p-2  rounded-md font-mono text-sm break-all">
              {secret}
            </div>
            <p className="text-sm text-muted-foreground">
              Tarama yapamazsanız, kodunuzu manuel olarak girin.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="token">Doğrulama Kodu</Label>
            <div className="flex flex-col  space-y-4">
              <InputOTP 
              className='items-center justify-center'
                maxLength={6} 
                value={token} 
                onChange={(value) => setToken(value)}
                render={({ slots }) => (
                  <InputOTPGroup className="gap-2">
                    {slots.map((slot, index) => (
                      <InputOTPSlot key={index} {...slot} />
                       
                    ))}
                  </InputOTPGroup>
                )}
              />
              <Button 
                onClick={handleEnable} 
                disabled={isEnabling || token.length < 6}
              >
                {isEnabling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Etkinleştir
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Admin kullanıcıları için daha net uyarı
  if (isAdmin && !twoFactorStatus?.enabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <ShieldAlert className="h-5 w-5" />
            2FA Zorunlu
          </CardTitle>
          <CardDescription>
            Yönetici yetkilerinizi kullanmak için iki faktörlü kimlik doğrulamayı etkinleştirmeniz gerekiyor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Güvenlik Uyarısı</AlertTitle>
            <AlertDescription>
              Yönetici hesapları için iki faktörlü kimlik doğrulama zorunludur.
            </AlertDescription>
          </Alert>
          <Button 
            onClick={handleSetup}
            className="w-full" 
            disabled={loading || isSettingUp}
          >
            {(loading || isSettingUp) ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Kurulumu Başlat
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 2FA etkinse, doğrulama veya devre dışı bırakma seçenekleri göster
  if (twoFactorStatus?.enabled) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <ShieldCheck className="h-5 w-5" />
              İki Faktörlü Kimlik Doğrulama Etkin
            </CardTitle>
            <CardDescription>
              Hesabınız iki faktörlü kimlik doğrulama ile korunuyor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-700">Güvenlik Etkin</AlertTitle>
              <AlertDescription className="text-green-700">
                İki faktörlü kimlik doğrulama hesabınızı korumaya yardımcı olur.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <Button
                variant="outline"
                onClick={handleOpenChangeConfirm}
                className="flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                2FA'yı Değiştir
              </Button>
              
              <Button
                variant="outline"
                onClick={handleOpenDisableConfirm}
                className="flex items-center text-red-500 hover:text-red-500" 
                disabled={isAdmin} // Sadece devre dışı bırakma seçeneği Admin için kapalı
              >
                <ShieldAlert className="h-4 w-4 mr-2 " />
                2FA'yı Devre Dışı Bırak
              </Button>
            </div>
            
            {isAdmin && (
              <p className="text-xs text-red-500 mt-1">
                * Yönetici hesapları için 2FA zorunludur fakat güvenlik için değiştirilebilir
              </p>
            )}
          </CardContent>
        </Card>
        
        {/* 2FA Devre Dışı Bırakma Onay Dialogu */}
        <Dialog open={confirmDisableOpen} onOpenChange={setConfirmDisableOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>2FA'yı Devre Dışı Bırak</DialogTitle>
              <DialogDescription>
                İki faktörlü kimlik doğrulamayı devre dışı bırakmak için mevcut doğrulama kodunuzu girin.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Doğrulama Kodu</Label>
                <InputOTP 
                
              className='items-center justify-center'
                  maxLength={6} 
                  value={verificationToken} 
                  onChange={(value) => setVerificationToken(value)}
                  render={({ slots }) => (
                    <InputOTPGroup className="gap-2">
                      {slots.map((slot, index) => (
                        <InputOTPSlot key={index} {...slot} />
                      ))}
                    </InputOTPGroup>
                  )}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDisableOpen(false)}>
                İptal
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDisable}
                disabled={isDisabling || verificationToken.length < 6}
              >
                {isDisabling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Devre Dışı Bırak
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* 2FA Değiştirme Onay Dialogu */}
        <Dialog open={confirmChangeOpen} onOpenChange={setConfirmChangeOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>2FA'yı Değiştir</DialogTitle>
              <DialogDescription>
                İki faktörlü kimlik doğrulamayı değiştirmek için mevcut doğrulama kodunuzu girin.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Doğrulama Kodu</Label>
                <InputOTP 
                
              className='items-center justify-center'
                  maxLength={6} 
                  value={verificationToken} 
                  onChange={(value) => setVerificationToken(value)}
                  render={({ slots }) => (
                    <InputOTPGroup className="gap-2">
                      {slots.map((slot, index) => (
                        <InputOTPSlot key={index} {...slot} />
                      ))}
                    </InputOTPGroup>
                  )}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmChangeOpen(false)}>
                İptal
              </Button>
              <Button 
                onClick={handleChange}
                disabled={isVerifying || verificationToken.length < 6}
              >
                {isVerifying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Devam Et
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Varsayılan durum - 2FA etkin değil
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LockKeyhole className="h-5 w-5" />
          İki Faktörlü Kimlik Doğrulama
        </CardTitle>
        <CardDescription>
          Hesabınızı korumak için iki faktörlü kimlik doğrulama ekleyin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Önerilen</AlertTitle>
          <AlertDescription>
            İki faktörlü kimlik doğrulama, hesabınıza ek bir güvenlik katmanı ekler.
          </AlertDescription>
        </Alert>
        <Button 
          onClick={handleSetup}
          className="w-full" 
          disabled={loading || isSettingUp}
        >
          {(loading || isSettingUp) ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Kurulumu Başlat
        </Button>
      </CardContent>
    </Card>
  );
}
