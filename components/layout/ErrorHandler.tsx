"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { useTwoFactor } from '@/hooks/useTwoFactor';
import { TwoFactorVerifyModal } from './TwoFactorVerifyModal';
import { UserRole } from '@/models/User';

export function ErrorHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { twoFactorStatus } = useTwoFactor();
  // Add state to track when 2FA modal should be forced open
  const [forceOpenModal, setForceOpenModal] = useState(false);
  
  // URL'de 2FA gereksinimi parametresi varsa
  useEffect(() => {
    const requireTwoFA = searchParams.get('requireTwoFA');
    
    if (requireTwoFA === 'true' && session?.user) {
      // Admin kullanıcısına 2FA doğrulama gerektiğini bildir
      toast.warning('Admin Paneline Erişim', {
        description: 'Admin paneline erişmek için iki faktörlü doğrulama yapmalısınız.',
        duration: 5000
      });
      
      // Force open the 2FA modal when required
      setForceOpenModal(true);
    }
  }, [searchParams, session]);
  
  useEffect(() => {
    // Axios için global hata yakalayıcı ekle
    const handleAxiosError = (event: any) => {
      if (event.detail && event.detail.error && event.detail.error.response) {
        const response = event.detail.error.response;
        
        // 2FA hatalarını yönet
        if (response.status === 403) {
          const errorType = response.data?.errorType;
          
          if (errorType === '2fa_setup_required') {
            toast.error('İki faktörlü doğrulama gerekli', {
              description: 'Yönetici işlemleri için lütfen önce iki faktörlü doğrulamayı etkinleştirin.',
              action: {
                label: 'Ayarla',
                onClick: () => router.push('/profile')
              }
            });
          }
          else if (errorType === '2fa_verification_required') {
            // Force open the 2FA modal when verification is required
            setForceOpenModal(true);
            
            toast.error('Doğrulama gerekli', {
              description: 'Yönetici işlemlerine erişmek için önce iki faktörlü doğrulama kodunu girmeniz gerekiyor.',
              action: {
                label: 'Doğrula',
                onClick: () => router.refresh() // TwoFactorVerifyModal'ın görünmesini tetikler
              }
            });
          }
        }
      }
    };

    // Custom event listener ekle
    window.addEventListener('api-error', handleAxiosError);
    
    return () => {
      window.removeEventListener('api-error', handleAxiosError);
    };
  }, [router, session]);

  // Doğrulama süresini kontrol et - 3 saat geçmişse modal'ı zorla göster
  useEffect(() => {
    if (!session?.user || !twoFactorStatus) return;

    // Admin kullanıcıları için kontrol yap
    const isAdmin = session.user.role === UserRole.ADMIN || session.user.role === UserRole.SUPERADMIN;
    if (!isAdmin) return;

    // 2FA etkin ve doğrulama süresini kontrol et
    if (twoFactorStatus.enabled && twoFactorStatus.lastVerification) {
      const now = new Date();
      const lastVerification = new Date(twoFactorStatus.lastVerification);
      const diffMs = now.getTime() - lastVerification.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const timeoutMins = twoFactorStatus.sessionTimeoutMins || 180; // Varsayılan 3 saat

      // Süre dolmuşsa modal'ı göster
      if (diffMins >= timeoutMins) {
        setForceOpenModal(true);
      } else {
        // Süre dolmamışsa modal'ı zorla göstermeyi kapat
        setForceOpenModal(false);
      }
    } else if (twoFactorStatus.enabled && !twoFactorStatus.verified) {
      // Doğrulama yapılmamış
      setForceOpenModal(true);
    }
  }, [session, twoFactorStatus]);

  // Add a handler for when verification is completed
  const handleVerificationComplete = () => {
    setForceOpenModal(false);
  };

  return <TwoFactorVerifyModal forceOpen={forceOpenModal} onVerificationComplete={handleVerificationComplete} />; 
}
