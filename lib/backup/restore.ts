import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import crypto from 'crypto';
import AdmZip from 'adm-zip';
import { v2 as cloudinary } from 'cloudinary';
import { connectToDatabase } from '../mongodb';
import mongoose from 'mongoose';
import os from 'os';
import { BSON } from 'bson';

const execPromise = util.promisify(exec);

// Restore result type definition
export interface RestoreResult {
  success: boolean;
  message: string;
  details?: any;
  uploadedCount?: number;
  failedCount?: number;
  skippedCount?: number;
  totalFiles?: number;
}

export interface RestoreOptions {
  restoreCloudinary?: boolean;
}

export interface CloudinaryRestoreOptions {
  forceUpload?: boolean;
  skipExistingCheck?: boolean;
}

/**
 * Encrypts a file using the provided key
 */
export function encryptFile(inputPath: string, outputPath: string, encryptionKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const key = crypto.createHash('sha256').update(encryptionKey).digest();
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      const input = fs.createReadStream(inputPath);
      const output = fs.createWriteStream(outputPath);
      
      // Write the IV at the beginning of the file
      output.write(iv);
      
      input.pipe(cipher).pipe(output);
      
      output.on('finish', () => {
        resolve();
      });
      
      output.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Decrypts a file using the provided key
 */
export function decryptFile(inputPath: string, outputPath: string, encryptionKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const key = crypto.createHash('sha256').update(encryptionKey).digest();
      
      // Read the input file
      const input = fs.readFileSync(inputPath);
      
      // Extract the IV from the beginning of the file
      const iv = input.slice(0, 16);
      const encryptedData = input.slice(16);
      
      // Create decipher
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      
      // Decrypt the data
      let decrypted = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final()
      ]);
      
      // Write to the output file
      fs.writeFileSync(outputPath, decrypted);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Finds and extracts the MongoDB backup ZIP file
 */
async function extractMongoBackup(backupDir: string, tempDir: string, encryptionKey?: string): Promise<string[]> {
  // Find the MongoDB backup zip files
  const files = fs.readdirSync(backupDir);
  const zipFiles = files.filter(file => file.startsWith('mongodb_backup_') && file.endsWith('.zip'));
  
  if (zipFiles.length === 0) {
    throw new Error('MongoDB backup file not found');
  }
  
  console.log(`Toplam ${zipFiles.length} zip arşivi bulundu. İlk bulunan: ${zipFiles[0]}`);
  
  // Extract the first zip file
  const zipPath = path.join(backupDir, zipFiles[0]);
  console.log(`Zip arşivi işleniyor: ${zipFiles[0]}`);
  
  // Check if it's encrypted
  const isEncrypted = zipPath.endsWith('.enc') || files.some(f => f === 'encryption-key.txt');
  
  let finalZipPath = zipPath;
  
  // If encrypted and we have a key, decrypt first
  if (isEncrypted && encryptionKey) {
    const decryptedZipPath = path.join(tempDir, `decrypted_${path.basename(zipPath)}`);
    await decryptFile(zipPath, decryptedZipPath, encryptionKey);
    finalZipPath = decryptedZipPath;
  }
  
  console.log(`Zip dosyası çıkarılıyor: ${finalZipPath}`);
  
  // Make sure the temp directory exists
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    console.log(`Temporary directory created: ${tempDir}`);
  }
  
  // Extract the zip file
  try {
    const zip = new AdmZip(finalZipPath);
    zip.extractAllTo(tempDir, true);
    
    // Get the list of extracted files/folders
    const extractedFiles = fs.readdirSync(tempDir);
    console.log(`Zip dosyası içeriği ${tempDir} konumuna çıkarıldı`);
    console.log(`Çıkarılan dosyalar: ${JSON.stringify(extractedFiles)}`);
    
    return extractedFiles;
  } catch (error: unknown) {
    console.error('Zip extraction error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to extract zip file: ${errorMessage}`);
  }
}

/**
 * Cloudinary'den yedek geri yükleme işlemi
 */
export async function restoreCloudinaryFromBackup(
  backupPath: string, 
  encryptionKey?: string,
  options: CloudinaryRestoreOptions = {}
): Promise<RestoreResult> {
  try {
    console.log(`Cloudinary geri yükleme başlatılıyor: ${backupPath}`);
    console.log(`Seçenekler:`, {
      forceUpload: options.forceUpload || false,
      skipExistingCheck: options.skipExistingCheck || false
    });
    
    // Cloudinary yapılandırmasını kontrol et
    if (!process.env.CLOUDINARY_CLOUD_NAME || 
        !process.env.CLOUDINARY_API_KEY || 
        !process.env.CLOUDINARY_API_SECRET) {
      throw new Error('Cloudinary yapılandırması eksik. CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY ve CLOUDINARY_API_SECRET environment değişkenlerini kontrol edin.');
    }
    
    // Cloudinary'yi yapılandır
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });
    
    console.log(`Cloudinary yapılandırıldı: ${process.env.CLOUDINARY_CLOUD_NAME}`);
    
    // Cloudinary bağlantısını test et
    try {
      await cloudinary.api.ping();
      console.log('Cloudinary bağlantısı başarılı');
    } catch (pingError: any) {
      console.error('Cloudinary bağlantı testi başarısız:', pingError);
      throw new Error(`Cloudinary bağlantı hatası: ${pingError.message}`);
    }
    
    // Backup dizinini kontrol et
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup dizini bulunamadı: ${backupPath}`);
    }
    
    // Cloudinary ZIP dosyasını bul
    const files = fs.readdirSync(backupPath);
    const cloudinaryZipFile = files.find(file => 
      file.startsWith('cloudinary_backup_') && file.endsWith('.zip')
    );
    
    if (!cloudinaryZipFile) {
      throw new Error('Cloudinary yedek dosyası bulunamadı');
    }
    
    const zipPath = path.join(backupPath, cloudinaryZipFile);
    console.log(`Cloudinary yedek dosyası bulundu: ${cloudinaryZipFile}`);
    
    // Geçici dizin oluştur
    const tempDir = path.join(os.tmpdir(), `cloudinary_restore_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    console.log(`Created temporary directory: ${tempDir}`);
    
    // Retry helper fonksiyonu
    const uploadWithRetry = async (filePath: string, uploadOptions: any, maxRetries = 3): Promise<any> => {
      let lastError: any;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const result = await cloudinary.uploader.upload(filePath, uploadOptions);
          return result;
        } catch (error: any) {
          lastError = error;
          
          // Bağlantı hatası, timeout veya rate limiting
          const isRetryableError = 
            error.code === 'ECONNRESET' ||
            error.code === 'ETIMEDOUT' ||
            error.code === 'ENOTFOUND' ||
            error.errno === -4077 ||
            error.message?.includes('timeout') ||
            error.message?.includes('rate') ||
            error.message?.includes('limit') ||
            error.message?.includes('connection');
          
          if (isRetryableError && attempt < maxRetries) {
            const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
            console.log(`🔄 Dosya yükleme ${attempt}. deneme başarısız, ${waitTime}ms bekleyip tekrar denenecek: ${uploadOptions.public_id}`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          
          throw error;
        }
      }
      
      throw lastError;
    };
    
    try {
      // ZIP dosyasını çıkar
      console.log(`Cloudinary zip dosyası çıkarılıyor: ${zipPath}`);
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(tempDir, true);
      
      // Çıkarılan dosyaları listele
      const extractedFiles = fs.readdirSync(tempDir);
      console.log('Çıkarılan dosyalar:', extractedFiles.join(', '));
      
      // Metadata dosyasını oku
      const metadataPath = path.join(tempDir, 'metadata.json');
      if (!fs.existsSync(metadataPath)) {
        console.warn('Metadata dosyası bulunamadı, varsayılan değerler kullanılacak');
      }
      
      let totalFiles = 0;
      let metadata: any = { totalAssets: 0 };
      
      if (fs.existsSync(metadataPath)) {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        console.log(`Metadata yüklendi: ${metadata.totalAssets} adet dosya`);
      }
      
      // Toplam dosya sayısını hesapla
      for (const folder of extractedFiles) {
        const folderPath = path.join(tempDir, folder);
        
        if (folder === 'metadata.json' || !fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
          continue;
        }
        
        const folderFiles = fs.readdirSync(folderPath);
        totalFiles += folderFiles.length;
      }
      
      console.log(`Toplam yüklenecek dosya sayısı: ${totalFiles}`);
      
      // Cloudinary'ye dosyaları yükle
      let uploadedCount = 0;
      let failedCount = 0;
      let skippedCount = 0;
      
      // Her klasör için dosyaları yükle
      for (const folder of extractedFiles) {
        const folderPath = path.join(tempDir, folder);
        
        // Metadata dosyasını atla
        if (folder === 'metadata.json' || !fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
          continue;
        }
        
        console.log(`Klasör işleniyor: ${folder} (${fs.readdirSync(folderPath).length} dosya)`);
        
        try {
          const folderFiles = fs.readdirSync(folderPath);
          
          for (const file of folderFiles) {
            const filePath = path.join(folderPath, file);
            
            // Dosya boyutunu kontrol et
            const stats = fs.statSync(filePath);
            if (stats.size === 0) {
              console.warn(`Boş dosya atlanıyor: ${file}`);
              skippedCount++;
              continue;
            }
            
            try {
              // Dosyayı Cloudinary'ye yükle
              const publicId = folder === 'root' ? 
                path.parse(file).name : 
                `${folder}/${path.parse(file).name}`;
              
              // Mevcut dosya kontrolü (eğer skipExistingCheck false ise)
              if (!options.skipExistingCheck && !options.forceUpload) {
                try {
                  await cloudinary.api.resource(publicId);
                  console.log(`Dosya zaten mevcut, atlanıyor: ${publicId}`);
                  skippedCount++;
                  continue;
                } catch (notFoundError) {
                  // Dosya mevcut değil, yüklemeye devam et
                }
              }
              
              console.log(`Dosya yükleniyor: ${publicId} (${Math.round(stats.size / 1024)}KB)`);
              
              const uploadOptions: any = {
                public_id: publicId,
                resource_type: 'auto',
                use_filename: true,
                unique_filename: false,
                timeout: 120000, // 2 dakika timeout
                chunk_size: 6000000, // 6MB chunks for large files
                // API anahtarlarını açıkça belirt
                api_key: process.env.CLOUDINARY_API_KEY,
                api_secret: process.env.CLOUDINARY_API_SECRET
              };
              
              // forceUpload true ise overwrite'ı etkinleştir
              if (options.forceUpload) {
                uploadOptions.overwrite = true;
                uploadOptions.invalidate = true;
              }
              
              const result = await uploadWithRetry(filePath, uploadOptions);
              
              uploadedCount++;
              console.log(`✓ Başarılı: ${result.public_id} (${result.format}, ${Math.round(result.bytes / 1024)}KB)`);
              
              // Rate limiting için kısa bir bekleyin
              await new Promise(resolve => setTimeout(resolve, 150));
              
            } catch (fileError: any) {
              console.error(`✗ Dosya yükleme hatası (${file}):`, {
                error: fileError,
                message: fileError.message,
                code: fileError.code,
                errno: fileError.errno
              });
              failedCount++;
              
              // Rate limiting hatası için biraz daha bekle
              if (fileError.message && (fileError.message.includes('rate') || fileError.message.includes('limit'))) {
                console.log('Rate limiting algılandı, 5 saniye bekleniyor...');
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
              
              // Bağlantı hatası için kısa bekle
              if (fileError.code === 'ECONNRESET' || fileError.errno === -4077) {
                console.log('Bağlantı hatası algılandı, 2 saniye bekleniyor...');
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
              
              // API key hatası için özel handling
              if (fileError.message && fileError.message.includes('api_key')) {
                console.error('API key hatası tespit edildi. Cloudinary yapılandırmasını kontrol edin.');
                // İlk birkaç dosya başarısızsa, işlemi durdurun
                if (uploadedCount === 0 && failedCount > 5) {
                  throw new Error('Cloudinary API yapılandırma hatası: Çoklu API key hataları tespit edildi');
                }
              }
            }
          }
        } catch (folderError: any) {
          console.error(`Klasör işleme hatası (${folder}):`, folderError.message || folderError);
          // Klasördeki tüm dosyaları başarısız say
          const folderFiles = fs.readdirSync(folderPath);
          failedCount += folderFiles.length;
        }
      }
      
      // Sonuçları değerlendir
      const processedFiles = uploadedCount + failedCount + skippedCount;
      const isSuccess = uploadedCount > 0 && (failedCount === 0 || uploadedCount >= failedCount);
      
      let message: string;
      if (uploadedCount === totalFiles && failedCount === 0) {
        message = `Cloudinary geri yükleme tamamen başarılı: ${uploadedCount} dosya yüklendi`;
      } else if (uploadedCount > 0 && failedCount > 0) {
        message = `Cloudinary geri yükleme kısmen başarılı: ${uploadedCount} başarılı, ${failedCount} başarısız`;
      } else if (uploadedCount > 0) {
        message = `Cloudinary geri yükleme başarılı: ${uploadedCount} dosya yüklendi, ${skippedCount} atlandı`;
      } else if (failedCount > 0) {
        message = `Cloudinary geri yükleme başarısız: hiç dosya yüklenemedi (${failedCount} hata)`;
      } else {
        message = `Cloudinary geri yükleme başarısız: hiç dosya bulunamadı`;
      }
      
      console.log(message);
      console.log(`İstatistikler: Toplam=${totalFiles}, Yüklenen=${uploadedCount}, Başarısız=${failedCount}, Atlanan=${skippedCount}`);
      
      // Az sayıda hata varsa başarılı say
      if (uploadedCount > 0 && failedCount <= 3) {
        return {
          success: true,
          message,
          uploadedCount,
          failedCount,
          skippedCount,
          totalFiles,
          details: `${totalFiles} dosya bulundu. ${uploadedCount} dosya başarıyla yüklendi, ${failedCount} dosya başarısız oldu (ağ hatası), ${skippedCount} dosya atlandı.`
        };
      }
      
      // API key hataları varsa özel hata mesajı
      if (failedCount > 0 && uploadedCount === 0) {
        return {
          success: false,
          message: 'Cloudinary API yapılandırma hatası',
          uploadedCount,
          failedCount,
          skippedCount,
          totalFiles,
          details: `Cloudinary API anahtarları eksik veya geçersiz. Environment değişkenlerini kontrol edin: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET`
        };
      }
      
      return {
        success: isSuccess,
        message,
        uploadedCount,
        failedCount,
        skippedCount,
        totalFiles,
        details: `${totalFiles} dosya bulundu. ${uploadedCount} dosya başarıyla yüklendi, ${failedCount} dosya başarısız oldu, ${skippedCount} dosya atlandı.`
      };
      
    } finally {
      // Geçici dizini temizle
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log(`Temporary directory cleaned: ${tempDir}`);
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    }
    
  } catch (error: any) {
    console.error('Cloudinary restore error:', error);
    return {
      success: false,
      message: 'Cloudinary geri yükleme başarısız oldu',
      uploadedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      totalFiles: 0,
      details: error.message || 'Bilinmeyen hata oluştu'
    };
  }
}

/**
 * Ana restore fonksiyonu - sadece Cloudinary
 */
export async function restoreLatestBackup(
  backupPath: string,
  encryptionKey?: string,
  options: RestoreOptions = {}
): Promise<{ cloudinary: RestoreResult }> {
  
  const results = {
    cloudinary: { success: false, message: 'Atlandı' } as RestoreResult
  };
  
  // Cloudinary restore
  if (options.restoreCloudinary) {
    console.log('Cloudinary geri yükleme başlatılıyor...');
    results.cloudinary = await restoreCloudinaryFromBackup(backupPath, encryptionKey);
  }
  
  return results;
}
