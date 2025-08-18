import * as path from "path";
import * as fs from "fs";
import cloudinary, { getAllCloudinaryAssets } from "@/lib/cloudinary";
import axios from "axios";
import { prepareBackupDirectory, createBackupZip } from "./backupUtils";
import {
  createBackupRecord,
  updateBackupRecord,
} from "@/lib/backupRecordService";
import { BackupOperationStatus, BackupType } from "@/models/Backup";
import { sendBackupNotification } from "./backupScheduler";

/**
 * Cloudinary'den medya dosyalarının yedeklemesini alır - MongoDB'siz
 */
export async function backupCloudinaryOnly(
  folders: string[] = [],
  backupDir?: string,
  encryptionKey?: string
): Promise<{ success: boolean; backupDir: string; error?: string }> {
  try {
    const basePath =
      process.env.BACKUP_PATH || path.join(process.cwd(), "backups");

    // Yedekleme dizinini hazırla
    const { backupDir: finalBackupDir } = await prepareBackupDirectory(
      basePath
    );
    const targetDir = backupDir || finalBackupDir;

    // Yedekleme kaydı oluştur
    const backupRecord = await createBackupRecord({
      type: BackupType.CLOUDINARY,
      status: BackupOperationStatus.IN_PROGRESS,
      path: targetDir,
    });

    // Cloudinary yapılandırması kontrolü
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      throw new Error("Cloudinary yapılandırması eksik");
    }

    // Cloudinary yedekleme için alt dizin oluştur
    const cloudinaryBackupDir = path.join(
      targetDir,
      `cloudinary_backup_${
        new Date().toISOString().replace(/:/g, "-").split(".")[0]
      }`
    );

    if (!fs.existsSync(cloudinaryBackupDir)) {
      fs.mkdirSync(cloudinaryBackupDir, { recursive: true });
    }

    // Cloudinary varlıklarını al
    const assets = await getAllCloudinaryAssets(folders);

    // Metadata dosyası oluştur
    const metadata = {
      timestamp: new Date().toISOString(),
      totalAssets: assets.length,
      folders: folders.length > 0 ? folders : "all",
      assets: assets.map((asset) => ({
        public_id: asset.public_id,
        format: asset.format,
        resource_type: asset.resource_type,
        type: asset.type,
        created_at: asset.created_at,
        bytes: asset.bytes,
        url: asset.secure_url,
      })),
    };

    // Metadata dosyasını kaydet
    const metadataPath = path.join(cloudinaryBackupDir, "metadata.json");
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    // Şifreleme varsa metadata'yı şifrele
    if (encryptionKey) {
      const { encryptFile } = await import("./encryptionUtil");
      const encryptedMetadataPath = metadataPath + ".enc";
      await encryptFile(metadataPath, encryptedMetadataPath);
      fs.unlinkSync(metadataPath);
    }

    // Klasör yapısını oluştur ve dosyaları indir
    let downloadedCount = 0;
    let failedCount = 0;

    for (const asset of assets) {
      try {
        // Klasör yapısını koru
        const assetFolder = asset.public_id.includes("/")
          ? path.dirname(asset.public_id)
          : "root";
        const assetDir = path.join(cloudinaryBackupDir, assetFolder);

        if (!fs.existsSync(assetDir)) {
          fs.mkdirSync(assetDir, { recursive: true });
        }

        // Dosya adını belirle
        const fileName = `${path.basename(asset.public_id)}.${asset.format}`;
        const downloadPath = path.join(assetDir, fileName);

        // Dosyayı indir
        await downloadCloudinaryAsset(asset.secure_url, downloadPath);
        downloadedCount++;
      } catch (assetError) {
        failedCount++;
      }
    }

    // ZIP oluştur
    const zipFilePath = path.join(
      targetDir,
      `cloudinary_backup_${Date.now()}.zip`
    );
    await createBackupZip(cloudinaryBackupDir, zipFilePath);

    // Şifreleme varsa uygula
    let finalFilePath = zipFilePath;
    if (encryptionKey) {
      const { encryptFile } = await import("./encryptionUtil");
      const encryptedFilePath = zipFilePath + ".enc";
      await encryptFile(zipFilePath, encryptedFilePath);
      fs.unlinkSync(zipFilePath);
      finalFilePath = encryptedFilePath;
    }

    // Zip oluşturulduktan sonra orijinal klasörü sil
    fs.rmSync(cloudinaryBackupDir, { recursive: true, force: true });

    // Backup kaydını güncelle
    await updateBackupRecord(backupRecord.id, {
      status: BackupOperationStatus.COMPLETED,
      path: finalFilePath,
    });

    // Başarılı bildirim gönder
    await sendBackupNotification(BackupOperationStatus.COMPLETED, targetDir);

    return { success: true, backupDir: targetDir };
  } catch (error: any) {
    // Başarısız bildirim gönder
    await sendBackupNotification(
      BackupOperationStatus.FAILED,
      backupDir || "",
      "Yedekleme işlemi başarısız oldu"
    );

    return { success: false, backupDir: backupDir || "", error: "Yedekleme işlemi başarısız oldu" };
  }
}

/**
 * Cloudinary varlığını indirir
 */
async function downloadCloudinaryAsset(
  url: string,
  downloadPath: string
): Promise<void> {
  const response = await axios.get(url, { responseType: "arraybuffer" });
  fs.writeFileSync(downloadPath, response.data);
}
