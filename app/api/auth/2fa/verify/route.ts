import { connectToDatabase } from '@/lib/mongodb';
import User, { UserRole } from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/middleware/authMiddleware';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    // Önce session'ı kontrol et, sonra token'a bak
    const session = await getServerSession(authOptions);
    let userId;
    let isAdmin = false;
    
    if (session?.user?.id) {
      // Server session var, bu ID'yi kullan
      userId = session.user.id;
      isAdmin = session.user.role === UserRole.ADMIN || session.user.role === UserRole.SUPERADMIN;
    } else {
      // Session yoksa JWT token'ı kontrol et
      const authToken = await authenticateUser(req);
      if (!authToken || typeof authToken === 'string') {
        return NextResponse.json(
          { success: false, message: 'Giriş yapmalısınız' },
          { status: 401 }
        );
      }
      userId = authToken.id;
      isAdmin = authToken.role === UserRole.ADMIN || authToken.role === UserRole.SUPERADMIN;
    }
    
    const body = await req.json();
    const { token } = body;
    
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Geçerli bir token girilmelidir' },
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
    
    // 2FA aktif değilse hata döndür
    if (!user.twoFactorEnabled) {
      return NextResponse.json(
        { success: false, message: '2FA etkinleştirilmemiş' },
        { status: 400 }
      );
    }

    // Hata yönetimini daha sağlam yapalım
    try {
      // Özel doğrulama mantığı - speakeasy yerine kendi algoritmamızı kullanalım
      if (!user.twoFactorSecret || typeof user.twoFactorSecret !== 'string') {
        return NextResponse.json(
          { success: false, message: '2FA yapılandırması geçersiz' },
          { status: 400 }
        );
      }

      // Manuel TOTP doğrulama
      const secret = user.twoFactorSecret.toUpperCase().replace(/\s/g, '');
      const cleanToken = token.replace(/\s/g, '');
      
      // Speakeasy'nin base32 kodunu çözmeden kendi basit doğrulama fonksiyonumuzu kullanacağız
      const currentTime = Math.floor(Date.now() / 1000);
      const timeWindow = 30; // 30 saniyelik pencere
      
      // Şimdiki, önceki ve sonraki zaman pencereleri için kontrol et (-1, 0, +1)
      let isValid = false;
      for (let i = -1; i <= 1; i++) {
        const timeCounter = Math.floor(currentTime / timeWindow) + i;
        const hmacData = Buffer.from(timeCounter.toString(16).padStart(16, '0'), 'hex');
        
        // HMAC-SHA1 kullanarak özet oluştur
        const secretBytes = toSecretBytes(secret);
        const hmac = crypto.createHmac('sha1', secretBytes);
        hmac.update(hmacData);
        const digest = hmac.digest();
        
        // Offset hesaplama
        const offset = digest[digest.length - 1] & 0xf;
        
        // 4 byte kodu al ve maskeleyerek 31-bitlik sayı haline getir
        let code = ((digest[offset] & 0x7f) << 24) |
                 ((digest[offset + 1] & 0xff) << 16) |
                 ((digest[offset + 2] & 0xff) << 8) |
                 (digest[offset + 3] & 0xff);
        
        // 6 basamaklı kod oluştur
        code = code % 1000000;
        const codeStr = code.toString().padStart(6, '0');
        
        // Kullanıcının kodunu karşılaştır
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

      // Doğrulama başarılı - kullanıcı verisini güncelle
      user.twoFactorVerified = true;
      user.lastTwoFactorVerification = new Date();
      await user.save();

      // Doğrulama başarılı
      return NextResponse.json({ 
        success: true, 
        message: '2FA doğrulama başarılı',
        verified: true,
        isAdmin: isAdmin
      });
    } catch (verifyError) {
      return NextResponse.json(
        { success: false, message: 'Doğrulama kodu işlenirken hata oluştu' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Sunucu hatası' },
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
