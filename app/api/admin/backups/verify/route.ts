import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/models/User';
import { encryptedJson } from '@/lib/response';
import { canViewBackups } from '@/lib/backup/backupPermissions';
import { authenticateUser, checkAdminAuthWithTwoFactor } from '@/middleware/authMiddleware';

// Sisteminizde belirlenen yedekleme şifresi - gerçek uygulamada env değişkeni olarak saklanmalı
const BACKUP_MASTER_PASSWORD = process.env.BACKUP_MASTER_PASSWORD;

export async function POST(req: NextRequest) {
  try {
    // Yönetici erişim kontrolü
    const adminCheck = await checkAdminAuthWithTwoFactor(req);
    if (adminCheck) return adminCheck;
    
    // Temel kullanıcı doğrulaması
    const token = await authenticateUser(req);
    if (!token) {
      return encryptedJson(
        { success: false, message: 'Oturum açmanız gerekiyor' },
        { status: 401 }
      );
    }
    
    // Erişim kontrolü - Sadece SuperAdmin veya yedekleme izni olanlar
    const hasPermission = 
      token.role === UserRole.SUPERADMIN || 
      (token.role === UserRole.ADMIN && await canViewBackups(token.id));
    
    if (!hasPermission) {
      return encryptedJson(
        { success: false, message: 'Bu işlem için yetkiniz bulunmuyor' },
        { status: 403 }
      );
    }
    
    // İstek gövdesini al
    const body = await req.json();
    const { password } = body;
    
    // Şifre doğrulama
    if (!password || password !== BACKUP_MASTER_PASSWORD) {
      return encryptedJson(
        { success: false, message: 'Geçersiz yedekleme şifresi' },
        { status: 401 }
      );
    }
    
    // Şifre doğruysa başarılı yanıt
    return encryptedJson(
      { 
        success: true, 
        message: 'Yedekleme erişimi onaylandı',
        // Belirli bir süre için geçerli özel bir token üretebilirsiniz
        accessToken: generateBackupAccessToken(),
        expiresAt: getExpirationTime()
      },
      { status: 200 }
    );
    
  } catch (error: any) {
    return encryptedJson(
      { success: false, message: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}

// Yedekleme işlemleri için geçici erişim tokeni oluşturma
function generateBackupAccessToken(): string {
  // Basit bir token üretimi - gerçek uygulamada daha güçlü bir yöntem kullanılmalı
  return `backup_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// Token'ın geçerlilik süresi (örneğin 1 saat sonra)
function getExpirationTime(): number {
  return Date.now() + 60 * 60 * 1000; // 1 saat
}
