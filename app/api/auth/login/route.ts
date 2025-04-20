import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { Document } from 'mongoose';

// Define a type for user document
interface UserDocument extends Document {
  _id: any;
  name: string;
  lastname: string;
  email: string;
  password: string;
  role: string;
  emailVerified: boolean;
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
        return NextResponse.json(
          { success: false, message: 'Robot doğrulaması gerekli' },
          { status: 400 }
        );
      }
      
      // Cloudflare Turnstile doğrulaması
      const isVerified = await verifyCloudflareTurnstile(turnstileToken);
      if (!isVerified) {
        return NextResponse.json(
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
        return NextResponse.json({ success: false }, { status: 400 });
      }
      throw error;
    }
    
    // Kullanıcıyı e-posta adresine göre bul ve şifreyi seç
    const user = await User.findOne({ email }).select('+password') as UserDocument | null;
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Geçersiz e-posta veya şifre' },
        { status: 401 }
      );
    }
    
    // Şifre doğrulama
    const isPasswordMatch = await user.comparePassword(password);
    
    if (!isPasswordMatch) {
      return NextResponse.json(
        { success: false, message: 'Geçersiz e-posta veya şifre' },
        { status: 401 }
      );
    }
    
    // Yeni: E-posta doğrulanmadıysa girişe izin verme
    if (!user.emailVerified) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'E-posta adresinizi doğrulayın',
          redirectUrl: `/verify-email?email=${encodeURIComponent(email)}`
        },
        { status: 401 }
      );
    }
    
    // JWT token oluştur
    const token = user.getJwtToken();
    
    // Token'ı çerezle gönder
    const response = NextResponse.json(
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
    
    // HttpOnly çerez olarak token'ı ayarla
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // 'strict' yerine 'lax' yapıldı
      maxAge: 30 * 24 * 60 * 60, // 30 gün
      path: '/',
    });
    
    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
