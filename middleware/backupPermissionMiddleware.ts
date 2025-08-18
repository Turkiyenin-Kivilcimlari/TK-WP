import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { canViewBackups } from '@/lib/backup/backupPermissions';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/models/User';

/**
 * Cloudinary yedekleme işlemleri için gerekli izinleri kontrol eder
 */
export async function checkBackupPermissions(req: NextRequest): Promise<NextResponse | null> {
  try {
    const session = await getServerSession(authOptions);

    // Oturum kontrolü
    if (!session) {
      return NextResponse.json(
        { error: 'Oturum bulunamadı' },
        { status: 401 }
      );
    }

    // Süper admin her zaman erişebilir
    if (session.user.role === UserRole.SUPERADMIN) {
      return null;
    }

    // Admin için özel izin kontrolü
    if (session.user.role === UserRole.ADMIN) {
      const hasPermission = await canViewBackups(session.user.id);
      if (hasPermission) {
        return null;
      }
    }

    // Diğer tüm durumlar için erişim engellendi
    return NextResponse.json(
      { error: 'Bu işlem için yeterli izniniz yok' },
      { status: 403 }
    );
  } catch (error) {
    console.error('Backup permission check error:', error);
    return NextResponse.json(
      { error: 'İzin kontrolü sırasında hata oluştu' },
      { status: 500 }
    );
  }
}
