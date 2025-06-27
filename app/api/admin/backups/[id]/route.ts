import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import path from "path";
import fs from "fs";
import { UserRole } from "@/models/User";
import { checkAdminAuthWithTwoFactor } from "@/middleware/authMiddleware";
import { createHash, createDecipheriv } from "crypto";
import { encryptedJson } from "@/lib/response";

// Yedekleme şifresini doğrulama fonksiyonu
async function validateBackupPassword(backupId: string, password: string): Promise<boolean> {
  try {
    // Password boş ise hemen false döndür
    if (!password || password.trim() === '') {
      return false;
    }

    const backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), "backups");
    
    // 1. Önce backup dosyasını kontrol edelim (yeni format)
    let backupFilePath = path.join(backupDir, `${backupId}.zip.enc`);
    if (fs.existsSync(backupFilePath)) {
      
      // Şifre hash dosyasını kontrol et
      const passwordHashFile = path.join(backupDir, `${backupId}.password`);
      if (fs.existsSync(passwordHashFile)) {
        // Şifre hash'i ile karşılaştır
        const savedPasswordHash = fs.readFileSync(passwordHashFile, 'utf-8').trim();
        
        // Girilen şifreyi hash'le ve karşılaştır
        const hashedPassword = createHash('sha256').update(password).digest('hex');
        
        return savedPasswordHash === hashedPassword;
      }
      
      // Şifreli dosya var ama hash dosyası yok - test etmeye çalış
      try {
        // Dosyanın ilk 16 byte'ını IV olarak oku
        const encryptedData = fs.readFileSync(backupFilePath, null);
        const iv = encryptedData.slice(0, 16);
        
        // Şifreyi oluştur (32 karakter olmalı)
        const key = createHash('sha256').update(String(password)).digest('base64').substring(0, 32);
        
        // Şifre çözmeyi dene
        createDecipheriv('aes-256-cbc', key, iv);
        
        // Hata fırlatılmadıysa şifre doğru olabilir
        return true;
      } catch (error) {
        return false;
      }
    }
    
    // 2. Klasör yapısını kontrol edelim (eski format)
    backupFilePath = path.join(backupDir, backupId);
    if (!fs.existsSync(backupFilePath)) {
      return false;
    }
    
    // 3. Şifreleme anahtarı dosyasını kontrol et
    const passwordFilePath = path.join(backupFilePath, "password.txt");
    const keyFilePath = path.join(backupFilePath, "encryption-key.txt");
    
    // Şifre dosyası var mı?
    if (fs.existsSync(passwordFilePath)) {
      // Basit şifre karşılaştırması yap
      const savedPassword = fs.readFileSync(passwordFilePath, 'utf-8').trim();
      return savedPassword === password;
    } 
    
    // Şifreleme anahtarı var mı?
    if (fs.existsSync(keyFilePath)) {
      try {
        // Encryption-key.txt içeriğini oku
        const keyContent = fs.readFileSync(keyFilePath, 'utf-8').trim();
        
        // Key formatını kontrol et (genellikle iv:encryptedKey formatında)
        if (keyContent.includes(':')) {
          const [savedIv, encryptedKey] = keyContent.split(':');
          
          // Eğer iv ve encrypted key varsa, girilen şifreyle test et
          if (savedIv && encryptedKey) {
            // Şifreyi bir key olarak kullan ve dosyayı çözmeyi dene
            try {
              const key = createHash('sha256').update(String(password)).digest('base64').substring(0, 32);
              const iv = Buffer.from(savedIv, 'hex');
              
              // Şifre çözmeyi dene (başarısız olursa catch'e düşecek)
              createDecipheriv('aes-256-cbc', key, iv);
              
              return true;
            } catch (error) {
              return false;
            }
          }
        }
        
        // Şifreleme anahtarı formatı tanınmıyor
        return false;
      } catch (error) {
        return false;
      }
    }
    
    // Şifresiz yedek - admin yetkisi yeterli
    return true;
    
  } catch (error) {
    return false;
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Oturum kontrolü
    const session = await getServerSession(authOptions);
    if (!session || 
        (session.user.role !== UserRole.ADMIN && 
         session.user.role !== UserRole.SUPERADMIN)) {
      return encryptedJson({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    // İki faktörlü kimlik doğrulama kontrolü
    const adminCheck = await checkAdminAuthWithTwoFactor(req);
    if (adminCheck) return adminCheck;

    const backupId = params.id;
    
    // İstek gövdesini al (şifre için)
    const body = await req.json();
    const { password } = body;
    
    // Backup klasörünü belirle
    const backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), "backups");
    
    // 1. Önce .zip.enc dosyasını kontrol et
    let backupExists = false;
    let backupPath = path.join(backupDir, `${backupId}.zip.enc`);
    if (fs.existsSync(backupPath)) {
      backupExists = true;
    } else {
      // 2. Klasör yapısını kontrol et
      backupPath = path.join(backupDir, backupId);
      if (fs.existsSync(backupPath)) {
        backupExists = true;
      }
    }

    // Yedek var mı kontrol et
    if (!backupExists) {
      return encryptedJson(
        { error: "Belirtilen yedek bulunamadı" },
        { status: 404 }
      );
    }

    // Şifre doğrulaması
    const isPasswordValid = await validateBackupPassword(backupId, password);
    if (!isPasswordValid) {
      return encryptedJson(
        { error: "Geçersiz şifreleme anahtarı. Yedek silinemedi." },
        { status: 401 }
      );
    }

    // Dosya mı klasör mü kontrol et
    if (fs.statSync(backupPath).isDirectory()) {
      // Yedeği sil (klasörü kaldır)
      fs.rmSync(backupPath, { recursive: true, force: true });
    } else {
      // Yedeği sil (dosyayı kaldır)
      fs.unlinkSync(backupPath);
    }

    return encryptedJson({
      success: true,
      message: "Yedek başarıyla silindi",
    });
  } catch (error: any) {
    return encryptedJson(
      { error: "Yedek silinirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
