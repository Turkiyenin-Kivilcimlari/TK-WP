import { connectToDatabase } from "@/lib/mongodb";
import User, { UserRole } from "@/models/User";
import Token, { TokenType } from "@/models/Token";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendVerificationEmail } from "@/lib/mail";
import { Types } from "mongoose";
import bcrypt from "bcrypt";
import { encryptedJson } from "@/lib/response";

// Kayıt isteği şeması
const registerSchema = z.object({
  name: z.string().min(2, "Ad en az 2 karakter olmalıdır"),
  lastname: z.string().min(2, "Soyad en az 2 karakter olmalıdır"),
  phone: z
    .union([
      z.string().length(0), // Empty string is allowed
      z.string().min(10, "Telefon numarası en az 10 karakter olmalıdır"),
    ])
    .optional(),
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  password: z.string().min(8, "Şifre en az 8 karakter olmalıdır").optional(),
  turnstileToken: z.string().optional(),
  allowEmails: z.boolean().default(true),
  title: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const {
      name,
      lastname,
      email,
      phone,
      password,
      allowEmails,
      title,
      turnstileToken,
    } = await req.json();

    // İstek verilerini doğrula
    try {
      registerSchema.parse({
        name,
        lastname,
        email,
        phone,
        password,
        allowEmails,
        title,
        turnstileToken,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return encryptedJson({ success: false }, { status: 400 });
      }
      throw error;
    }

    // E-posta adresi kullanımda mı kontrol et
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return encryptedJson(
        { success: false, message: "Bu e-posta adresi zaten kullanımda" },
        { status: 400 }
      );
    }

    // Yeni kullanıcı oluştur
    const user = new User({
      name,
      lastname,
      email,
      phone: phone || "",
      password,
      allowEmails: allowEmails !== undefined ? allowEmails : true,
      title: title || "", // Title alanını ekleyelim
      role: UserRole.MEMBER, // Varsayılan olarak üye rolü
      emailVerified: false, // E-posta henüz doğrulanmadı
    });

    await user.save();

    // Mongoose document olarak belirtelim
    const userDoc = user as unknown as { _id: Types.ObjectId } & typeof user;
    // Doğrulama token'ı oluştur
    const verificationToken = await Token.generateEmailVerificationToken(
      user._id as Types.ObjectId
    );

    // Kullanıcı kaydını başarılı olarak döndür, şifreyi hariç tut
    const userResponse = {
      id: userDoc._id.toString(),
      name: userDoc.name,
      lastname: userDoc.lastname,
      email: userDoc.email,
      phone: userDoc.phone,
      title: userDoc.title || "", // Title alanını ekleyelim
      role: userDoc.role,
      allowEmails: userDoc.allowEmails,
    };

    // E-posta doğrulama kodunu al
    const tokenDoc = await Token.findOne({
      token: verificationToken,
      userId: user._id,
      type: TokenType.VERIFY_EMAIL,
    });

    if (!tokenDoc) {
      return encryptedJson(
        { success: false, message: "Token oluşturma hatası" },
        { status: 500 }
      );
    }

    // OTP kodu üret
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 basamaklı kod

    // OTP kodunu hash'le ve tokena kaydet
    tokenDoc.otpHash = await bcrypt.hash(otpCode, 10);
    await tokenDoc.save();

    // E-posta gönder
    await sendVerificationEmail(email, { token: verificationToken, otpCode });

    return encryptedJson(
      {
        success: true,
        message: "Kayıt başarılı. Lütfen e-posta adresinizi doğrulayın.",
        user: userResponse,
        redirectUrl: `/verify-email?email=${encodeURIComponent(email)}`, // Doğrulama sayfasına yönlendirme URL'i
      },
      { status: 201 }
    );
  } catch (error) {
    return encryptedJson(
      { success: false, message: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
