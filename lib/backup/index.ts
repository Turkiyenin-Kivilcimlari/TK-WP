import fs from 'fs';
import path from 'path';
import { backupCloudinaryOnly } from './backupCloudinary';
import { getBackupSettings } from '@/lib/backup/backupPermissions';
import { restoreCloudinaryFromBackup } from './restore';

// Define types for backup functions - MongoDB kaldırıldı
export interface BackupOptions {
  encryptionKey?: string;
  includeCloudinary?: boolean;
}

export interface RestoreOptions {
  restoreCloudinary?: boolean;
}

export interface BackupResult {
  success: boolean;
  message: string;
  backupId?: string;
  details?: {
    cloudinary?: {
      success: boolean;
      message: string;
    };
  };
}

export interface RestoreResult {
  cloudinary: {
    success: boolean;
    message: string;
  };
}

// Function to create a backup of the system - sadece Cloudinary
export async function createBackup(options: BackupOptions = {}): Promise<BackupResult> {
  // Set default options - MongoDB tamamen kaldırıldı
  const {
    encryptionKey,
    includeCloudinary = true
  } = options;
  
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
  const backupDir = path.join(process.env.BACKUP_DIR || 'backups', timestamp);
  
  try {
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const backupDetails: BackupResult['details'] = {};
    
    // Cloudinary backup - sadece bunu yap
    if (includeCloudinary) {
      try {
        console.log('Cloudinary yedeklemesi başlatılıyor...');
        
        // Yedekleme ayarlarını al
        const settings = await getBackupSettings();
        const folders = settings?.cloudinary?.folders || [];
        
        const result = await backupCloudinaryOnly(folders, backupDir, encryptionKey);
        
        if (result.success) {
          backupDetails.cloudinary = {
            success: true,
            message: 'Cloudinary yedekleme başarıyla tamamlandı'
          };
        } else {
          backupDetails.cloudinary = {
            success: false,
            message: `Cloudinary yedekleme başarısız: ${result.error}`
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        backupDetails.cloudinary = {
          success: false,
          message: `Cloudinary yedekleme başarısız: ${errorMessage}`
        };
      }
    }
    
    // Store encryption key if provided
    if (encryptionKey) {
      fs.writeFileSync(path.join(backupDir, '.encryption_info'), 'This backup is encrypted');
      fs.writeFileSync(
        path.join(backupDir, 'encryption-key.txt'), 
        encryptionKey, 
        { mode: 0o600 }
      );
    }
    
    // Check if backup succeeded - sadece Cloudinary
    const isSuccess = (backupDetails.cloudinary?.success || !includeCloudinary);
    
    return {
      success: isSuccess,
      message: isSuccess ? 'Cloudinary yedekleme tamamlandı' : 'Cloudinary yedekleme başarısız',
      backupId: timestamp,
      details: backupDetails
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Yedekleme başarısız: ${errorMessage}`
    };
  }
}

// Function to get a list of available backups
export function listBackups(): { id: string, date: Date, encrypted: boolean }[] {
  const backupBaseDir = process.env.BACKUP_DIR || 'backups';
  
  try {
    // Ensure backup directory exists
    if (!fs.existsSync(backupBaseDir)) {
      fs.mkdirSync(backupBaseDir, { recursive: true });
      return [];
    }
    
    // Read directories in backup folder
    const backupDirs = fs.readdirSync(backupBaseDir)
      .filter(dir => {
        const dirPath = path.join(backupBaseDir, dir);
        return fs.statSync(dirPath).isDirectory();
      });
    
    // Convert to proper format
    return backupDirs.map(dir => {
      const dirPath = path.join(backupBaseDir, dir);
      const encrypted = fs.existsSync(path.join(dirPath, '.encryption_info')) ||
                        fs.existsSync(path.join(dirPath, 'encryption-key.txt')) ||
                        fs.readdirSync(dirPath).some(file => file.endsWith('.enc'));
      
      // Try to parse date from directory name
      let date;
      try {
        // Replace hyphens in the timestamp where colons would be
        const dateString = dir.replace(/-/g, (match, offset) => {
          // Replace with colons at positions 13 and 16 (for HH:MM:SS format)
          return (offset === 13 || offset === 16) ? ':' : match;
        });
        
        date = new Date(dateString);
        if (isNaN(date.getTime())) {
          date = fs.statSync(dirPath).mtime;
        }
      } catch {
        date = fs.statSync(dirPath).mtime;
      }
      
      return {
        id: dir,
        date,
        encrypted
      };
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by date descending
  } catch (error) {
    console.error('Error listing backups:', error);
    return [];
  }
}

// Function to restore from a backup - sadece Cloudinary
export async function restoreLatestBackup(
  backupPath: string, 
  encryptionKey?: string,
  options: RestoreOptions = {}
): Promise<RestoreResult> {
  try {
    console.log(`Cloudinary geri yükleme başlatılıyor. Dizin: ${backupPath}`);
    
    // Cloudinary restore - restoreCloudinary fonksiyonunu import et
    const cloudinaryResult = options.restoreCloudinary !== false ? 
      await restoreCloudinaryFromBackup(backupPath, encryptionKey) : 
      { success: true, message: 'Cloudinary geri yükleme atlandı' };
    
    return {
      cloudinary: cloudinaryResult
    };
  } catch (error) {
    console.error('Geri yükleme başarısız:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      cloudinary: {
        success: false,
        message: `Cloudinary geri yükleme başarısız: ${errorMessage}`
      }
    };
  }
}


// Manuel backup fonksiyonu - sadece Cloudinary
export async function manualBackup(options: { includeCloudinary?: boolean } = {}) {
  try {
    if (options.includeCloudinary) {
      const { backupCloudinaryOnly } = await import('./backupCloudinary');
      const result = await backupCloudinaryOnly();
      return result;
    }
    
    return { success: false, error: 'Geçersiz backup seçenekleri' };
  } catch (error: any) {
    console.error('Manual backup error:', error);
    return { success: false, error: error.message };
  }
}
