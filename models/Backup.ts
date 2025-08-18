/**
 * Yedekleme işlem durumlarını tanımlayan enum
 */
export enum BackupOperationStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED", 
  FAILED = "FAILED",
  CANCELLED = "CANCELLED"
}

/**
 * Yedekleme türlerini tanımlayan enum - Sadece Cloudinary
 */
export enum BackupType {
  CLOUDINARY = "CLOUDINARY",
  FILES = "FILES"
}

/**
 * Yedekleme kaydı modeli
 */
export interface BackupRecord {
  id: string;
  type: BackupType;
  status: BackupOperationStatus;
  path: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Backup ayarları için arayüz
 */
export interface BackupSettings {
  schedule: string; // Cron ifadesi
  retention: {
    days: number;
    maxBackups: number;
  };
  storage: {
    local: {
      path: string;
    };
  };
  mongodb: {
    enabled: boolean;
    encrypt: boolean;
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
    }
  };
  lastUpdated: Date;
  lastUpdatedBy?: string;
}

/**
 * Yedekleme kaydı için arayüz
 */
export interface BackupRecordDetailed {
  id: string;
  filename: string;
  size: number;
  path: string;
  type: BackupType;
  status: BackupOperationStatus;
  startTime: Date;
  endTime?: Date;
  error?: string;
  metadata: {
    databaseSize?: number;
    fileCount?: number;
    cloudinaryAssets?: number;
    [key: string]: any;
  };
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
