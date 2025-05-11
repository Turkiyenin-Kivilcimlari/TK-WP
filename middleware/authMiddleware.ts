import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { UserRole } from '@/models/User';
import { CustomJwtPayload } from '@/types/auth';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { encryptedJson } from '@/lib/response';

/**
 * Kullanıcının kimliğini doğrular ve token bilgilerini döndürür
 */
export async function authenticateUser(req: NextRequest) {
  try {
    // Önce server session'ı kontrol et
    const session = await getServerSession(authOptions);
    
    if (session?.user) {
      // Oturum varsa kullanıcının e-posta doğrulamasını kontrol et
      // Session içinde emailVerified olmadığı için kontrol yapmak için kullanıcıyı veritabanından çekmemiz gerekiyor
      await connectToDatabase();
      const user = await User.findOne({ email: session.user.email });
      
      if (!user || !user.emailVerified) {
        return null;
      }
      
      // Oturum varsa, kullanıcı kimliğini ve rolünü döndür
      return {
        id: session.user.id,
        role: session.user.role as UserRole,
        email: session.user.email as string,
        slug: session.user.slug as string
      };
    }
    
    // Oturum yoksa JWT token'ı kontrol et
    // 1. Önce cookies'den token al
    let token = req.cookies.get('token')?.value;
    
    // 2. Eğer cookies'de yoksa, Authorization header'ından Bearer token'ı almayı dene
    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    if (!token) {
      return null;
    }
    
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return null;
    }
    
    try {
      // Token'ı doğrula
      const decoded = jwt.verify(token, jwtSecret) as CustomJwtPayload;
      return decoded;
    } catch (jwtError: any) {
      
      // Token geçersizse veya format uygun değilse null dön
      return null;
    }
  } catch (error) {
    return null;
  }
}

/**
 * Belirli rollere sahip kullanıcıların erişimine izin verir
 */
export function authorizeRoles(...roles: UserRole[]) {
  return async (req: NextRequest) => {
    const token = await authenticateUser(req);
    
    if (!token) {
      return encryptedJson(
        { success: false, message: 'Giriş yapmalısınız' },
        { status: 401 }
      );
    }
    
    const userRole = typeof token === 'string' ? null : token.role;
    
    // SUPERADMIN her zaman erişim alır
    if (userRole === UserRole.SUPERADMIN) {
      return null;
    }
    
    if (!userRole || !roles.includes(userRole as UserRole)) {
      return encryptedJson(
        { success: false, message: 'Bu işlem için yetkiniz bulunmamaktadır' },
        { status: 403 }
      );
    }
    
    return null;
  };
}

/**
 * Admin yetkilerini ve 2FA doğrulamasını kontrol eder
 */
export async function checkAdminAuthWithTwoFactor(req: NextRequest) {
  try {
    const token = await authenticateUser(req);
    if (!token) {
      return encryptedJson(
        { 
          success: false, 
          message: 'Giriş yapmalısınız', 
          errorType: 'auth_required' 
        },
        { status: 401 }
      );
    }
    
    // Kullanıcı rolünü kontrol et
    if (typeof token === 'string') {
      return encryptedJson(
        { 
          success: false, 
          message: 'Geçersiz kimlik bilgileri', 
          errorType: 'invalid_token' 
        },
        { status: 401 }
      );
    }
    
    // Admin değilse yetkisiz
    if (token.role !== UserRole.ADMIN && token.role !== UserRole.SUPERADMIN) {
      return encryptedJson(
        { 
          success: false, 
          message: 'Bu işlem için yetkiniz bulunmuyor', 
          errorType: 'permission_denied' 
        },
        { status: 403 }
      );
    }
    
    // Kullanıcının 2FA durumunu kontrol et
    await connectToDatabase();
    
    const user = await User.findById(token.id);
    if (!user) {
      return encryptedJson(
        { 
          success: false, 
          message: 'Kullanıcı bulunamadı', 
          errorType: 'user_not_found' 
        },
        { status: 404 }
      );
    }
    
    // Admin/SuperAdmin ise ve 2FA etkinleştirilmemişse, zorunlu kılmalıyız
    if (!user.twoFactorEnabled) {
      return encryptedJson(
        { 
          success: false, 
          message: 'Lütfen önce iki faktörlü doğrulamayı etkinleştirin. Admin işlemleri için 2FA gereklidir.', 
          errorType: '2fa_setup_required',
          requireSetup: true 
        },
        { status: 403 }
      );
    }
    
    // Doğrulama yapılmış mı ve süresi dolmuş mu kontrol et
    const isVerified = user.twoFactorVerified || false;
    
    // Son doğrulama zamanını kontrol et
    if (isVerified && user.lastTwoFactorVerification) {
      const now = new Date();
      const lastVerification = new Date(user.lastTwoFactorVerification);
      const diffMs = now.getTime() - lastVerification.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      // Admin için 3 saatlik (180 dakika) doğrulama süresini kontrol et
      if (diffMins <= 180) {
        // Doğrulama geçerli, devam et
        return null;
      }
    } else if (isVerified) {
      // lastTwoFactorVerification null olsa bile, twoFactorVerified true ise devam et
      // Bu aradaki durumları düzeltir
      // Yeni bir doğrulama zamanı oluştur
      user.lastTwoFactorVerification = new Date();
      await user.save();
      return null;
    }
    
    // Doğrulama geçersiz veya süresi dolmuş
    return encryptedJson(
      { 
        success: false, 
        message: 'İki faktörlü doğrulama yapmanız gerekiyor. Admin işlemlerini gerçekleştirebilmek için lütfen 2FA doğrulamasını tamamlayın.', 
        errorType: '2fa_verification_required',
        requireVerification: true 
      },
      { status: 403 }
    );
    
  } catch (error) {
    return encryptedJson(
      { 
        success: false, 
        message: 'Sunucu hatası. ',
        errorType: 'server_error' 
      },
      { status: 500 }
    );
  }
}

export function requireAdminWithTwoFactor() {
  return async (req: NextRequest) => {
    return await checkAdminAuthWithTwoFactor(req);
  };
}
