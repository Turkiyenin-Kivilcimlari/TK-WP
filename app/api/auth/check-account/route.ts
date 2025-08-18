import { connectToDatabase } from '@/lib/mongodb';
import { encryptedJson } from '@/lib/response';
import User from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Şema doğrulama
const checkAccountSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz')
});

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    
    // İstek gövdesini al ve doğrula
    const body = await req.json();
    
    try {
      checkAccountSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return encryptedJson({ success: false}, { status: 400 });
      }
      throw error;
    }
    
    const { email } = body;
    
    // Kullanıcıyı e-posta adresine göre bul
    const user = await User.findOne({ email });
    
    // Güvenlik için, kullanıcı bulunamasa bile kısıtlı bilgi ver
    if (!user) {
      return encryptedJson({
        success: true,
        has2FA: false
      });
    }
    
    // Kullanıcının 2FA durumu
    return encryptedJson({
      success: true,
      has2FA: user.twoFactorEnabled || false,
      email: email
    });
    
  } catch (error) {
    return encryptedJson(
      { success: false, message: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
