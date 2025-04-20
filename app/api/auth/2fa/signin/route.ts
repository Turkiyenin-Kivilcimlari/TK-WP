import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import crypto from 'crypto';

// 2FA doğrulama işlemini gerçekleştirecek api endpoint

// Base32 karakterlerini byte dizisine dönüştürme yardımcı fonksiyonu
function toSecretBytes(secret: string): Buffer {
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  const secret_upcase = secret.toUpperCase();
  
  // Base32'den binary'e çevir
  for (let i = 0; i < secret_upcase.length; i++) {
    const val = base32Chars.indexOf(secret_upcase[i]);
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
  
  return Buffer.from(bytes);
}

export async function POST(req: NextRequest) {
  try {
    const { email, twoFactorCode } = await req.json();
    
    if (!email || !twoFactorCode) {
      return NextResponse.json(
        { success: false, message: 'E-posta ve doğrulama kodu gereklidir' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Kullanıcıyı twoFactorSecret değerini de içerecek şekilde al
    const user = await User.findOne({ email }).select('+twoFactorSecret');
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Kullanıcı bulunamadı' },
        { status: 404 }
      );
    }
    
    // 2FA aktif değilse hata döndür
    if (!user.twoFactorEnabled) {
      return NextResponse.json(
        { success: false, message: 'Bu hesap için 2FA etkinleştirilmemiş' },
        { status: 400 }
      );
    }
    
    // Manuel TOTP doğrulama
    const secret = user.twoFactorSecret;
    const cleanToken = twoFactorCode.replace(/\s/g, '');
    
    if (!secret || !/^\d{6}$/.test(cleanToken)) {
      return NextResponse.json(
        { success: false, message: 'Geçersiz doğrulama kodu' },
        { status: 400 }
      );
    }
    
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
      
      // Kodu hesapla
      let code = ((digest[offset] & 0x7f) << 24) |
                ((digest[offset + 1] & 0xff) << 16) |
                ((digest[offset + 2] & 0xff) << 8) |
                (digest[offset + 3] & 0xff);
                
      code = code % 1000000;
      const codeStr = code.toString().padStart(6, '0');
      
      // Kullanıcının girdiği kodla karşılaştır
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
    
    // 2FA doğrulama başarılı - doğrulama durumunu güncelle
    user.twoFactorVerified = true;
    user.lastTwoFactorVerification = new Date();
    await user.save();
    
    return NextResponse.json({
      success: true,
      message: 'İki faktörlü doğrulama başarılı'
    });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
