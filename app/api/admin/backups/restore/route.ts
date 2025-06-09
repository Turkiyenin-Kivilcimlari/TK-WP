import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { restoreLatestBackup } from "@/lib/backup";
import path from "path";
import fs from "fs";
import { checkAdminAuthWithTwoFactor } from "@/middleware/authMiddleware";
import { UserRole } from '@/models/User';
import { isBackupPasswordVerified } from '@/lib/backupPermissions';
import os from 'os';
import { restoreCloudinaryFromBackup } from "@/lib/backup/restore";

export async function POST(req: NextRequest) {
  try {
    // Session authentication
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPERADMIN)) {
      return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 403 });
    }

    const adminCheck = await checkAdminAuthWithTwoFactor(req);
    if (adminCheck) return adminCheck;

    // Get request data
    const body = await req.json();
    const backupId = body.backupId;
    const encryptionKey = body.encryptionKey;
    const restoreOptions = body.restoreOptions || { cloudinary: true }; // Sadece cloudinary

    if (!backupId) {
      return NextResponse.json(
        {
          success: false,
          error: "Geri yüklenecek yedek ID'si belirtilmedi",
        },
        { status: 400 }
      );
    }

    // Password verification check
    const isPasswordValid = await isBackupPasswordVerified() || encryptionKey;
    
    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Yedekleme şifresi doğrulanmadı veya geçersiz",
        },
        { status: 401 }
      );
    }

    // Determine backup directory
    const backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), "backups");
    const backupPath = path.join(backupDir, backupId);

    // Check if backup exists
    if (!fs.existsSync(backupPath)) {
      return NextResponse.json(
        {
          success: false,
          error: "Belirtilen yedek bulunamadı",
        },
        { status: 404 }
      );
    }

    // Check if backup is encrypted
    const isEncrypted = fs.readdirSync(backupPath).some(file => 
      file.endsWith('.enc') || 
      file === 'encryption-key.txt' || 
      file === '.encryption_info'
    );

    // Handle encrypted backups
    if (isEncrypted && !encryptionKey) {
      // Check for stored encryption key
      const keyFilePath = path.join(backupPath, 'encryption-key.txt');
      if (fs.existsSync(keyFilePath)) {
        try {
          // Read encryption key from file
          const storedKey = fs.readFileSync(keyFilePath, 'utf8').trim();
          console.log('Yedek klasöründen şifreleme anahtarı kullanılıyor');
          
          // Start restore with stored key
          return await performRestore(backupPath, storedKey, restoreOptions);
        } catch (keyError) {
          console.error('Şifreleme anahtarı dosyası okuma hatası:', keyError);
          return NextResponse.json(
            {
              success: false,
              error: "Yedek şifrelenmiş ve şifreleme anahtarı okunamadı",
              requiresKey: true,
            },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          {
            success: false,
            error: "Bu yedek şifrelenmiş, şifreleme anahtarı gerekli",
            requiresKey: true,
          },
          { status: 400 }
        );
      }
    }

    // Start restore process
    return await performRestore(backupPath, encryptionKey, restoreOptions);
  } catch (error: any) {
    console.error("Restore error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// Helper function to perform restore operation - sadece Cloudinary
async function performRestore(
  backupPath: string, 
  encryptionKey: string | undefined, 
  restoreOptions: { mongodb?: boolean; cloudinary?: boolean }
) {
  try {
    console.log(`Geri yükleme başlatılıyor: ${backupPath}`);
    console.log(`Seçenekler: MongoDB=false (devre dışı), Cloudinary=${restoreOptions.cloudinary}`);
    
    // Check if backup directory exists and is accessible
    if (!fs.existsSync(backupPath)) {
      console.error(`Backup directory not found: ${backupPath}`);
      return NextResponse.json(
        {
          success: false,
          error: "Belirtilen yedek klasörü bulunamadı veya erişilemez",
        },
        { status: 404 }
      );
    }
    
    // Ensure temp directory exists and is accessible
    const tempDir = path.join(os.tmpdir(), 'topluluk_restore');
    if (!fs.existsSync(tempDir)) {
      try {
        fs.mkdirSync(tempDir, { recursive: true });
        console.log(`Created temporary directory: ${tempDir}`);
      } catch (tempDirError) {
        console.error('Temp directory creation error:', tempDirError);
      }
    }
    
    // Cloudinary geri yükleme işlemini başlat
    let result = {
      cloudinary: {
        success: false,
        uploadedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        totalFiles: 0,
        details: '',
        message: ''
      }
    };

    if (restoreOptions.cloudinary) {
      try {
        const cloudinaryResult = await restoreCloudinaryFromBackup(
          backupPath, 
          encryptionKey,
          {
            forceUpload: true,
            skipExistingCheck: true
          }
        );
        
        result.cloudinary = {
          success: cloudinaryResult.success || false,
          uploadedCount: cloudinaryResult.uploadedCount || 0,
          failedCount: cloudinaryResult.failedCount || 0,
          skippedCount: cloudinaryResult.skippedCount || 0,
          totalFiles: cloudinaryResult.totalFiles || 0,
          details: cloudinaryResult.details || '',
          message: cloudinaryResult.message || ''
        };
        
      } catch (cloudinaryError: any) {
        console.error('Cloudinary restore error:', cloudinaryError);
        result.cloudinary = {
          success: false,
          uploadedCount: 0,
          failedCount: 0,
          skippedCount: 0,
          totalFiles: 0,
          details: `Cloudinary geri yükleme hatası: ${cloudinaryError.message}`,
          message: cloudinaryError.message
        };
      }
    }

    // Check success based on selected options
    const isCloudinarySuccess = !restoreOptions.cloudinary || result.cloudinary.success;
    const isOverallSuccess = isCloudinarySuccess;
    
    console.log("Geri yükleme sonucu:", {
      success: isOverallSuccess,
      cloudinary: {
        success: result.cloudinary.success,
        uploadedCount: result.cloudinary.uploadedCount,
        failedCount: result.cloudinary.failedCount,
        skippedCount: result.cloudinary.skippedCount,
        totalFiles: result.cloudinary.totalFiles
      }
    });
    
    // Return result
    if (isOverallSuccess) {
      const totalFiles = result.cloudinary.totalFiles;
      const uploadedCount = result.cloudinary.uploadedCount;
      const failedCount = result.cloudinary.failedCount;
      const skippedCount = result.cloudinary.skippedCount;
      
      return NextResponse.json({
        success: true,
        message: "Cloudinary verileri başarıyla geri yüklendi",
        uploadedCount,
        failedCount,
        skippedCount,
        totalFiles,
        details: `${totalFiles} dosya işlendi: ${uploadedCount} başarılı, ${failedCount} başarısız, ${skippedCount} atlandı. ${result.cloudinary.details || "Geri yükleme tamamlandı"}`
      });
    } else {
      // Return error with detailed messages
      const totalFiles = result.cloudinary.totalFiles;
      const uploadedCount = result.cloudinary.uploadedCount;
      const failedCount = result.cloudinary.failedCount;
      
      return NextResponse.json(
        {
          success: false,
          message: "Cloudinary geri yükleme başarısız oldu",
          uploadedCount,
          failedCount,
          totalFiles,
          details: `${totalFiles} dosya işlendi: ${uploadedCount} başarılı, ${failedCount} başarısız. ${result.cloudinary.details || result.cloudinary.message || "Dosyalar yüklenemedi"}`
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Restore process error:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Geri yükleme işlemi sırasında hata oluştu: ${error.message}`,
        details: `Hata detayı: ${error.stack || error.toString()}`,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
