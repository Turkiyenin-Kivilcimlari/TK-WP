import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useTwoFactor } from '@/hooks/useTwoFactor';
import { UserRole } from '@/models/User';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

// OTP Input bileşenleri için import (InputOTPSeparator kaldırıldı)
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export function TwoFactorVerifyModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [token, setToken] = useState('');
  const { data: session, status } = useSession(); // status değişkenini ekledik
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    twoFactorStatus,
    isLoading,
    verifyTwoFactor,
    isVerifying
  } = useTwoFactor();

  const isAdmin = session?.user?.role === UserRole.ADMIN || session?.user?.role === UserRole.SUPERADMIN;

  // Admin ve 2FA durumuna göre modalı göster
  useEffect(() => {
    // Oturum yükleniyorsa bekle
    if (status === 'loading') return;
    
    // Oturum yoksa modalı gösterme
    if (status === 'unauthenticated') {
      setIsOpen(false);
      return;
    }
    
    // Admin kullanıcı ve 2FA gerekiyorsa açık tut
    if (isAdmin) {
      if (!twoFactorStatus) {
        // İlk yüklemede durum henüz alınmamışsa, modalı açık tutma
        return;
      }
      
      // 2FA etkin değilse veya doğrulanmamışsa modal açık olmalı
      const needsVerification = twoFactorStatus.enabled && !twoFactorStatus.verified;
      setIsOpen(needsVerification);
      
      // Admin ve doğrulama gerekiyorsa, toast mesajı göster
      if (needsVerification && !isOpen) {
        toast.warning('Doğrulama gerekli', { 
          description: 'Yönetici işlemlerine erişmek için iki faktörlü doğrulama yapmalısınız',
          duration: 5000
        });
      }
    } else {
      setIsOpen(false);
    }
  }, [twoFactorStatus, isAdmin, router, status, isOpen]);

  // Modal kapandığında kodunu temizle
  useEffect(() => {
    if (!isOpen) {
      setToken('');
    }
  }, [isOpen]);

  const handleVerify = async () => {
    if (!token) return;
    try {
      const result = await verifyTwoFactor(token);
      
      // Başarılı doğrulamadan sonra, kullanıcı admin sayfasına gitmek istiyorsa yönlendir
      if (result && result.success) {
        const requireTwoFA = searchParams.get('requireTwoFA');
        if (requireTwoFA === 'true') {
          // Kısa bir gecikme ile admin paneline yönlendir
          setTimeout(() => {
            toast.success('Admin Paneline Yönlendiriliyorsunuz', {
              description: 'İki faktörlü doğrulama başarılı. Admin paneline erişebilirsiniz.'
            });
          }, 500);
        }
      }
    } catch (error) {
      // Hata durumunda token'ı temizle
      setToken('');
      toast.error('Doğrulama başarısız', {
        description: 'Lütfen kodu kontrol edin ve tekrar deneyin.'
      });
    }
    
    setToken('');
  };

  // Enter tuşuna basıldığında otomatik doğrula
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && token) {
      handleVerify();
    }
  };

  // Admin için modalın kapatılmasını engelle
  const handleOpenChange = (open: boolean) => {
    // Admin ve doğrulama gerekiyorsa kapatmaya izin verme
    if (isAdmin && twoFactorStatus?.enabled && !twoFactorStatus?.verified && !open) {
      return;
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => {
        // Admin zorunlu doğrulama için dışarı tıklama ile kapatmayı engelle
        if (isAdmin && twoFactorStatus?.enabled && !twoFactorStatus?.verified) {
          e.preventDefault();
          toast.warning('Doğrulama gerekli', {
            description: 'Yönetici işlemlerine erişmek için öncelikle doğrulama yapmalısınız'
          });
        }
      }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-yellow-500" />
            Yönetici Doğrulaması Gerekli
          </DialogTitle>
          <DialogDescription>
            Yönetici yetkilerini kullanabilmek için iki faktörlü kimlik doğrulamasını tamamlayın.
            <span className="block mt-1 text-xs font-medium text-muted-foreground">
              Bu doğrulama 3 saat boyunca geçerli olacaktır.
            </span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="token">Doğrulama Kodu</Label>
            <div className="flex justify-center">
              <InputOTP 
                value={token} 
                onChange={setToken} 
                maxLength={6}
                id="token"
                autoFocus
                render={({ slots }) => (
                  <InputOTPGroup className="gap-2">
                    {slots.map((slot, index) => (
                      <InputOTPSlot key={index} {...slot} />
                    ))}
                  </InputOTPGroup>
                )}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Kimlik doğrulayıcı uygulamanızdaki 6 haneli kodu girin.
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            onClick={handleVerify} 
            disabled={isVerifying || !token || isLoading || token.length !== 6}
            className="w-full"
          >
            {isVerifying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Doğrula
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
