import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/middleware/authMiddleware";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import * as QRCode from 'qrcode';
import crypto from 'crypto';
import base32 from 'hi-base32';

export async function POST(req: NextRequest) {
  try {
    // Kimlik doğrulama kontrolü
    const token = await authenticateUser(req);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Giriş yapmalısınız' },
        { status: 401 }
      );
    }

    const userId = token.id;
    await connectToDatabase();
    
    // Kullanıcıyı twoFactorSecret değerini de içerecek şekilde al
    const user = await User.findById(userId).select('+twoFactorSecret');
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Kullanıcı bulunamadı' },
        { status: 404 }
      );
    }

    try {
      // speakeasy kullanmak yerine doğrudan kendi güvenli rastgele secret oluşturma fonksiyonumuzu yazalım
      // 20 byte (160 bit) güvenli rastgele veri oluştur
      const secretBuffer = crypto.randomBytes(20);
      // Bunu base32 koduna çevir (kimlik doğrulayıcı uygulamaları base32 kullanır)
      const secretBase32 = base32.encode(secretBuffer).replace(/=/g, '');
      
      // Kullanıcıya kaydet
      user.twoFactorSecret = secretBase32;
      await user.save();
      
      // QR kodu oluştur - otpauth URL'i manuel oluştur
      const appName = encodeURIComponent("Türkiye'nin Kıvılcımları");
      const userEmail = encodeURIComponent(user.email);
      const otpauthUrl = `otpauth://totp/${appName}:${userEmail}?secret=${secretBase32}&issuer=${appName}&algorithm=SHA1&digits=6&period=30`;
      
      const qrCode = await QRCode.toDataURL(otpauthUrl);
      
      return NextResponse.json({
        success: true,
        data: {
          qrCode,
          secret: secretBase32
        }
      });
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'QR kod oluşturma hatası' },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
