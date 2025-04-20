import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Şema doğrulama
const checkEmailSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz')
});

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    
    // İstek gövdesini al ve doğrula
    const body = await req.json();
    
    try {
      checkEmailSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ success: false}, { status: 400 });
      }
      throw error;
    }
    
    const { email } = body;
    
    // Kullanıcıyı e-posta adresine göre bul
    const user = await User.findOne({ email });
    
    // Kullanıcı bulundu mu?
    return NextResponse.json({
      success: true,
      exists: !!user,
      requiresVerification: user && !user.emailVerified,
    });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
