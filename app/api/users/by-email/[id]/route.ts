import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import { UserRole } from "@/models/User";
import { encryptedJson } from "@/lib/response";

// E-posta adresine göre kullanıcıları getir
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const email = decodeURIComponent(params.id); // URL-encoded e-postayı çöz

    // MongoDB veritabanına bağlan
    await connectToDatabase();

    // Veritabanından kullanıcıyı sorgu yap
    const user = await User.findOne({ email: email }).lean();

    if (!user) {
      return encryptedJson(
        { error: "Kullanıcı bulunamadı" },
        { status: 404 }
      );
    }

    // Kullanıcı verisini düzenle
    const userData = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      lastname: user.lastname,
      role: user.role,
    };

    return encryptedJson(userData);
  } catch (error) {
    return encryptedJson(
      { error: "Kullanıcı bilgisi alınamadı" },
      { status: 500 }
    );
  }
}
