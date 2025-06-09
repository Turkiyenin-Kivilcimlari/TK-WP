import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/models/User';
import * as fs from 'fs';
import * as path from 'path';

// Varsayılan yedekleme ayarları - MongoDB devre dışı
const DEFAULT_BACKUP_SETTINGS = {
  schedule: '0 3 * * *', // Her gün saat 03:00'de
  retention: {
    days: 30,
    maxBackups: 10,
  },
  storage: {
    local: {
      path: './backups',
    },
  },
  mongodb: {
    enabled: false, // MongoDB'yi devre dışı bırak
    encrypt: false,
  },
  cloudinary: {
    enabled: true, // Cloudinary'yi etkin bırak
    encrypt: true,
    folders: [],
  },
  notifications: {
    email: {
      enabled: true,
      recipients: [],
      onSuccess: true,
      onFailure: true,
    },
  },
};

// Ayarların kaydedileceği dosya yolu
const SETTINGS_FILE_PATH = path.join(process.cwd(), 'data', 'backupSettings.json');

/**
 * Yedekleme ayarlarını getiren GET isteğini işler
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Oturum kontrolü - SuperAdmin veya Admin erişimine izin ver
    if (!session || (session.user.role !== UserRole.SUPERADMIN && session.user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    // data klasörü yoksa oluştur
    const dataDir = path.dirname(SETTINGS_FILE_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Ayarlar dosyası varsa oku
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const settingsData = fs.readFileSync(SETTINGS_FILE_PATH, 'utf8');
      return NextResponse.json(JSON.parse(settingsData));
    }
    
    // Dosya yoksa varsayılan ayarları döndür ve oluştur
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(DEFAULT_BACKUP_SETTINGS, null, 2), 'utf8');
    return NextResponse.json(DEFAULT_BACKUP_SETTINGS);
  } catch (error) {
    console.error('Yedekleme ayarları alınırken hata oluştu:', error);
    return NextResponse.json({ error: 'Ayarlar alınırken bir hata oluştu' }, { status: 500 });
  }
}

/**
 * Yedekleme ayarlarını güncelleyen POST isteğini işler 
 * - Bu rotayı düzgün çalışır hale getiriyoruz
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Sadece SuperAdmin kullanıcıların ayarları güncellemesine izin ver
    if (!session || session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    const newSettings = await request.json();
    
    // data klasörü yoksa oluştur
    const dataDir = path.dirname(SETTINGS_FILE_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Ayarları dosyaya kaydet
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(newSettings, null, 2), 'utf8');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Ayarlar başarıyla kaydedildi',
      settings: newSettings 
    });
  } catch (error) {
    console.error('Yedekleme ayarları güncellenirken hata oluştu:', error);
    return NextResponse.json({ error: 'Ayarlar güncellenirken bir hata oluştu' }, { status: 500 });
  }
}
