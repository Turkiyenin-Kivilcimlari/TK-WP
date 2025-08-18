import * as fs from 'fs';
import * as path from 'path';
import {connectToDatabase} from '@/lib/mongodb';
import User from '@/models/User';
import { UserRole } from '@/models/User';

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
 * Default backup settings
 */
const DEFAULT_BACKUP_SETTINGS: BackupSettings = {
  schedule: '0 3 * * *', // Her gün gece 3'te
  retention: {
    days: 30,
    maxBackups: 10
  },
  storage: {
    local: {
      path: './backups'
    }
  },
  cloudinary: {
    enabled: true,
    encrypt: true,
    folders: []
  },
  notifications: {
    email: {
      enabled: false,
      recipients: [],
      onSuccess: true,
      onFailure: true
    }
  }
};

/**
 * Yedekleme ayarlarını getirir
 */
export async function getBackupSettings(): Promise<BackupSettings> {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(SETTINGS_FILE_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const settingsData = fs.readFileSync(SETTINGS_FILE_PATH, 'utf8');
      const settings = JSON.parse(settingsData);
      
      // Merge with defaults to ensure all properties exist
      return { ...DEFAULT_BACKUP_SETTINGS, ...settings };
    }
    
    // Create default settings file
    await saveBackupSettings(DEFAULT_BACKUP_SETTINGS);
    return DEFAULT_BACKUP_SETTINGS;
  } catch (error) {
    console.error('Backup settings okuma hatası:', error);
    return DEFAULT_BACKUP_SETTINGS;
  }
}

/**
 * Yedekleme ayarlarını kaydeder
 */
export async function saveBackupSettings(settings: BackupSettings): Promise<void> {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(SETTINGS_FILE_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2), 'utf8');
  } catch (error) {
    console.error('Backup settings kaydetme hatası:', error);
    throw error;
  }
}

/**
 * Kullanıcının yedekleme izinlerini kontrol eder
 */
export async function canViewBackups(userId: string): Promise<boolean> {
  try {
    await connectToDatabase();
    const user = await User.findById(userId).select('role backupPermissions');
    
    if (!user) return false;
    
    if (user.role === UserRole.SUPERADMIN) return true;
    if (user.role === UserRole.ADMIN && user.backupPermissions?.canView) return true;
    
    return false;
  } catch (error) {
    console.error('Backup permission check error:', error);
    return false;
  }
}

/**
 * Kullanıcının yedekleme yönetme izinlerini kontrol eder
 */
export async function canManageBackups(userId: string): Promise<boolean> {
  try {
    await connectToDatabase();
    const user = await User.findById(userId).select('role backupPermissions');
    
    if (!user) return false;
    
    if (user.role === UserRole.SUPERADMIN) return true;
    if (user.role === UserRole.ADMIN && user.backupPermissions?.canManage) return true;
    
    return false;
  } catch (error) {
    console.error('Backup management permission check error:', error);
    return false;
  }
}

/**
 * Kullanıcının yedekleme indirme izinlerini kontrol eder
 */
export async function canDownloadBackups(userId: string): Promise<boolean> {
  try {
    await connectToDatabase();
    const user = await User.findById(userId).select('role backupPermissions');
    
    if (!user) return false;
    
    if (user.role === UserRole.SUPERADMIN) return true;
    if (user.role === UserRole.ADMIN && user.backupPermissions?.canDownload) return true;
    
    return false;
  } catch (error) {
    console.error('Backup download permission check error:', error);
    return false;
  }
}

/**
 * Cloudinary yedekleme izni kontrolü
 */
export async function checkCloudinaryBackupPermission(): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const settings = await getBackupSettings();
    
    if (!settings.cloudinary.enabled) {
      return { allowed: false, reason: 'Cloudinary yedekleme devre dışı' };
    }

    // Cloudinary yapılandırması kontrolü
    if (!process.env.CLOUDINARY_CLOUD_NAME || 
        !process.env.CLOUDINARY_API_KEY || 
        !process.env.CLOUDINARY_API_SECRET) {
      return { allowed: false, reason: 'Cloudinary yapılandırması eksik' };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Cloudinary backup permission check error:', error);
    return { allowed: false, reason: 'İzin kontrolü sırasında hata oluştu' };
  }
}
