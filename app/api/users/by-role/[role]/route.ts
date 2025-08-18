import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import { UserRole } from "@/models/User";
import { encryptedJson } from "@/lib/response";

// Rolü doğrula ve dönüştür
function validateRole(roleParam: string): UserRole | null {
  const validRoles = Object.values(UserRole);

  // Doğrudan eşleşme kontrolü
  if (validRoles.includes(roleParam as UserRole)) {
    return roleParam as UserRole;
  }

  // Büyük harf dönüşümü ile kontrol
  const upperRole = roleParam.toUpperCase();
  if (validRoles.includes(upperRole as UserRole)) {
    return upperRole as UserRole;
  }

  return null;
}

// Rolle göre kullanıcıları getir
export async function GET(
  request: NextRequest,
  { params }: { params: { role: string } }
) {
  try {
    const roleParam = params.role;
    const validRole = validateRole(roleParam);

    if (!validRole) {
      return encryptedJson(
        { error: "Geçersiz rol parametresi" },
        { status: 400 }
      );
    }

    // MongoDB veritabanına bağlan
    await connectToDatabase();

    // Veritabanından belirtilen role sahip kullanıcıları sorgula
    const users = await User.find({ role: validRole }).lean();

    // Kullanıcı verilerini düzenle
    const formattedUsers = users.map((user) => ({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      lastname: user.lastname,
      role: user.role,
    }));

    return encryptedJson(formattedUsers);
  } catch (error) {
    return encryptedJson(
      { error: "Kullanıcılar alınamadı" },
      { status: 500 }
    );
  }
}
