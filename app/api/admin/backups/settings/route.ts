export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@/models/User";
import { getBackupSettings, saveBackupSettings } from "@/lib/backup/backupPermissions";
import { checkAdminAuthWithTwoFactor } from "@/middleware/authMiddleware";
import { encryptedJson } from "@/lib/response";

// Get backup settings
export async function GET(req: NextRequest) {
  try {
    // Oturum kontrolü
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPERADMIN)) {
      return encryptedJson({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    // Admin yetkisi kontrolü
    const authResponse = await checkAdminAuthWithTwoFactor(req);
    if (authResponse) return authResponse;

    // Ayarları getir
    const settings = await getBackupSettings();

    return encryptedJson({
      success: true,
      settings
    });
  } catch (error: any) {
    return encryptedJson(
      { error: "Ayarlar getirelemedi.", success: false },
      { status: 500 }
    );
  }
}

// Update backup settings
export async function PUT(req: NextRequest) {
  try {
    // Oturum kontrolü
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPERADMIN)) {
      return encryptedJson({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    // Admin yetkisi kontrolü
    const authResponse = await checkAdminAuthWithTwoFactor(req);
    if (authResponse) return authResponse;

    // İstek gövdesini al
    const settings = await req.json();

    // Ayarları kaydet
    await saveBackupSettings(settings);

    return encryptedJson({
      success: true,
      message: "Ayarlar başarıyla kaydedildi"
    });
  } catch (error: any) {
    return encryptedJson(
      { error: "Ayarlarda hata oluştu", success: false },
      { status: 500 }
    );
  }
}
