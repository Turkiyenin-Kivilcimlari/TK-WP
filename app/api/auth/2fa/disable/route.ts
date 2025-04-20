import { connectToDatabase } from '@/lib/mongodb';
import User, { UserRole } from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/middleware/authMiddleware';
import crypto from 'crypto';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    // Session veya JWT ile kimlik doğrulama kontrolü
    const session = await getServerSession(authOptions);
    let userId;
    
    if (session?.user?.id) {
      // Server session var, bu ID'yi kullan
      userId = session.user.id;
    } else {
      // Session yoksa JWT token'ı kontrol et
      const authToken = await authenticateUser(req);
      if (!authToken) {
        return NextResponse.json(
          { success: false, message: 'Giriş yapmalısınız' },
          { status: 401 }
        );
      }
      userId = authToken.id;
    }

    const requestBody = await req.json();
    const { token } = requestBody;
    
    // Token eksikse hata döndür
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Geçerli bir doğrulama kodu gereklidir' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Kullanıcıyı twoFactorSecret değerini de içerecek şekilde al
    const user = await User.findById(userId).select('+twoFactorSecret');
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Kullanıcı bulunamadı' },
        { status: 404 }
      );
    }

    // Kullanıcı admin ise, 2FA'yı devre dışı bırakmasına izin verme
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN) {
      return NextResponse.json(
        { success: false, message: 'Yöneticiler için 2FA zorunludur' },
        { status: 403 }
      );
    }
    
    // 2FA aktif değilse bildir
    if (!user.twoFactorEnabled) {
      return NextResponse.json(
        { success: true, message: '2FA zaten devre dışı' },
        { status: 200 }
      );
    }
    
    // Secret kontrolü
    if (!user.twoFactorSecret || typeof user.twoFactorSecret !== 'string') {
      return NextResponse.json(
        { success: false, message: '2FA yapılandırması geçersiz' },
        { status: 400 }
      );
    }
    
    try {
      // Manuel TOTP doğrulama - verify route ile aynı mantık
      const secret = user.twoFactorSecret.toUpperCase().replace(/\s/g, '');
      const cleanToken = token.replace(/\s/g, '');
      
      const currentTime = Math.floor(Date.now() / 1000);
      const timeWindow = 30; // 30 saniyelik pencere
      
      let isValid = false;
      for (let i = -1; i <= 1; i++) {
        const timeCounter = Math.floor(currentTime / timeWindow) + i;
        const hmacData = Buffer.from(timeCounter.toString(16).padStart(16, '0'), 'hex');
        
        const secretBytes = toSecretBytes(secret);
        const hmac = crypto.createHmac('sha1', secretBytes);
        hmac.update(hmacData);
        const digest = hmac.digest();
        
        const offset = digest[digest.length - 1] & 0xf;
        
        let code = ((digest[offset] & 0x7f) << 24) |
                 ((digest[offset + 1] & 0xff) << 16) |
                 ((digest[offset + 2] & 0xff) << 8) |
                 (digest[offset + 3] & 0xff);
        
        code = code % 1000000;
        const codeStr = code.toString().padStart(6, '0');
        
        if (codeStr === cleanToken) {
          isValid = true;
          break;
        }
      }
      
      if (!isValid) {
        return NextResponse.json(
          { success: false, message: 'Geçersiz doğrulama kodu' },
          { status: 400 }
        );
      }
      
      // Doğrulama başarılı, 2FA'yı devre dışı bırak
      user.twoFactorEnabled = false;
      user.twoFactorVerified = false;
      user.twoFactorSecret = undefined;
      user.lastTwoFactorVerification = undefined;
      await user.save();
      
      return NextResponse.json({ 
        success: true, 
        message: '2FA başarıyla devre dışı bırakıldı'
      });
    } catch (verifyError) {
      return NextResponse.json(
        { success: false, message: 'Doğrulama kodu işlenirken hata oluştu' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Sunucu hatası',
      },
      { status: 500 }
    );
  }
}

// Base32 karakterlerini byte dizisine dönüştürme yardımcı fonksiyonu
function toSecretBytes(secret: string): Buffer {
  // Base32 karakter seti
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  
  // Tüm karakterleri tek tek işleyerek bit dizisine dönüştür
  let bits = '';
  for (let i = 0; i < secret.length; i++) {
    const val = base32Chars.indexOf(secret[i]);
    if (val === -1) continue; // Geçersiz karakterleri atla
    bits += val.toString(2).padStart(5, '0');
  }
  
  // Bit dizisini byte'lara dönüştür
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    const byte = bits.substring(i, i + 8);
    if (byte.length < 8) continue; // Eksik bitler varsa atla
    bytes.push(parseInt(byte, 2));
  }
  
  return Buffer.from(bytes);
}
