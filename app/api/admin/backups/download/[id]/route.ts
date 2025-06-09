import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth";
import { UserRole } from '@/models/User';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream, existsSync } from 'fs';
import crypto from 'crypto';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Oturum ve yetkilendirme kontrolü
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Oturum açık değil' },
        { status: 401 }
      );
    }

    // Yönetici veya süper admin kontrolü
    const hasPermission = session.user.role === UserRole.ADMIN || 
                         session.user.role === UserRole.SUPERADMIN;
    
    if (!hasPermission) {
      return NextResponse.json(
        { message: 'Bu işlem için yetkiniz bulunmuyor' },
        { status: 403 }
      );
    }

    // Yedekleme ID'sini al
    const backupId = params.id;
    if (!backupId) {
      return NextResponse.json(
        { message: 'Yedek ID\'si gerekli' },
        { status: 400 }
      );
    }

    // URL'den şifreleme anahtarını al
    const url = new URL(request.url);
    const encryptionKey = url.searchParams.get('key');

    // Yedeğin depolandığı yolları ayarla - ayarlardan alınabilir
    const backupsDir = process.env.BACKUP_DIR || './backups';
    const backupFilePath = path.join(backupsDir, `${backupId}.zip`);
    const encryptedBackupFilePath = path.join(backupsDir, `${backupId}.zip.enc`);

    // Şifreli veya normal dosyanın var olup olmadığını kontrol et
    const isEncrypted = existsSync(encryptedBackupFilePath);
    const isNormal = existsSync(backupFilePath);

    if (!isEncrypted && !isNormal) {
      return NextResponse.json(
        { message: 'Belirtilen yedek bulunamadı' },
        { status: 404 }
      );
    }

    // Dosya şifreli ve şifreleme anahtarı verilmişse
    if (isEncrypted) {
      if (!encryptionKey) {
        return NextResponse.json(
          { message: 'Bu yedek şifrelenmiş. Şifreleme anahtarı gerekli.' },
          { status: 400 }
        );
      }

      try {
        // Şifrelenmiş dosyayı oku
        const encryptedData = await fs.readFile(encryptedBackupFilePath);
        
        // Şifre çözme işlemi (IV ilk 16 byte'da saklanır)
        const iv = encryptedData.slice(0, 16);
        const encryptedContent = encryptedData.slice(16);
        
        const decipher = crypto.createDecipheriv(
          'aes-256-cbc', 
          crypto.createHash('sha256').update(String(encryptionKey)).digest('base64').substring(0, 32), 
          iv
        );
        
        const decrypted = Buffer.concat([
          decipher.update(encryptedContent),
          decipher.final()
        ]);

        // Dosya adını ayarla
        const fileName = `backup-${backupId}.zip`;
        
        // Response'u hazırla
        return new NextResponse(decrypted, {
          headers: {
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Content-Type': 'application/zip',
          },
        });
      } catch (error) {
        console.error('Şifre çözme hatası:', error);
        return NextResponse.json(
          { message: 'Şifre çözme başarısız. Geçersiz şifreleme anahtarı.' },
          { status: 400 }
        );
      }
    }

    // Normal, şifrelenmemiş dosya
    // Dosya adını ayarla
    const fileName = `backup-${backupId}.zip`;

    // Dosyayı stream olarak gönder
    const fileBuffer = await fs.readFile(backupFilePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Type': 'application/zip',
      },
    });

  } catch (error) {
    console.error('Yedek indirme hatası:', error);
    return NextResponse.json(
      { message: 'Yedek indirilirken bir hata oluştu' },
      { status: 500 }
    );
  }
}
