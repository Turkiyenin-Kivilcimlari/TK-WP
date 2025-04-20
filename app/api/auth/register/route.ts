import { connectToDatabase } from '@/lib/mongodb';
import User, { UserRole } from '@/models/User';
import Token, { TokenType } from '@/models/Token';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendVerificationEmail } from '@/lib/mail';
import { Types } from 'mongoose';
import bcrypt from 'bcrypt';

// Kayıt isteği şeması
const registerSchema = z.object({
  name: z.string().min(2, 'Ad en az 2 karakter olmalıdır'),
  lastname: z.string().min(2, 'Soyad en az 2 karakter olmalıdır'),
  phone: z.string().min(10, 'Geçerli bir telefon numarası giriniz'),
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  password: z
    .string()
    .min(8, 'Şifre en az 8 karakter olmalıdır')
    .regex(/[a-z]/, 'Şifre en az bir küçük harf içermelidir')
    .regex(/[A-Z]/, 'Şifre en az bir büyük harf içermelidir')
    .regex(/\d/, 'Şifre en az bir rakam içermelidir'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Şifreler eşleşmiyor",
  path: ["confirmPassword"],
});

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await req.json();
    
    // İstek verilerini doğrula
    try {
      registerSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ success: false}, { status: 400 });
      }
      throw error;
    }
    
    const { name, lastname, email, password, phone } = body;
    
    // E-posta adresi kullanımda mı kontrol et
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Bu e-posta adresi zaten kullanımda' },
        { status: 400 }
      );
    }
    
    // Yeni kullanıcı oluştur
    const user = await User.create({
      name,
      lastname,
      email,
      password,
      phone,
      role: UserRole.MEMBER, // Varsayılan olarak üye rolü
      emailVerified: false // E-posta henüz doğrulanmadı
    });
    
    // Mongoose document olarak belirtelim
    const userDoc = user as unknown as { _id: Types.ObjectId } & typeof user;
    // Doğrulama token'ı oluştur
    const verificationToken = await Token.generateEmailVerificationToken(user._id as Types.ObjectId);
    
    // Kullanıcı kaydını başarılı olarak döndür, şifreyi hariç tut
    const userResponse = {
      id: userDoc._id.toString(),
      name: userDoc.name,
      lastname: userDoc.lastname,
      email: userDoc.email,
      phone: userDoc.phone,
      role: userDoc.role,
    };
    
    // E-posta doğrulama kodunu al
    const tokenDoc = await Token.findOne({
      token: verificationToken,
      userId: user._id,
      type: TokenType.VERIFY_EMAIL
    });
    
    if (!tokenDoc) {
      return NextResponse.json(
        { success: false, message: 'Token oluşturma hatası' },
        { status: 500 }
      );
    }
    
    // OTP kodu üret
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 basamaklı kod
    
    // OTP kodunu hash'le ve tokena kaydet
    tokenDoc.otpHash = await bcrypt.hash(otpCode, 10);
    await tokenDoc.save();
    
    // E-posta gönder
    await sendVerificationEmail(email, { token: verificationToken, otpCode });
    
    return NextResponse.json(
      { 
        success: true, 
        message: 'Kayıt başarılı. Lütfen e-posta adresinizi doğrulayın.', 
        user: userResponse,
        redirectUrl: `/verify-email?email=${encodeURIComponent(email)}` // Doğrulama sayfasına yönlendirme URL'i
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
