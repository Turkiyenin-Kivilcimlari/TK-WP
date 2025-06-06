import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Token, { TokenType } from '@/models/Token';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { encryptedJson } from '@/lib/response';

// Şema doğrulama
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token gereklidir'),
  password: z
    .string()
    .min(8, 'Şifre en az 8 karakter olmalıdır')
    .regex(/[a-z]/, 'Şifre en az bir küçük harf içermelidir')
    .regex(/[A-Z]/, 'Şifre en az bir büyük harf içermelidir')
    .regex(/\d/, 'Şifre en az bir rakam içermelidir'),
  confirmPassword: z.string(),
  twoFactorCode: z.string().optional(),  // 2FA kodu isteğe bağlı (gerekirse)
  skipTwoFactor: z.boolean().optional()  // 2FA kontrolünü atlama seçeneği
}).refine(data => data.password === data.confirmPassword, {
  message: "Şifreler eşleşmiyor",
  path: ["confirmPassword"],
});

// Base32 karakterlerini byte dizisine dönüştürme yardımcı fonksiyonu
function toSecretBytes(secret: string): Buffer {
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  
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

  return Buffer.from(bytes);
}

// 2FA doğrulama fonksiyonu
async function verify2FACode(secret: string, token: string): Promise<boolean> {
  try {
    if (!secret || !token) return false;
    
    const cleanToken = token.replace(/\s/g, '');
    if (!/^\d{6}$/.test(cleanToken)) return false;
    
    const currentTime = Math.floor(Date.now() / 1000);
    const timeWindow = 30; // 30 saniyelik pencere
    
    // Şimdiki, önceki ve sonraki zaman pencereleri için kontrol et (-1, 0, +1)
    for (let i = -1; i <= 1; i++) {
      const timeCounter = Math.floor(currentTime / timeWindow) + i;
      const hmacData = Buffer.from(timeCounter.toString(16).padStart(16, '0'), 'hex');
      
      // HMAC-SHA1 kullanarak özet oluştur
      const secretBytes = toSecretBytes(secret.toUpperCase());
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
        return true;
      }
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    
    // İstek gövdesini al ve doğrula
    const body = await req.json();
    
    try {
      resetPasswordSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return encryptedJson({ success: false}, { status: 400 });
      }
      throw error;
    }
    
    const { token, password, twoFactorCode, skipTwoFactor } = body;
    
    // Token'ı veritabanında bul
    const resetToken = await Token.findOne({
      token,
      type: TokenType.RESET_PASSWORD,
      expiresAt: { $gt: new Date() } // Süresi geçmemiş token'lar
    });
    
    if (!resetToken) {
      return encryptedJson(
        { success: false, message: 'Geçersiz veya süresi dolmuş token' },
        { status: 400 }
      );
    }
    
    try {
      // Kullanıcıyı bul
      const user = await User.findById(resetToken.userId).select('+twoFactorSecret');
      
      if (!user) {
        return encryptedJson(
          { success: false, message: 'Kullanıcı bulunamadı' },
          { status: 404 }
        );
      }
      
      // Eğer skipTwoFactor true ise veya kullanıcının 2FA'sı yoksa 2FA kontrolü atlansın
      const shouldSkipTwoFactor = skipTwoFactor || !user.twoFactorEnabled || !user.twoFactorSecret;
      
      // Kullanıcının 2FA'sı etkin mi kontrol et ve skip seçeneğine bağlı olarak karar ver
      if (!shouldSkipTwoFactor) {
        // 2FA kodu gönderilmemiş veya geçersizse hata döndür
        if (!twoFactorCode) {
          return encryptedJson(
            { 
              success: false, 
              message: 'İki faktörlü doğrulama kodu gerekli',
              requires2FA: true
            },
            { status: 400 }
          );
        }
        
        if (!user.twoFactorSecret) {
          return encryptedJson(
            {
              success: false,
              message: 'İki faktörlü doğrulama yapılamadı, gizli anahtar eksik',
            },
            { status: 400 }
          );
        }
        
        const is2FAValid = await verify2FACode(user.twoFactorSecret, twoFactorCode ?? '');
        
        if (!is2FAValid) {
          return encryptedJson(
            { 
              success: false, 
              message: 'Geçersiz doğrulama kodu',
              requires2FA: true
            },
            { status: 400 }
          );
        }
      }
      
      // Kullanıcının şifresini güncelle
      user.password = password;
      await user.save();
      
      // Token'ı sil
      await Token.deleteOne({ _id: resetToken._id });
      
      return encryptedJson({
        success: true,
        message: 'Şifreniz başarıyla sıfırlandı'
      });
    } catch (error) {
      return encryptedJson(
        { success: false, message: 'Şifre güncellenirken bir hata oluştu' },
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
