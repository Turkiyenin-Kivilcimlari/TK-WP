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

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

interface TwoFactorVerifyModalProps {
  forceOpen?: boolean;
  onVerificationComplete?: () => void;
}

export function TwoFactorVerifyModal({ forceOpen = false, onVerificationComplete }: TwoFactorVerifyModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [token, setToken] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [wasVerified, setWasVerified] = useState(false); // Doğrulama durumunu takip etmek için
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    twoFactorStatus,
    isLoading,
    verifyTwoFactor,
    refreshStatus
  } = useTwoFactor();

  const isAdmin = session?.user?.role === UserRole.ADMIN || session?.user?.role === UserRole.SUPERADMIN;

  // Doğrulama süresinin dolup dolmadığını kontrol eden yardımcı fonksiyon
  const isVerificationExpired = () => {
    if (twoFactorStatus?.lastVerification) {
      const now = new Date();
      const lastVerification = new Date(twoFactorStatus.lastVerification);
      const diffMs = now.getTime() - lastVerification.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const timeoutMins = twoFactorStatus.sessionTimeoutMins || 180; // Varsayılan 3 saat (180 dakika)
      
      return diffMins >= timeoutMins;
    }
    return true; // Doğrulama zamanı yoksa süresi dolmuş kabul edelim
  };

  // Admin ve 2FA durumuna göre modalı göster
  useEffect(() => {
    // Oturum yükleniyorsa bekle
    if (status === 'loading') return;
    
    // Oturum yoksa modalı gösterme
    if (status === 'unauthenticated') {
      setIsOpen(false);
      return;
    }
    
    // Force open prop takes precedence over other conditions
    if (forceOpen) {
      setIsOpen(true);
      return;
    }
    
    // Admin kullanıcı ve 2FA gerekiyorsa açık tut
    if (isAdmin) {
      if (!twoFactorStatus) {
        // İlk yüklemede durum henüz alınmamışsa, bekle
        return;
      }
      
      // Eğer doğrulama başarıyla yapıldıysa, artık modalı gösterme
      if (wasVerified) {
        setIsOpen(false);
        return;
      }
      
      // 2FA durumunu doğrudan kontrol et - doğrulama yapılmamış VEYA doğrulama süresi dolmuşsa
      if (twoFactorStatus.enabled && (!twoFactorStatus.verified || isVerificationExpired())) {
        // Sadece kapalıysa aç, aynı state'i sürekli güncellemekten kaçın
        if (!isOpen) {
          setIsOpen(true);
        }
      } else {
        // Sadece açıksa kapat, aynı state'i sürekli güncellemekten kaçın
        if (isOpen) {
          setIsOpen(false);
        }
      }
    } else {
      setIsOpen(false);
    }
  }, [twoFactorStatus, isAdmin, status, wasVerified, isOpen, forceOpen]);

  // Modal kapandığında kodunu temizle
  useEffect(() => {
    if (!isOpen) {
      setToken('');
    }
  }, [isOpen]);

  const handleVerify = async () => {
    if (!token || token.length !== 6) return;
    
    try {
      setIsVerifying(true);
      
      const result = await verifyTwoFactor(token);
      
      if (result && result.success) {
        
        // Başarılı doğrulama durumunu kaydet
        setWasVerified(true);
        
        // Cookie'yi manuel olarak güncelle
        if (typeof window !== 'undefined') {
          // Önce cookie'yi sil
          document.cookie = "two-factor-status=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax";
          
          // Yeni güncelleme için tüm alanları kopyala ve "verified" değerini true yap
          const updatedStatus = { 
            enabled: true,
            verified: true,
            required: true,
            isAdmin: true,
            lastVerification: new Date().toISOString(),
            sessionTimeoutMins: 180
          };
          
          
          // Cookie ayarlama
          document.cookie = `two-factor-status=${JSON.stringify(updatedStatus)}; path=/; max-age=10800; SameSite=Lax`;
        }
        
        // Session'ı güncelle
        await updateSession();
        
        // Modal'ı kapat
        setIsOpen(false);
        
        // Notify the parent component that verification is complete
        if (onVerificationComplete) {
          onVerificationComplete();
        }
        
        // Bir süre bekleyerek tüm güncellemelerin tamamlanmasını sağla
        setTimeout(async () => {
          // 2FA durumunu yenile
          await refreshStatus();
          
          
          // Toast mesajı göster
          toast.success('Doğrulama başarılı', {
            description: 'İki faktörlü kimlik doğrulama başarılı. Admin paneline erişebilirsiniz.'
          });
        }, 500);
      }
    } catch (error) {
      setToken('');
      toast.error('Doğrulama başarısız', {
        description: 'Lütfen kodu kontrol edin ve tekrar deneyin.'
      });
    } finally {
      setIsVerifying(false);
      setToken('');
    }
  };

  // Enter tuşuna basıldığında otomatik doğrula
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && token) {
      handleVerify();
    }
  };

  // Admin için modalın kapatılmasını engelle
  const handleOpenChange = (open: boolean) => {
    // If forceOpen is true, prevent closing
    if (forceOpen && !open) {
      toast.warning('Doğrulama gerekli', {
        description: 'Admin paneline erişmek için iki faktörlü doğrulamayı tamamlamanız gerekmektedir.'
      });
      return;
    }
    
    // Admin ve doğrulama gerekiyorsa kapatmaya izin verme
    if (isAdmin && twoFactorStatus?.enabled && !twoFactorStatus?.verified && !open) {
      return;
    }
    
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => {
        // Force open takes precedence
        if (forceOpen || (isAdmin && twoFactorStatus?.enabled && !twoFactorStatus?.verified)) {
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
