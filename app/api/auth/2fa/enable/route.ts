import { connectToDatabase } from '@/lib/mongodb';
import User, { UserRole } from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/middleware/authMiddleware';
import crypto from 'crypto';
import { encryptedJson } from '@/lib/response';

export async function POST(req: NextRequest) {
  try {
    // Kimlik doğrulama kontrolü
    const authToken = await authenticateUser(req);
    if (!authToken) {
      return encryptedJson(
        { success: false, message: 'Giriş yapmalısınız' },
        { status: 401 }
      );
    }

    const userId = authToken.id;
    const { token } = await req.json();
    
    if (!token || typeof token !== 'string') {
      return encryptedJson(
        { success: false, message: 'Geçerli bir token girilmelidir' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Kullanıcıyı twoFactorSecret değerini de içerecek şekilde al
    const user = await User.findById(userId).select('+twoFactorSecret');
    
    if (!user) {
      return encryptedJson(
        { success: false, message: 'Kullanıcı bulunamadı' },
        { status: 404 }
      );
    }
    
    // 2FA zaten aktifse bildir
    if (user.twoFactorEnabled) {
      return encryptedJson(
        { success: true, message: '2FA zaten etkin' },
        { status: 200 }
      );
    }

    try {
      // 2FA secret kontrolü
      if (!user.twoFactorSecret) {
        return encryptedJson(
          { success: false, message: '2FA secret bulunamadı' },
          { status: 400 }
        );
      }

      // Kendi manuel doğrulama uygulamamızı kullanalım
      // Base32 ile kodlanmış secret'ı decode edelim
      const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
      let bits = '';
      const secret = user.twoFactorSecret.toUpperCase();

      // Base32'den binary'e çevir
      for (let i = 0; i < secret.length; i++) {
        const val = base32Chars.indexOf(secret[i]);
        if (val === -1) continue; // Geçersiz karakterleri atla
        bits += val.toString(2).padStart(5, '0');
      }

      // Binary'i byte dizisine çevir
      const bytes = [];
      for (let i = 0; i < bits.length; i += 8) {
        const byte = bits.substr(i, 8);
        if (byte.length < 8) continue; // Eksik bitler varsa atla
        bytes.push(parseInt(byte, 2));
      }

      // TOTP doğrulama
      const counter = Math.floor(Date.now() / 30000); // 30 saniyelik pencere
      const hmac = crypto.createHmac('sha1', Buffer.from(bytes));
      hmac.update(Buffer.from(counter.toString(16).padStart(16, '0'), 'hex'));
      const hmacResult = hmac.digest();
      
      // Offset hesaplama
      const offset = hmacResult[hmacResult.length - 1] & 0xf;
      
      // Kodu hesapla
      let code = ((hmacResult[offset] & 0x7f) << 24) |
                ((hmacResult[offset + 1] & 0xff) << 16) |
                ((hmacResult[offset + 2] & 0xff) << 8) |
                (hmacResult[offset + 3] & 0xff);
                
      code = code % 1000000;
      const codeStr = code.toString().padStart(6, '0');
      
      // Kullanıcının girdiği kodla karşılaştır
      const isValid = codeStr === token;

      if (!isValid) {
        return encryptedJson(
          { success: false, message: 'Geçersiz doğrulama kodu' },
          { status: 400 }
        );
      }

      // 2FA'yı etkinleştir
      user.twoFactorEnabled = true;
      user.twoFactorVerified = true;
      user.lastTwoFactorVerification = new Date();
      await user.save();
      
      return encryptedJson({ 
        success: true, 
        message: '2FA başarıyla etkinleştirildi'
      });
    } catch (verifyError) {
      return encryptedJson(
        { success: false, message: 'Doğrulama işlemi sırasında hata oluştu' },
        { status: 500 }
      );
    }
  } catch (error) {
    return encryptedJson(
      { success: false, message: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
