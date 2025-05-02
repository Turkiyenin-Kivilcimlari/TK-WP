import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';
import Token, { TokenType } from '@/models/Token';
import { encryptedJson } from '@/lib/response';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await req.json();
    const { email, token } = body;
    
    if (!email || !token) {
      return encryptedJson(
        { success: false, message: 'Eksik parametreler' },
        { status: 400 }
      );
    }
    
    // İlk önce token geçerli mi kontrol et
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
    
    // Kullanıcıyı bul
    const user = await User.findOne({ email });
    
    if (!user) {
      return encryptedJson(
        { success: false, message: 'Kullanıcı bulunamadı' },
        { status: 404 }
      );
    }
    
    // Kullanıcının 2FA durumunu döndür
    return encryptedJson({
      success: true,
      requires2FA: user.twoFactorEnabled || false
    });
    
  } catch (error) {
    return encryptedJson(
      { success: false, message: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
