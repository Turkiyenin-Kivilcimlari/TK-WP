import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Token from '@/models/Token';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendPasswordResetEmail } from '@/lib/mail';
import { ObjectId } from 'mongodb';
import { encryptedJson } from '@/lib/response';

// Şema doğrulama
const forgotPasswordSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz')
});

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    
    // İstek gövdesini al ve doğrula
    const body = await req.json();
    
    try {
      forgotPasswordSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return encryptedJson({ success: false}, { status: 400 });
      }
      throw error;
    }
    
    const { email } = body;
    
    // Kullanıcıyı e-posta adresine göre bul
    const user = await User.findOne({ email });
    
    // Güvenlik için, kullanıcı bulunamasa bile başarılı yanıt döndür
    if (!user) {
      return encryptedJson({
        success: true,
        message: 'Şifre sıfırlama bağlantısı gönderildi (eğer e-posta adresiniz kayıtlıysa)'
      });
    }
    
    try {
      // Token oluştur - user._id'yi ObjectId olarak ele alıyoruz
      const userId = user._id as ObjectId;
      const resetToken = await Token.generatePasswordResetToken(userId);
      
      // E-posta gönder
      const emailSent = await sendPasswordResetEmail(email, resetToken);
      
      if (!emailSent) {
        return encryptedJson(
          { success: false, message: 'E-posta gönderilemedi, lütfen daha sonra tekrar deneyin' },
          { status: 500 }
        );
      }
      
      return encryptedJson({
        success: true,
        message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi',
        requires2FA: user.twoFactorEnabled || false // 2FA durumunu bildir
      });
      
    } catch (error) {
      return encryptedJson(
        { success: false, message: 'Şifre sıfırlama işlemi sırasında bir hata oluştu' },
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
