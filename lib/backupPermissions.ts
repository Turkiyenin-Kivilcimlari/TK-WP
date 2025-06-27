import * as path from 'path';

const SETTINGS_FILE_PATH = path.join(process.cwd(), 'data', 'backupSettings.json');

export interface BackupSettings {
  schedule: string;
  retention: {
    days: number;
    maxBackups: number;
  };
  storage: {
    local: {
      path: string;
    };
  };
  cloudinary: {
    enabled: boolean;
    encrypt: boolean;
    folders: string[];
  };
  notifications: {
    email: {
      enabled: boolean;
      recipients: string[];
      onSuccess: boolean;
      onFailure: boolean;
    };
  };
}

/**
 * Yedekleme şifresinin doğrulandığını kontrol eder (client-side)
 */
export async function isBackupPasswordVerified(): Promise<boolean> {
  try {
    const response = await fetch('/api/admin/backups/verify-status');
    const data = await response.json();
    return data?.verified || false;
  } catch (error) {
    return false;
  }
}

/**
 * Backup access token'ını kaydet
 */
export function saveBackupAccessToken(token: string, expiresAt: string | number) {
  if (typeof window !== 'undefined') {
    try {
      const tokenData = {
        token,
        expiresAt: typeof expiresAt === 'string' ? expiresAt : new Date(expiresAt).toISOString(),
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('backup-access-token', JSON.stringify(tokenData));
    } catch (error) {
    }
  }
}

/**
 * Backup access token'ını al
 */
export function getBackupAccessToken(): string | null {
  if (typeof window !== 'undefined') {
    try {
      const tokenData = localStorage.getItem('backup-access-token');
      if (tokenData) {
        const parsed = JSON.parse(tokenData);
        const expiresAt = new Date(parsed.expiresAt);
        const now = new Date();
        
        // Token'ın süresi dolmuş mu kontrol et
        if (now < expiresAt) {
          return parsed.token;
        } else {
          // Süresi dolmuş token'ı temizle
          localStorage.removeItem('backup-access-token');
        }
      }
    } catch (error) {
    }
  }
  return null;
}

/**
 * Backup access token'ını temizle
 */
export function clearBackupAccessToken() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('backup-access-token');
    } catch (error) {
    }
  }
}
