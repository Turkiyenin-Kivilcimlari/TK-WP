import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { Document } from 'mongoose';
import { encryptedJson } from '@/lib/response';

// Define a type for user document
interface UserDocument extends Document {
  _id: any;
  name: string;
  lastname: string;
  email: string;
  password: string;
  role: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  lastTwoFactorVerification: Date | null;
  twoFactorVerified: boolean;
  comparePassword: (password: string) => Promise<boolean>;
  getJwtToken: () => string;
}

// Giriş isteği şeması - turnstileToken eklendi
const loginSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  password: z.string().min(1, 'Şifre alanı zorunludur'),
  turnstileToken: z.string().optional() // Cloudflare Turnstile token
});

// Cloudflare Turnstile doğrulama fonksiyonu
async function verifyCloudflareTurnstile(token: string): Promise<boolean> {
  try {
    // Geliştirme ortamında doğrulamayı atla
    if (process.env.NODE_ENV === 'development' && token === "localhost-dev-verification-token") {
      return true;
    }
    
    // Eğer token yoksa doğrulama başarısız
    if (!token) return false;
    
    const formData = new URLSearchParams();
    formData.append('secret', process.env.CLOUDFLARE_WIDGET_SECRET_KEY || '');
    formData.append('response', token);
    
    const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });
    
    const data = await result.json();
    
    return data.success === true;
  } catch (error) {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await req.json();
    const { email, password, turnstileToken } = body;
    
    // Üretim ortamında Cloudflare Turnstile token doğrulaması yapılmalı
    if (process.env.NODE_ENV !== 'development') {
      if (!turnstileToken) {
        return encryptedJson(
          { success: false, message: 'Robot doğrulaması gerekli' },
          { status: 400 }
        );
      }
      
      // Cloudflare Turnstile doğrulaması
      const isVerified = await verifyCloudflareTurnstile(turnstileToken);
      if (!isVerified) {
        return encryptedJson(
          { success: false, message: 'Robot doğrulaması başarısız oldu' },
          { status: 400 }
        );
      }
    }
    // 
    try {
      loginSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return encryptedJson({ success: false }, { status: 400 });
      }
      throw error;
    }
    
    // Kullanıcıyı e-posta adresine göre bul ve şifreyi seç
    const user = await User.findOne({ email }).select('+password') as UserDocument | null;
    
    if (!user) {
      return encryptedJson(
        { success: false, message: 'Geçersiz e-posta veya şifre' },
        { status: 401 }
      );
    }
    
    // Şifre doğrulama
    const isPasswordMatch = await user.comparePassword(password);
    
    if (!isPasswordMatch) {
      return encryptedJson(
        { success: false, message: 'Geçersiz e-posta veya şifre' },
        { status: 401 }
      );
    }
    
    // Yeni: E-posta doğrulanmadıysa girişe izin verme
    if (!user.emailVerified) {
      return encryptedJson(
        { 
          success: false, 
          message: 'E-posta adresinizi doğrulayın',
          redirectUrl: `/verify-email?email=${encodeURIComponent(email)}`
        },
        { status: 401 }
      );
    }
    
    // Admin kullanıcıları için otomatik 2FA doğrulaması ayarla
    if ((user.role === 'ADMIN' || user.role === 'SUPERADMIN') && 
        user.twoFactorEnabled && !user.lastTwoFactorVerification) {
      user.lastTwoFactorVerification = new Date();
      user.twoFactorVerified = true;
      await user.save();
    }
    
    // JWT token oluştur
    const token = user.getJwtToken();
    
    // Token'ı çerezle gönder
    const response = encryptedJson(
      { 
        success: true, 
        message: 'Giriş başarılı',
        user: {
          id: user._id.toString(),
          name: user.name,
          lastname: user.lastname,
          email: user.email,
          role: user.role
        },
        token
      },
      { status: 200 }
    );
    
    // HttpOnly, Secure ve SameSite: 'strict' ile çerezi set et
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge:  24 * 60 * 60, // 24 saat
      path: '/',
    });
    
    return response;
  } catch (error) {
    return encryptedJson(
      { success: false, message: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
