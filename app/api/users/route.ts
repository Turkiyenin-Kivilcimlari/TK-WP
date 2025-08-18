import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@/models/User";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import { encryptedJson } from "@/lib/response";

// Yetki kontrolü yap
async function checkPermission() {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== UserRole.SUPERADMIN &&
      session.user.role !== UserRole.ADMIN)
  ) {
    return false;
  }
  return true;
}

// Tüm kullanıcıları getir
export async function GET(request: NextRequest) {
  try {
    const hasPermission = await checkPermission();
    if (!hasPermission) {
      return new NextResponse(JSON.stringify({ error: "Yetkisiz erişim" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    await connectToDatabase();

    // URL parametrelerini al
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";

    const skip = (page - 1) * limit;

    // Sorgu filtresi oluştur
    let filter: any = {};

    // Arama filtresi
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { lastname: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Rol filtresi
    if (role && Object.values(UserRole).includes(role as UserRole)) {
      filter.role = role;
    }

    // Toplam kullanıcı sayısını al
    const total = await User.countDocuments(filter);

    // Kullanıcıları getir (hassas alanları hariç tut)
    const users = await User.find(filter)
      .select(
        "-password -twoFactorSecret -resetToken -resetTokenExpiry -verificationToken -verificationExpiry"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Toplam sayfa sayısını hesapla
    const pages = Math.ceil(total / limit);

    return encryptedJson({
      success: true,
      count: users.length,
      total,
      page,
      pages,
      users: users.map((user) => ({
        ...user,
        id: user._id.toString(),
      })),
    });
  } catch (error) {
    return encryptedJson(
      { error: "Kullanıcı verileri alınamadı" },
      { status: 500 }
    );
  }
}

// Kullanıcı oluştur
export async function POST(request: NextRequest) {
  try {
    const hasPermission = await checkPermission();
    if (!hasPermission) {
      return new NextResponse(JSON.stringify({ error: "Yetkisiz erişim" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    await connectToDatabase();

    const userData = await request.json();
    const { name, lastname, email, role, phone, avatar } = userData;

    // E-posta adresi kullanımda mı kontrol et
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return encryptedJson(
        { error: "Bu e-posta adresi zaten kullanımda" },
        { status: 400 }
      );
    }

    // Yeni kullanıcı oluştur
    const user = new User({
      name,
      lastname,
      email,
      phone: phone || "",
      role: role || UserRole.MEMBER,
      avatar: avatar || "",
      emailVerified: true, // Admin tarafından oluşturulan kullanıcılar otomatik doğrulanmış
      password: "temp123456", // Geçici şifre - kullanıcı şifre sıfırlama yapmalı
    });

    await user.save();

    // Hassas alanları hariç tutarak döndür
    const userResponse = {
      id: user.id.toString(),
      name: user.name,
      lastname: user.lastname,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };

    return encryptedJson({
      success: true,
      message: "Kullanıcı başarıyla oluşturuldu",
      user: userResponse,
    });
  } catch (error) {
    return encryptedJson(
      { error: "Kullanıcı oluşturulamadı" },
      { status: 500 }
    );
  }
}
