import nodemailer from 'nodemailer';

// SMTP yapılandırması için .env.local dosyasındaki bilgileri kullanıyoruz
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: process.env.SECURE_CONNECTITON_TYPE === 'SSL/TLS',
  auth: {
    user: process.env.MAIL_EMAIL,
    pass: process.env.MAIL_PASSWORD,
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string; // Yanıt adresi için ekleme yapıyoruz
}

// E-posta gönderme fonksiyonu
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const { to, subject, html, from = process.env.MAIL_EMAIL, replyTo } = options;

  try {
    const info = await transporter.sendMail({
      from: `Türkiye'nin Kıvılcımları <${from}>`,
      to,
      subject,
      html,
      replyTo: replyTo || undefined, // Yanıt adresi varsa ekle
    });

    return true;
  } catch (error) {
    console.error('E-posta gönderim hatası:', error);
    return false;
  }
}

// Şifre sıfırlama e-postası gönder
export async function sendPasswordResetEmail(to: string, resetToken: string): Promise<boolean> {
  // Şifre sıfırlama URL'ini oluştur
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password/${resetToken}`;
  
  // E-posta HTML içeriği
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>Şifre Sıfırlama İsteği</h2>
      <p>Merhaba,</p>
      <p>Hesabınız için bir şifre sıfırlama talebinde bulundunuz. Aşağıdaki bağlantıya tıklayarak şifrenizi sıfırlayabilirsiniz:</p>
      
      <div style="margin: 20px 0; text-align: center;">
        <a href="${resetUrl}" style="background-color: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Şifremi Sıfırla</a>
      </div>
      
      <p>Eğer iki faktörlü kimlik doğrulamanız (2FA) etkinse, şifre sıfırlama sırasında mobil kimlik doğrulama uygulamanızdaki kodu girmeniz istenecektir.</p>
      
      <p>Bu bağlantı 5 dakika sonra geçerliliğini yitirecektir.</p>
      <p>Eğer bu isteği siz yapmadıysanız, lütfen bu e-postayı görmezden gelin.</p>
      <p>Saygılarımızla,<br>Türkiye'nin Kıvılcımları Ekibi</p>
    </div>
  `;

  return sendEmail({
    to,
    subject: 'Şifre Sıfırlama İsteği',
    html,
  });
}

// E-posta doğrulama postası gönder
export async function sendVerificationEmail(to: string, verificationData: { token: string, otpCode: string }): Promise<boolean> {
  if (!verificationData || typeof verificationData !== 'object') {
    return false;
  }
  if (!verificationData.token || !verificationData.otpCode) {
    return false;
  }
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-email/${verificationData.token}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333; text-align: center;">E-posta Adresinizi Doğrulayın</h2>
      <p>Merhaba,</p>
      <p>Hesabınızı doğrulamak için aşağıdaki doğrulama kodunu kullanabilirsiniz:</p>
      <div style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0;">
        <strong>${verificationData.otpCode}</strong>
      </div>
      <p>Bu işlemi siz talep etmediyseniz, lütfen bu e-postayı dikkate almayınız.</p>
      <p>Saygılarımızla,<br>Türkiye'nin Kıvılcımları Ekibi</p>
    </div>
  `;

  return sendEmail({
    to,
    subject: "E-posta Adresinizi Doğrulayın",
    html
  });
}
