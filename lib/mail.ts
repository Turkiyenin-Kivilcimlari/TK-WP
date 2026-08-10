import nodemailer from "nodemailer";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://turkiyeninkivilcimlari.com";
const BRAND = "Türkiye'nin Kıvılcımları";
const FROM_EMAIL = process.env.MAIL_EMAIL || "info@turkiyeninkivilcimlari.com";
const BRAND_COLOR = "#b91c1c";

// SMTP yapılandırması .env'den okunur
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: process.env.SECURE_CONNECTITON_TYPE === "SSL/TLS",
  auth: {
    user: process.env.MAIL_EMAIL,
    pass: process.env.MAIL_PASSWORD,
  },
});

// Tüm e-postalar için markalı, e-posta istemcisi uyumlu (table + inline CSS)
// tam HTML dokümanı. Doğru yapı hem profesyonel görünüm hem de spam skoru için
// (bare <div> fragment yerine tam belge) önemlidir.
function layout(opts: {
  title: string;
  preheader?: string;
  bodyHtml: string;
}): string {
  const { title, preheader = "", bodyHtml } = opts;
  const year = new Date().getFullYear();
  const host = BASE_URL.replace(/^https?:\/\//, "");
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light only">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f4f4f5;">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e5e5;">
        <tr><td style="background:${BRAND_COLOR};padding:20px 32px;">
          <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.01em;">${BRAND}</span>
        </td></tr>
        <tr><td style="padding:32px;">
${bodyHtml}
        </td></tr>
        <tr><td style="padding:20px 32px;background:#fafafa;border-top:1px solid #eeeeee;">
          <p style="margin:0;font-size:12px;color:#888888;line-height:1.6;">
            Bu e-posta ${BRAND} tarafından gönderilmiştir.<br>
            <a href="${BASE_URL}" style="color:${BRAND_COLOR};text-decoration:none;">${host}</a> &nbsp;·&nbsp; ${year}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// HTML'den basit düz metin üretir (text/plain alternatifi için son çare)
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string; // düz metin alternatifi (multipart) — verilmezse HTML'den üretilir
  from?: string;
  replyTo?: string;
}

// E-posta gönderme fonksiyonu (her zaman multipart: text + html)
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const { to, subject, html, text, from = FROM_EMAIL, replyTo } = options;

  try {
    await transporter.sendMail({
      from: `${BRAND} <${from}>`,
      to,
      subject,
      html,
      text: text || htmlToText(html),
      replyTo: replyTo || undefined,
    });

    return true;
  } catch (error) {
    return false;
  }
}

// Şifre sıfırlama e-postası gönder
export async function sendPasswordResetEmail(
  to: string,
  resetToken: string
): Promise<boolean> {
  const resetUrl = `${BASE_URL}/reset-password/${resetToken}`;

  const bodyHtml = `
          <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111111;">Şifre Sıfırlama İsteği</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333333;">Merhaba,</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#333333;">Hesabınız için bir şifre sıfırlama talebinde bulundunuz. Aşağıdaki düğmeye tıklayarak yeni şifrenizi belirleyebilirsiniz:</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td style="border-radius:8px;background:${BRAND_COLOR};">
              <a href="${resetUrl}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:8px;">Şifremi Sıfırla</a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#666666;">Düğme çalışmazsa bu bağlantıyı tarayıcınıza yapıştırın:<br><a href="${resetUrl}" style="color:${BRAND_COLOR};word-break:break-all;">${resetUrl}</a></p>
          <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#666666;">Bu bağlantı 5 dakika sonra geçerliliğini yitirecektir. Eğer iki faktörlü kimlik doğrulamanız (2FA) etkinse, sıfırlama sırasında uygulamanızdaki kod istenecektir. Bu isteği siz yapmadıysanız bu e-postayı dikkate almayın.</p>`;

  const text = `Şifre Sıfırlama İsteği

Merhaba,

Hesabınız için bir şifre sıfırlama talebinde bulundunuz. Aşağıdaki bağlantıdan yeni şifrenizi belirleyebilirsiniz (bağlantı 5 dakika geçerlidir):

${resetUrl}

Bu isteği siz yapmadıysanız bu e-postayı dikkate almayın.

— ${BRAND}`;

  return sendEmail({
    to,
    subject: "Şifre sıfırlama isteğiniz",
    html: layout({
      title: "Şifre Sıfırlama",
      preheader: "Şifrenizi sıfırlamak için talebiniz alındı.",
      bodyHtml,
    }),
    text,
  });
}

// E-posta doğrulama postası gönder
export async function sendVerificationEmail(
  to: string,
  verificationData: { token: string; otpCode: string }
): Promise<boolean> {
  if (!verificationData || typeof verificationData !== "object") {
    return false;
  }
  if (!verificationData.token || !verificationData.otpCode) {
    return false;
  }

  const verifyUrl = `${BASE_URL}/verify-email/${verificationData.token}`;
  const otp = verificationData.otpCode;

  const bodyHtml = `
          <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111111;">E-posta adresinizi doğrulayın</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333333;">Merhaba,</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#333333;">${BRAND} hesabınızı etkinleştirmek için aşağıdaki doğrulama kodunu kullanın:</p>
          <div style="text-align:center;margin:0 0 24px;">
            <span style="display:inline-block;font-size:30px;font-weight:700;letter-spacing:8px;color:${BRAND_COLOR};background:#fef2f2;padding:14px 24px;border-radius:10px;">${otp}</span>
          </div>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#333333;">Alternatif olarak aşağıdaki düğmeyle doğrulama sayfasına gidebilirsiniz:</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td style="border-radius:8px;background:${BRAND_COLOR};">
              <a href="${verifyUrl}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:8px;">Doğrulama Sayfasına Git</a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#666666;">Bu işlemi siz talep etmediyseniz bu e-postayı dikkate almayın.</p>`;

  const text = `E-posta adresinizi doğrulayın

Merhaba,

${BRAND} hesabınızı etkinleştirmek için doğrulama kodunuz: ${otp}

Alternatif olarak doğrulama sayfasına gidebilirsiniz:
${verifyUrl}

Bu işlemi siz talep etmediyseniz bu e-postayı dikkate almayın.

— ${BRAND}`;

  return sendEmail({
    to,
    subject: "E-posta adresinizi doğrulayın",
    html: layout({
      title: "E-posta Doğrulama",
      preheader: `Doğrulama kodunuz: ${otp}`,
      bodyHtml,
    }),
    text,
  });
}
