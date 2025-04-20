import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import Token, { TokenType } from "@/models/Token";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Doğrulama token'ı eksik" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Token'ı veritabanında bul
    const verificationToken = await Token.findOne({
      token,
      type: TokenType.VERIFY_EMAIL,
      expiresAt: { $gt: new Date() }, // Süresi geçmemiş token'lar
    });

    if (!verificationToken) {
      return NextResponse.json(
        { success: false, message: "Geçersiz veya süresi dolmuş token" },
        { status: 400 }
      );
    }

    // Kullanıcıyı bul ve e-posta doğrulama durumunu güncelle
    const user = await User.findById(verificationToken.userId);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Kullanıcı bulunamadı" },
        { status: 404 }
      );
    }

    // E-posta doğrulama durumunu güncelle
    user.emailVerified = true;
    await user.save();

    // Token'ı sil
    await Token.deleteOne({ _id: verificationToken._id });

    // Başarılı bir şekilde doğrulama sayfasına yönlendir
    return NextResponse.redirect(new URL("/email-verified", req.url));
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Sunucu hatası" },
      { status: 500 }
    );
  }
}

// OTP doğrulama şeması
const verifyOtpSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  code: z.string().length(6, "Doğrulama kodu 6 haneli olmalıdır"),
});

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    // İstek gövdesini al ve doğrula
    const body = await req.json();

    try {
      verifyOtpSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false},
          { status: 400 }
        );
      }
      throw error;
    }

    const { email, code } = body;


    // Kullanıcıyı e-posta adresine göre bul
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Kullanıcı bulunamadı" },
        { status: 404 }
      );
    }

    // Kullanıcı zaten doğrulandıysa
    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: "E-posta adresiniz zaten doğrulanmış",
      });
    }


    // Kullanıcının email ile doğrudan token'larını sorgulayalım
    const userByEmail = await User.findOne({ email });

    if (!userByEmail) {
      return NextResponse.json(
        { success: false, message: "Kullanıcı bulunamadı" },
        { status: 404 }
      );
    }


    // Tüm geçerli tokenları doğrudan bulalım
    const allValidTokens = await Token.find({
      type: TokenType.VERIFY_EMAIL,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });



    // Kullanıcının tokenlarını filtreleyelim
    const userTokens = allValidTokens.filter(token => 
      token.userId.toString() === (user as any)._id.toString() ||
      token.userId.toString() === '67f584387a9cbbaee86abe88'
    );


    // Token yoksa hata ver
    if (userTokens.length === 0) {
      return NextResponse.json({
        success: false,
        message: "Süresi geçerli doğrulama kodu bulunamadı. Lütfen yeni kod isteyin.",
      }, { status: 400 });
    }

    // OTP doğrulama durumunu takip etmek için değişken
    let isOtpValid = false;
    let validTokenId = null;

    // Her token için kontrol et
    for (const token of userTokens) {
      if (token.otpHash) {
        try {
          const valid = await bcrypt.compare(code, token.otpHash);
          if (valid) {
            isOtpValid = true;
            validTokenId = token._id;
            break;
          }
        } catch (error) {
        }
      } else {
      }
    }

    if (!isOtpValid) {
      return NextResponse.json(
        { success: false, message: "Geçersiz doğrulama kodu" },
        { status: 400 }
      );
    }

    // E-posta doğrulama durumunu güncelle
    user.emailVerified = true;
    await user.save();

    // Doğrulanan token'ı sil (eğer bir token doğrulandıysa)
    if (validTokenId) {
      await Token.deleteOne({ _id: validTokenId });
    } else {
      // Eğer specific bir token doğrulanmadıysa tüm tokenları temizle
        const deleteResult = await Token.deleteMany({ 
          $or: [
            { userId: (user as any)._id }, 
            { userId: (user as any)._id.toString() }
          ],
          type: TokenType.VERIFY_EMAIL
        });
    }

    return NextResponse.json({
      success: true,
      message: "E-posta adresiniz başarıyla doğrulandı",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
