import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import path from "path";
import fs from "fs";
import { UserRole } from "@/models/User";
import { checkAdminAuthWithTwoFactor } from "@/middleware/authMiddleware";
import { createHash, createDecipheriv } from "crypto";

// Yedekleme şifresini doğrulama fonksiyonu
async function validateBackupPassword(backupId: string, password: string): Promise<boolean> {
  try {
    // Password boş ise hemen false döndür
    if (!password || password.trim() === '') {
      console.log(`[Backup:${backupId}] Şifre boş`);
      return false;
    }

    const backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), "backups");
    
    // 1. Önce backup dosyasını kontrol edelim (yeni format)
    let backupFilePath = path.join(backupDir, `${backupId}.zip.enc`);
    if (fs.existsSync(backupFilePath)) {
      console.log(`[Backup:${backupId}] Şifreli yedek dosyası bulundu: ${backupFilePath}`);
      
      // Şifre hash dosyasını kontrol et
      const passwordHashFile = path.join(backupDir, `${backupId}.password`);
      if (fs.existsSync(passwordHashFile)) {
        // Şifre hash'i ile karşılaştır
        const savedPasswordHash = fs.readFileSync(passwordHashFile, 'utf-8').trim();
        
        // Girilen şifreyi hash'le ve karşılaştır
        const hashedPassword = createHash('sha256').update(password).digest('hex');
        
        console.log(`[Backup:${backupId}] Şifre hash'i karşılaştırılıyor`);
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
        console.log(`[Backup:${backupId}] Şifre doğrulaması başarılı (cipher testi)`);
        return true;
      } catch (error) {
        console.error(`[Backup:${backupId}] Şifre çözme denemesi başarısız:`, error);
        return false;
      }
    }
    
    // 2. Klasör yapısını kontrol edelim (eski format)
    backupFilePath = path.join(backupDir, backupId);
    if (!fs.existsSync(backupFilePath)) {
      console.log(`[Backup:${backupId}] Yedek klasörü bulunamadı: ${backupFilePath}`);
      return false;
    }
    
    // 3. Şifreleme anahtarı dosyasını kontrol et
    const passwordFilePath = path.join(backupFilePath, "password.txt");
    const keyFilePath = path.join(backupFilePath, "encryption-key.txt");
    
    // Şifre dosyası var mı?
    if (fs.existsSync(passwordFilePath)) {
      // Basit şifre karşılaştırması yap
      const savedPassword = fs.readFileSync(passwordFilePath, 'utf-8').trim();
      console.log(`[Backup:${backupId}] Şifre dosyası bulundu, karşılaştırılıyor`);
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
              
              console.log(`[Backup:${backupId}] Şifreleme anahtarı doğrulandı`);
              return true;
            } catch (error) {
              console.error(`[Backup:${backupId}] Şifre çözme hatası:`, error);
              return false;
            }
          }
        }
        
        // Şifreleme anahtarı formatı tanınmıyor
        console.log(`[Backup:${backupId}] Şifreleme anahtarı formatı tanınmıyor`);
        return false;
      } catch (error) {
        console.error(`[Backup:${backupId}] Şifreleme anahtarı okuma hatası:`, error);
        return false;
      }
    }
    
    // Şifresiz yedek - admin yetkisi yeterli
    console.log(`[Backup:${backupId}] Şifresiz yedek bulundu, admin yetkisi yeterli`);
    return true;
    
  } catch (error) {
    console.error(`[Backup:${backupId}] Şifre doğrulama hatası:`, error);
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
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    // İki faktörlü kimlik doğrulama kontrolü
    const adminCheck = await checkAdminAuthWithTwoFactor(req);
    if (adminCheck) return adminCheck;

    const backupId = params.id;
    console.log(`[Delete Backup] ID: ${backupId} silme isteği alındı`);
    
    // İstek gövdesini al (şifre için)
    const body = await req.json();
    const { password } = body;
    console.log(`[Delete Backup] Şifre girişi: ${password ? "Var" : "Yok"}`);

    // Backup klasörünü belirle
    const backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), "backups");
    
    // 1. Önce .zip.enc dosyasını kontrol et
    let backupExists = false;
    let backupPath = path.join(backupDir, `${backupId}.zip.enc`);
    if (fs.existsSync(backupPath)) {
      backupExists = true;
      console.log(`[Delete Backup] Şifreli dosya bulundu: ${backupPath}`);
    } else {
      // 2. Klasör yapısını kontrol et
      backupPath = path.join(backupDir, backupId);
      if (fs.existsSync(backupPath)) {
        backupExists = true;
        console.log(`[Delete Backup] Yedek klasörü bulundu: ${backupPath}`);
      }
    }

    // Yedek var mı kontrol et
    if (!backupExists) {
      console.log(`[Delete Backup] Yedek bulunamadı: ${backupId}`);
      return NextResponse.json(
        { error: "Belirtilen yedek bulunamadı" },
        { status: 404 }
      );
    }

    // Şifre doğrulaması
    const isPasswordValid = await validateBackupPassword(backupId, password);
    if (!isPasswordValid) {
      console.log(`[Delete Backup] Şifre doğrulama başarısız: ${backupId}`);
      return NextResponse.json(
        { error: "Geçersiz şifreleme anahtarı. Yedek silinemedi." },
        { status: 401 }
      );
    }

    console.log(`[Delete Backup] Yedek siliniyor: ${backupPath}`);
    // Dosya mı klasör mü kontrol et
    if (fs.statSync(backupPath).isDirectory()) {
      // Yedeği sil (klasörü kaldır)
      fs.rmSync(backupPath, { recursive: true, force: true });
    } else {
      // Yedeği sil (dosyayı kaldır)
      fs.unlinkSync(backupPath);
    }

    console.log(`[Delete Backup] Yedek başarıyla silindi: ${backupId}`);
    return NextResponse.json({
      success: true,
      message: "Yedek başarıyla silindi",
    });
  } catch (error: any) {
    console.error("Yedek silme hatası:", error);
    return NextResponse.json(
      { error: error.message || "Yedek silinirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
