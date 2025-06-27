import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { manualBackup } from "@/lib/backup";
import path from "path";
import fs from "fs";
import { checkAdminAuthWithTwoFactor } from "@/middleware/authMiddleware";
import { encryptedJson } from "@/lib/response";

// Yedekleri listele
export async function GET(req: NextRequest) {
  try {
    // Oturum kontrolü
    const session = await getServerSession(authOptions);

    if (
      !session ||
      (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")
    ) {
      return encryptedJson({ error: "Yetkisiz erişim" }, { status: 403 });
    }
    const adminCheck = await checkAdminAuthWithTwoFactor(req);
    if (adminCheck) return adminCheck;

    // Yedekleme dosyalarını bul
    const backupDir =
      process.env.BACKUP_DIR || path.join(process.cwd(), "backups");

    if (!fs.existsSync(backupDir)) {
      return encryptedJson({ backups: [] });
    }

    // Klasörleri tarihe göre sırala
    const backupFolders = fs
      .readdirSync(backupDir)
      .filter((dir) => fs.statSync(path.join(backupDir, dir)).isDirectory())
      .map((dir) => {
        const dirPath = path.join(backupDir, dir);
        const stat = fs.statSync(dirPath);

        // Encryption key kontrolü
        const hasEncryptionKey = fs.existsSync(
          path.join(dirPath, "encryption-key.txt")
        );

        // MongoDB yedek dosyasını kontrol et - ARTIK GEREKLİ DEĞİL
        const mongoFiles: string[] = []; // MongoDB dosyalarını artık aramıyoruz

        // Cloudinary backup kontrolü - ZIP dosyaları ara
        const cloudinaryFiles = fs
          .readdirSync(dirPath)
          .filter(
            (file) =>
              file.startsWith("cloudinary_backup_") && file.endsWith(".zip")
          );

        // Tür belirle - sadece Cloudinary
        let type = "cloudinary";
        if (cloudinaryFiles.length === 0) {
          type = "unknown"; // Cloudinary dosyası yoksa bilinmeyen
        }

        // Klasördeki tüm dosyaların toplam boyutunu hesapla
        let totalSize = 0;
        const calculateDirSize = (dirPath: string) => {
          const files = fs.readdirSync(dirPath);
          for (const file of files) {
            const filePath = path.join(dirPath, file);
            const fileStat = fs.statSync(filePath);
            if (fileStat.isDirectory()) {
              calculateDirSize(filePath);
            } else {
              totalSize += fileStat.size;
            }
          }
        };

        calculateDirSize(dirPath);

        // Boyutu formatla
        const formatSize = (bytes: number) => {
          if (bytes < 1024) return bytes + " B";
          if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
          if (bytes < 1024 * 1024 * 1024)
            return (bytes / (1024 * 1024)).toFixed(2) + " MB";
          return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
        };

        return {
          id: dir,
          name: dir,
          date: stat.birthtime.toISOString(),
          size: formatSize(totalSize),
          type,
          status: "completed",
          encrypted: hasEncryptionKey,
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return encryptedJson({ backups: backupFolders });
  } catch (error: any) {
    return encryptedJson({ error: "Yedekleme verileri yüklenirken bir hata oluştu" }, { status: 500 });
  }
}

// Yeni yedek oluştur - sadece Cloudinary
export async function POST(req: NextRequest) {
  try {
    // Oturum kontrolü
    const session = await getServerSession(authOptions);

    if (
      !session ||
      (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")
    ) {
      return encryptedJson({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    // Request body'den parametreleri al
    const body = await req.json();
    const backupType = body.type || "cloudinary"; // Varsayılan olarak cloudinary

    // Manuel Cloudinary yedekleme başlat
    const result = await manualBackup({
      includeCloudinary: true,
    });

    if (result.success) {
      return encryptedJson({
        success: true,
        message: "Cloudinary yedekleme işlemi başlatıldı",
      });
    } else {
      throw new Error("Cloudinary yedekleme işlemi başlatılamadı");
    }
  } catch (error: any) {
    return encryptedJson({ error: " ", success: false }, { status: 500 });
  }
}
