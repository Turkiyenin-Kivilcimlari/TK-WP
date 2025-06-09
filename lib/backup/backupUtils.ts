import { MongoClient, ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawn } from 'child_process';
import archiver from 'archiver'; // Add this import
import { encryptFile } from './encryptionUtil'; // Import your encryption utility

/**
 * MongoDB yedek dosya detaylarını alır
 */
export interface BackupFileInfo {
  filePath: string;
  fileName: string;
  fileSize: number;
  createdAt: Date;
  type: 'mongodb' | 'cloudinary' | 'files' | 'full';
  encrypted: boolean;
  databaseName?: string;
  collections?: string[];
}

/**
 * Yedekleme dosyalarını analiz eder ve bilgilerini döndürür
 */
export function analyzeBackupFiles(backupDir: string): BackupFileInfo[] {
  if (!fs.existsSync(backupDir)) {
    return [];
  }

  const backupFiles: BackupFileInfo[] = [];
  
  // Tüm dosyaları ve alt klasörleri listele
  const processDir = (dirPath: string) => {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // Alt klasörleri işle
        processDir(fullPath);
      } else if (entry.isFile()) {
        // Dosyaları işle
        if (
          entry.name.endsWith('.gz') || 
          entry.name.endsWith('.enc') || 
          entry.name.endsWith('.json') ||
          entry.name.endsWith('.zip')
        ) {
          try {
            const stats = fs.statSync(fullPath);
            
            // Dosya bilgilerini oluştur
            const fileInfo: BackupFileInfo = {
              filePath: fullPath,
              fileName: entry.name,
              fileSize: stats.size,
              createdAt: stats.ctime,
              type: determineBackupType(entry.name),
              encrypted: entry.name.endsWith('.enc'),
              databaseName: extractDatabaseName(entry.name),
            };
            
            // JSON dosyasıysa içindeki koleksiyon bilgilerini çıkarmaya çalış
            if (entry.name.endsWith('.json') && entry.name.startsWith('schema_')) {
              try {
                const schemaData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
                if (schemaData.databases) {
                  const dbNames = Object.keys(schemaData.databases);
                  if (dbNames.length > 0) {
                    fileInfo.databaseName = dbNames[0];
                    fileInfo.collections = Object.keys(schemaData.databases[dbNames[0]].collections);
                  }
                }
              } catch (e) {
                // JSON ayrıştırma hatası, koleksiyon bilgisi olmayabilir
              }
            }
            
            backupFiles.push(fileInfo);
          } catch (error) {
            // Hata durumunda dosyayı atla
            console.error(`Dosya incelenirken hata: ${fullPath}`, error);
          }
        }
      }
    }
  };
  
  processDir(backupDir);
  
  // Oluşturma tarihine göre sırala (en yeniler önce)
  return backupFiles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Yedek dosyasının türünü belirler
 */
function determineBackupType(fileName: string): 'mongodb' | 'cloudinary' | 'files' | 'full' {
  if (fileName.includes('mongodb_complete') || fileName.startsWith('schema_')) {
    return 'mongodb';
  } else if (fileName.includes('cloudinary')) {
    return 'cloudinary';
  } else if (fileName.includes('files')) {
    return 'files';
  }
  return 'full';
}

/**
 * Dosya adından veritabanı adını çıkarır
 */
function extractDatabaseName(fileName: string): string | undefined {
  // mongodb_[dbname]_[timestamp].gz veya [dbname]_[timestamp].gz formatı
  const dbMatch = fileName.match(/^(mongodb_)?([^_]+)_\d{4}-\d{2}-\d{2}/);
  if (dbMatch && dbMatch[2]) {
    return dbMatch[2];
  }
  return undefined;
}

/**
 * Belgeyi MongoDB JSON formatına dönüştür
 * ObjectId ve Date değerlerini uygun formata çevirir
 */
export function convertToMongoDBFormat(doc: any): any {
  if (doc === null || typeof doc !== 'object') {
    return doc;
  }

  // Yeni bir nesne oluştur ve değerleri işleyerek aktar
  const result: any = Array.isArray(doc) ? [] : {};

  for (const key in doc) {
    if (Object.prototype.hasOwnProperty.call(doc, key)) {
      const value = doc[key];

      // ObjectId özel işleme - stringified ObjectId kontrolü ekle
      if (value && 
          (value.constructor && value.constructor.name === 'ObjectId' || 
           (typeof value === 'object' && value._bsontype === 'ObjectId'))) {
        result[key] = { $oid: value.toString() };
      }
      // Date özel işleme
      else if (value instanceof Date) {
        result[key] = { $date: value.toISOString() };
      }
      // İç içe nesneler için özyinelemeli dönüşüm
      else if (value !== null && typeof value === 'object') {
        result[key] = convertToMongoDBFormat(value);
      }
      // Diğer değerler aynen kalsın
      else {
        result[key] = value;
      }
    }
  }

  return result;
}

/**
 * MongoDB formatındaki JSON'u normal JavaScript nesnelerine dönüştürür
 */
export function convertFromMongoDBFormat(doc: any): any {
  if (doc === null || typeof doc !== 'object') {
    return doc;
  }

  // Yeni bir nesne oluştur ve değerleri işleyerek aktar
  const result: any = Array.isArray(doc) ? [] : {};

  for (const key in doc) {
    if (Object.prototype.hasOwnProperty.call(doc, key)) {
      const value = doc[key];

      // ObjectId dönüşümü
      if (value && typeof value === 'object' && value.$oid) {
        result[key] = new ObjectId(value.$oid);
      }
      // Tarih dönüşümü
      else if (value && typeof value === 'object' && value.$date) {
        result[key] = new Date(value.$date);
      }
      // İç içe nesneler için özyinelemeli dönüşüm
      else if (value !== null && typeof value === 'object') {
        result[key] = convertFromMongoDBFormat(value);
      }
      // Diğer değerler aynen kalsın
      else {
        result[key] = value;
      }
    }
  }

  return result;
}

/**
 * Bir dosyanın hash değerini hesaplar (bütünlük kontrolü için)
 */
export function calculateFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', (data) => {
      hash.update(data);
    });
    
    stream.on('end', () => {
      resolve(hash.digest('hex'));
    });
    
    stream.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Belirtilen dizini ZIP formatında sıkıştırır
 * Node.js ve archiver kullanarak
 */
export async function createBackupZip(sourceDir: string, outputZipPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Çıktı akışı oluştur
      const output = fs.createWriteStream(outputZipPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maksimum sıkıştırma seviyesi
      });

      // Arşivleme olaylarını dinle
      output.on('close', () => {        
        console.log(`Yedekleme tamamlandı: ${outputZipPath}`);
        console.log(`Toplam boyut: ${archive.pointer()} bayt`);
        resolve(outputZipPath);
      });

      archive.on('error', (err) => {
        reject(err);
      });

      // Çıktı akışına bağla
      archive.pipe(output);

      // Kaynak dizindeki tüm dosyaları tara ve arşive ekle
      archive.directory(sourceDir, false);

      // Arşivi sonlandır
      archive.finalize();
    } catch (error) {
      console.error('ZIP oluşturulurken hata:', error);
      reject(error);
    }
  });
}

// Yedekleme dizinini oluşturur
export async function prepareBackupDirectory(basePath: string): Promise<{ backupDir: string }> {
  // Zaman damgalı dizin adı oluştur
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const backupDir = path.join(basePath, timestamp);
  
  // Dizini oluştur
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  return { backupDir };
}

/**
 * MongoDB araçları için yapılandırma ayarları
 */
const MONGODB_TOOLS_CONFIG = {
  binPath: process.env.MONGODB_TOOLS_PATH || '', // MongoDB araçlarının tam yolu
  mongodump: 'mongodump', // mongodump komutu
  mongoexport: 'mongoexport', // mongoexport komutu
};

// MongoDB araçlarının kurulu olup olmadığını kontrol eder
export async function checkMongoDBTools(): Promise<boolean> {
  try {
    // which komutunu (Unix) veya where komutunu (Windows) kullanarak mongodump'ı ara
    const command = process.platform === 'win32' ? 'where' : 'which';
    const mongodumpPath = 'mongodump';
    
    return new Promise((resolve) => {
      const proc = spawn(command, [mongodumpPath]);
      
      proc.on('close', (code) => {
        resolve(code === 0);
      });
      
      proc.on('error', () => {
        resolve(false);
      });
    });
  } catch (error) {
    console.error('MongoDB araçları kontrolünde hata oluştu:', error);
    return false;
  }
}

// MongoDB için yedekleme işlemi yapar
export async function createMongoDBBackup(
  backupPath: string,
  encryptionKey?: string
): Promise<{ success: boolean; message: string; error?: any }> {
  try {
    // MongoDB araçlarının kurulu olup olmadığını kontrol et
    const isMongoDBToolsInstalled = await checkMongoDBTools();
    
    if (!isMongoDBToolsInstalled) {
      return {
        success: false,
        message: 'MongoDB araçları (mongodump) bulunamadı. Lütfen MongoDB Database Tools paketini yükleyin veya yolunu yapılandırın.',
        error: 'MONGODB_TOOLS_NOT_FOUND'
      };
    }

    // MongoDB URI'yi al
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      return {
        success: false,
        message: 'MongoDB bağlantı adresi (MONGODB_URI) bulunamadı',
        error: 'MONGODB_URI_NOT_FOUND'
      };
    }

    // Arşiv dosya yolu
    const archivePath = path.join(backupPath, 'mongodb.archive');

    // Mongodump komutunu hazırla
    const mongodumpPath = 'mongodump';
    
    const args = [
      `--uri=${MONGODB_URI}`,
      '--gzip',
      `--archive=${archivePath}`
    ];

    console.log(`MongoDB yedekleme komutu çalıştırılıyor: ${mongodumpPath} ${args.join(' ')}`);

    // Çıktıları topla
    let stdoutData = '';
    let stderrData = '';

    // mongodump komutunu çalıştır
    const result = await new Promise<{ success: boolean; message: string; error?: any }>((resolve) => {
      const proc = spawn(mongodumpPath, args);
      
      proc.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });
      
      proc.stderr.on('data', (data) => {
        stderrData += data.toString();
      });
      
      proc.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            message: 'MongoDB yedeği başarıyla oluşturuldu'
          });
        } else {
          resolve({
            success: false,
            message: `MongoDB yedekleme işlemi başarısız oldu: ${stderrData || 'Bilinmeyen hata'}`,
            error: stderrData
          });
        }
      });
      
      proc.on('error', (error: NodeJS.ErrnoException) => {
        // ENOENT hatası için daha anlamlı mesaj
        if (error.code === 'ENOENT') {
          resolve({
            success: false,
            message: 'MongoDB araçları (mongodump) bulunamadı. Lütfen MongoDB Database Tools paketini yükleyin.',
            error: error
          });
        } else {
          resolve({
            success: false,
            message: `MongoDB yedekleme işlemi sırasında hata oluştu: ${error.message}`,
            error: error
          });
        }
      });
    });

    // Yedekleme başarısızsa hemen döndür
    if (!result.success) {
      return result;
    }

    // Şifreleme yapılacaksa
    if (encryptionKey) {
      console.log('MongoDB yedeği şifreleniyor...');
      
      // Şifrelenmiş dosya yolu
      const encryptedFilePath = path.join(backupPath, 'mongodb.archive.enc');
      
      // Dosyayı şifrele
      await encryptFile(archivePath, encryptedFilePath);
      
      // Orijinal şifrelenmemiş dosyayı sil
      fs.unlinkSync(archivePath);
      
      console.log('MongoDB yedeği şifrelendi ve orijinal dosya silindi');
    }

    return {
      success: true,
      message: 'MongoDB yedeği başarıyla oluşturuldu' + (encryptionKey ? ' ve şifrelendi' : '')
    };
  } catch (error: any) {
    return {
      success: false,
      message: `MongoDB yedekleme işlemi sırasında beklenmeyen bir hata oluştu: ${error.message}`,
      error
    };
  }
}

/**
 * Belirtilen veritabanını JSON formatında yedeğini alır
 */
export async function exportMongoDBToJSON(
  backupPath: string,
  dbName: string = 'topluluk',
  encryptionKey?: string
): Promise<{ success: boolean; message: string; error?: any }> {
  try {
    // MongoDB URI'yi al
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      return {
        success: false,
        message: 'MongoDB bağlantı adresi (MONGODB_URI) bulunamadı',
        error: 'MONGODB_URI_NOT_FOUND'
      };
    }

    // JSON dosya yolu
    const jsonPath = path.join(backupPath, 'mongodb_export.json');

    // MongoDB'ye bağlan
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    try {
      console.log(`MongoDB veritabanına bağlanıldı, JSON yedekleme başlıyor...`);
      
      const db = client.db(dbName);
      
      // Tüm koleksiyonları listele
      const collections = await db.listCollections().toArray();
      
      // Yedek veri yapısı
      const backupData = {
        database: dbName,
        createdAt: new Date().toISOString(),
        collections: {} as Record<string, any[]>
      };
      
      // Her koleksiyon için verileri al
      for (const collInfo of collections) {
        const collectionName = collInfo.name;
        console.log(`"${collectionName}" koleksiyonu yedekleniyor...`);
        
        const collection = db.collection(collectionName);
        const documents = await collection.find({}).toArray();
        
        // Koleksiyonu yedek verisine ekle
        backupData.collections[collectionName] = documents;
      }
      
      // JSON dosyasına yaz
      fs.writeFileSync(jsonPath, JSON.stringify(backupData, null, 2));
      
      console.log(`MongoDB JSON yedekleme tamamlandı: ${jsonPath}`);
      
      // Şifreleme yapılacaksa
      if (encryptionKey) {
        console.log('MongoDB JSON yedeği şifreleniyor...');
        
        // Şifrelenmiş dosya yolu
        const encryptedFilePath = path.join(backupPath, 'mongodb_export.json.enc');
        
        // Dosyayı şifrele
        await encryptFile(jsonPath, encryptedFilePath);
        
        // Orijinal şifrelenmemiş dosyayı sil
        fs.unlinkSync(jsonPath);
        
        console.log('MongoDB JSON yedekleme şifrelendi ve orijinal dosya silindi');
      }
      
      return {
        success: true,
        message: 'MongoDB JSON yedekleme başarıyla oluşturuldu' + (encryptionKey ? ' ve şifrelendi' : '')
      };
    } finally {
      await client.close();
    }
  } catch (error: any) {
    console.error('MongoDB JSON yedekleme hatası:', error);
    return {
      success: false,
      message: `MongoDB JSON yedekleme alınırken hata oluştu: ${error.message}`,
      error
    };
  }
}
