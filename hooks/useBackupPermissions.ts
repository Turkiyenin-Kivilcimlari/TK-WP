"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { UserRole } from '@/models/User';
import api from '@/lib/api';
import { isBackupPasswordVerified as serverIsBackupPasswordVerified } from '@/lib/backupPermissions';

interface BackupPermissions {
  canView: boolean;
  canManage: boolean;
  canDownload: boolean;
  isLoading: boolean;
  isSuperAdmin: boolean;
}

/**
 * Yedekleme işlemleri için kullanıcı izinlerini yöneten hook
 */
export function useBackupPermissions(): BackupPermissions {
  const { data: session, status } = useSession();
  const [permissions, setPermissions] = useState<{
    canView: boolean;
    canManage: boolean;
    canDownload: boolean;
  }>({
    canView: false,
    canManage: false,
    canDownload: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    async function fetchPermissions() {
      try {
        if (status === 'loading') return;
        
        // Oturum yoksa veya admin değilse
        if (!session || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPERADMIN)) {
          setPermissions({
            canView: false,
            canManage: false,
            canDownload: false,
          });
          setIsLoading(false);
          return;
        }
        
        // Süper admin ise tüm izinlere sahip
        if (session.user.role === UserRole.SUPERADMIN) {
          setPermissions({
            canView: true,
            canManage: true,
            canDownload: true,
          });
          setIsLoading(false);
          return;
        }
        
        // Admin için API'den izinleri al
        const response = await api.get('/api/admin/permissions/backup');
        
        if (response.data && response.data.success) {
          setPermissions({
            canView: response.data.permissions.canView || false,
            canManage: response.data.permissions.canManage || false,
            canDownload: response.data.permissions.canDownload || false,
          });
        } else {
          // Varsayılan olarak hiçbir izin yok
          setPermissions({
            canView: false,
            canManage: false,
            canDownload: false,
          });
        }
      } catch (error) {
        console.error('İzinler yüklenirken hata oluştu:', error);
        setPermissions({
          canView: false,
          canManage: false,
          canDownload: false,
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchPermissions();
  }, [session, status]);
  
  return {
    ...permissions,
    isLoading,
    isSuperAdmin: session?.user?.role === UserRole.SUPERADMIN || false,
  };
}

/**
 * Client-side wrapper for isBackupPasswordVerified
 */
export const isBackupPasswordVerified = serverIsBackupPasswordVerified;
