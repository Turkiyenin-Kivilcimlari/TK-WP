import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Dosyayı şifreler
 * @param filePath Şifrelenecek dosya yolu
 * @param encryptionKey Şifreleme anahtarı
 * @returns Şifrelenmiş dosya yolu
 */
export const encryptFile = async (filePath: string, encryptionKey: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Şifreleme algoritması ve IV oluştur
      const algorithm = 'aes-256-cbc';
      const iv = crypto.randomBytes(16);
      
      // Anahtarı 32 byte'a dönüştür (AES-256 için)
      const key = crypto.createHash('sha256').update(encryptionKey).digest();
      
      // Şifreleme nesnesi oluştur
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      
      // Çıktı dosya yolu
      const outputPath = `${filePath}.enc`;
      
      // Dosya akışlarını oluştur
      const readStream = fs.createReadStream(filePath);
      const writeStream = fs.createWriteStream(outputPath);
      
      // IV'yi dosyanın başına yaz
      writeStream.write(iv);
      
      // Şifreleme işlemi
      readStream.pipe(cipher).pipe(writeStream);
      
      writeStream.on('finish', () => {
        resolve(outputPath);
      });
      
      writeStream.on('error', (error) => {
        reject(`Şifreleme hatası: ${error.message}`);
      });
    } catch (error) {
      reject(`Şifreleme hatası: ${error}`);
    }
  });
};

/**
 * Şifrelenmiş dosyayı çözer
 * @param encryptedFilePath Şifrelenmiş dosya yolu
 * @param outputPath İsteğe bağlı çıktı yolu
 * @param encryptionKey Şifreleme anahtarı
 * @returns Çözülmüş dosya yolu
 */
export const decryptFile = async (
  encryptedFilePath: string, 
  outputPath: string,
  encryptionKey: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      console.log(`Şifrelenmiş dosya çözülüyor: ${encryptedFilePath} -> ${outputPath}`);
      
      // Algoritma
      const algorithm = 'aes-256-cbc';
      
      // Anahtarı 32 byte'a dönüştür (AES-256 için)
      const key = crypto.createHash('sha256').update(encryptionKey).digest();
      
      if (!fs.existsSync(encryptedFilePath)) {
        reject(`Şifrelenmiş dosya bulunamadı: ${encryptedFilePath}`);
        return;
      }
      
      // Şifrelenmiş dosyayı aç
      const fileBuffer = fs.readFileSync(encryptedFilePath);
      
      // Şifrelenmiş veri formatını belirle
      let iv;
      let encryptedData;
      
      if (encryptedFilePath.endsWith('.enc')) {
        try {
          // .enc dosya formatı (IV + şifrelenmiş veri)
          iv = fileBuffer.slice(0, 16);
          encryptedData = fileBuffer.slice(16);
          
          // Deşifreleme nesnesi oluştur
          const decipher = crypto.createDecipheriv(algorithm, key, iv);
          
          // Deşifreleme işlemi
          const decrypted = Buffer.concat([
            decipher.update(encryptedData),
            decipher.final()
          ]);
          
          // Dosyaya yaz
          fs.writeFileSync(outputPath, decrypted);
          
          console.log(`Dosya başarıyla çözüldü: ${outputPath}`);
          resolve(outputPath);
          return;
        } catch (encError) {
          console.error('Standart şifre çözme başarısız, alternatif yöntem deneniyor:', encError);
          // Hata durumunda alternatif yöntemle devam edeceğiz
        }
      }
      
      // Alternatif şifreleme formatını kontrol et
      const encKeyDir = path.dirname(encryptedFilePath);
      const encInfoPath = path.join(encKeyDir, '.encryption_info');
      
      if (fs.existsSync(encInfoPath)) {
        try {
          console.log('Şifreleme bilgisi dosyası bulundu, alternatif yöntem kullanılıyor');
          const encInfo = JSON.parse(fs.readFileSync(encInfoPath, 'utf8'));
          const salt = Buffer.from(encInfo.salt, 'hex');
          iv = Buffer.from(encInfo.iv, 'hex');
          
          // createEncryptedZip içinde oluşturulan şekilde anahtar üret
          const zipKey = crypto.scryptSync(encryptionKey, salt, 32);
          
          // Şifre çözme
          const decipher = crypto.createDecipheriv(algorithm, zipKey, iv);
          const decrypted = Buffer.concat([
            decipher.update(fileBuffer),
            decipher.final()
          ]);
          
          // Dosyaya yaz
          fs.writeFileSync(outputPath, decrypted);
          
          console.log(`Dosya alternatif yöntemle başarıyla çözüldü: ${outputPath}`);
          resolve(outputPath);
          return;
        } catch (err) {
          console.error('Şifreleme bilgisi kullanılarak çözme başarısız:', err);
        }
      }
      
      // Son çare olarak standart IV kullan
      console.log('Standart IV ile çözme deneniyor');
      iv = Buffer.alloc(16, 0);
      encryptedData = fileBuffer;
      
      try {
        // Deşifreleme nesnesi oluştur
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        
        // Deşifreleme işlemi
        const decrypted = Buffer.concat([
          decipher.update(encryptedData),
          decipher.final()
        ]);
        
        // Dosyaya yaz
        fs.writeFileSync(outputPath, decrypted);
        
        console.log(`Dosya standart IV ile çözüldü: ${outputPath}`);
        resolve(outputPath);
      } catch (finalError: unknown) {
        console.error('Tüm şifre çözme yöntemleri başarısız oldu:', finalError);
        const errorMessage = finalError instanceof Error ? finalError.message : String(finalError);
        reject(`Deşifreleme hatası: Hiçbir yöntem başarılı olmadı - ${errorMessage}`);
      }
    } catch (error: unknown) {
      console.error('Genel şifre çözme hatası:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      reject(`Deşifreleme hatası: ${errorMessage}`);
    }
  });
};

/**
 * Şifreleme anahtarı oluşturur
 * @returns Rastgele şifreleme anahtarı
 */
export const generateEncryptionKey = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Güçlü bir şifre oluşturur
 */
export function generateStrongPassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  return password;
}

/**
 * Şifreyi yedekleme dizininde bir dosyaya kaydeder
 */
export function saveEncryptionKey(backupDir: string, password: string): void {
  const keyFilePath = path.join(backupDir, 'encryption-key.txt');
  fs.writeFileSync(keyFilePath, password, 'utf8');
}

/**
 * Kaydedilen şifreyi okur
 */
export function getEncryptionKey(backupDir: string): string {
  const keyFilePath = path.join(backupDir, 'encryption-key.txt');
  if (fs.existsSync(keyFilePath)) {
    return fs.readFileSync(keyFilePath, 'utf8');
  }
  throw new Error('Şifre dosyası bulunamadı');
}
