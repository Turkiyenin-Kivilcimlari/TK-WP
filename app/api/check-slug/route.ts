import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import { NextRequest } from "next/server";
import { encryptedJson } from "@/lib/response";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Document } from "mongodb";

interface UserDocument extends Document {
  _id: string | { toString(): string };
  slug: string;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");

    if (!slug) {
      return encryptedJson(
        { 
          success: false, 
          message: "Slug parametresi gereklidir" 
        },
        { status: 400 }
      );
    }

    // Slug'ı kullanan bir kullanıcı var mı kontrol et
    const user = await User.findOne({ slug }) as UserDocument | null;
    
    // Oturum açmış kullanıcının ID'sini al
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;
    
    // Kullanıcı yoksa veya kullanıcı kendisiyse slug müsait demektir
    const isTaken = user && (!currentUserId || user._id.toString() !== currentUserId);
    
    return encryptedJson({
      success: true,
      taken: !!isTaken,
      available: !isTaken,
      userId: user ? user._id.toString() : null
    });
    
  } catch (error) {
    return encryptedJson(
      { success: false, message: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
