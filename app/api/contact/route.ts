import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendEmail } from '@/lib/mail';

// Form verilerini doğrulamak için schema
const contactFormSchema = z.object({
  name: z.string().min(3, 'İsim en az 3 karakter olmalıdır'),
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  subject: z.string().min(5, 'Konu en az 5 karakter olmalıdır'),
  message: z.string().min(10, 'Mesaj en az 10 karakter olmalıdır')
});

export async function POST(req: NextRequest) {
  try {
    // İstek gövdesinden verileri al
    const body = await req.json();
    
    // Verileri doğrula
    try {
      contactFormSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ success: false}, { status: 400 });
      }
      throw error;
    }
    
    const { name, email, subject, message } = body;
    
    // HTML içeriği oluştur
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">İletişim Formu Mesajı</h2>
        <p><strong>Gönderen:</strong> ${name}</p>
        <p><strong>E-posta:</strong> ${email}</p>
        <p><strong>Konu:</strong> ${subject}</p>
        <div style="margin-top: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
          <p><strong>Mesaj:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
        </div>
      </div>
    `;
    
    // E-posta gönder
    const emailSent = await sendEmail({
      to: 'contact@turkiyeninkivilcimlari.com',
      subject: `İletişim Formu: ${subject}`,
      html,
      replyTo: email // Yanıtların doğrudan form gönderenin adresine gitmesi için
    });
    
    if (!emailSent) {
      return NextResponse.json(
        { success: false, message: 'E-posta gönderilemedi, lütfen daha sonra tekrar deneyin' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Mesajınız başarıyla gönderildi'
    });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
