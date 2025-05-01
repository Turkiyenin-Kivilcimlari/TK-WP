import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Token from '@/models/Token';
import { NextRequest, NextResponse } from 'next/server';
import { sendVerificationEmail } from '@/lib/mail';
import { Types, Document } from 'mongoose';
import { TokenType } from '@/models/Token';
import { encryptedJson } from '@/lib/response';

// Define the interface for User document
interface UserDocument extends Document {
  email: string;
  emailVerified: boolean;
  _id: Types.ObjectId;
}

export async function POST(req: NextRequest) {
  try {
    // İstek gövdesinden e-posta adresini al
    const body = await req.json();
    const { email, forceNew } = body;
    
    if (!email) {
      return encryptedJson(
        { success: false, message: 'E-posta adresi gereklidir' },
        { status: 400 }
      );
    }
    // E-posta ile kullanıcıyı bul
    const user = await User.findOne({ email }) as UserDocument | null;
    
    if (!user) {
      return encryptedJson(
        { success: false, message: 'Kullanıcı bulunamadı' },
        { status: 404 }
      );
    }
    
    
    
    const userId = user._id.toString();
    
    // E-posta zaten doğrulanmışsa ve forceNew false ise bildir
    if (user.emailVerified && !forceNew) {
      return encryptedJson(
        { success: false, message: 'E-posta adresiniz zaten doğrulanmış' },
        { status: 400 }
      );
    }
    
    // Kullanıcı ID'sinin formatını doğru şekilde kontrol et
    let userObjectId;
    try {
      userObjectId = new Types.ObjectId(userId);
    } catch (error) {
      return encryptedJson(
        { success: false, message: 'Geçersiz kullanıcı ID formatı' },
        { status: 400 }
      );
    }
    
    // Önce kullanıcının eski token'larını temizle
    const deletedTokens = await Token.deleteMany({
      userId: userObjectId,
      type: TokenType.VERIFY_EMAIL
    });
    
    // Token oluştur - doğru format ile ObjectId kullanıldığına emin ol
    const verificationToken = await Token.generateEmailVerificationToken(userObjectId);
    
    // OTP kodu üret
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 basamaklı kod
    
    // Token'ı bul ve OTP hash'ini kaydet
    const tokenDoc = await Token.findOne({
      token: verificationToken,
      userId: userObjectId,
      type: TokenType.VERIFY_EMAIL
    });
    
    if (!tokenDoc) {
      return encryptedJson(
        { success: false, message: 'Token oluşturma hatası' },
        { status: 500 }
      );
    }
    
    // OTP kodunu hash'le ve tokena kaydet
    const bcrypt = require('bcrypt');
    tokenDoc.otpHash = await bcrypt.hash(otpCode, 10);
    await tokenDoc.save();
    
    
    // E-posta gönder
    const emailSent = await sendVerificationEmail(email, { 
      token: verificationToken, 
      otpCode 
    });
    
    if (!emailSent) {
      return encryptedJson(
        { success: false, message: 'E-posta gönderilemedi, lütfen daha sonra tekrar deneyin' },
        { status: 500 }
      );
    }
    
    return encryptedJson({
      success: true,
      message: 'Doğrulama bağlantısı e-posta adresinize gönderildi'
    });
    
  } catch (error) {
    return encryptedJson(
      { success: false, message: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
