export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import User from "@/models/User";
import {connectToDatabase} from "@/lib/mongodb";
import { checkAdminAuthWithTwoFactor } from "@/middleware/authMiddleware";

// Kullanıcının yedekleme izinlerini güncelle
export async function PUT(req: NextRequest) {
  try {
    // Oturum kontrolü
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim. Bu işlem sadece süper yöneticiler tarafından yapılabilir." }, { status: 403 });
    }

     // Yetkilendirme kontrolü - 2FA dahil admin yetkisi kontrolü
    const authResponse = await checkAdminAuthWithTwoFactor(req);
    if (authResponse) return authResponse;

    // Veritabanı bağlantısı
    await connectToDatabase();

    // İstek gövdesini al
    const { userId, permissions } = await req.json();

    if (!userId) {
      return NextResponse.json({ 
        success: false,
        error: "Kullanıcı ID'si gereklidir." 
      }, { status: 400 });
    }

    // Kullanıcıyı bul
    const user = await User.findById(userId);
    
    if (!user) {
      return NextResponse.json({ 
        success: false,
        error: "Kullanıcı bulunamadı." 
      }, { status: 404 });
    }

    // İzinleri güncelle
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          'backupPermissions': {
            canView: permissions.canView === true,
            canManage: permissions.canManage === true,
            canDownload: permissions.canDownload === true
          }
        }
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: "Kullanıcı yedekleme izinleri güncellendi.",
      user: {
        id: updatedUser?._id,
        name: updatedUser?.name,
        lastname: updatedUser?.lastname,
        backupPermissions: updatedUser?.backupPermissions
      }
    });
  } catch (error: any) {
    console.error("Backup permissions update error:", error);
    return NextResponse.json(
      { error: error.message, success: false },
      { status: 500 }
    );
  }
}

// Kullanıcının yedekleme izinlerini getir
export async function GET(req: NextRequest) {
  try {
    // Oturum kontrolü
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim. Bu işlem sadece süper yöneticiler tarafından yapılabilir." }, { status: 403 });
    }

    // URL parametrelerini al
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ 
        success: false,
        error: "Kullanıcı ID'si gereklidir." 
      }, { status: 400 });
    }

    // Veritabanı bağlantısı
    await connectToDatabase();

    // Kullanıcıyı bul
    const user = await User.findById(userId).select('_id name lastname backupPermissions');
    
    if (!user) {
      return NextResponse.json({ 
        success: false,
        error: "Kullanıcı bulunamadı." 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        lastname: user.lastname,
        backupPermissions: user.backupPermissions || {
          canView: false,
          canManage: false,
          canDownload: false
        }
      }
    });
  } catch (error: any) {
    console.error("Backup permissions retrieval error:", error);
    return NextResponse.json(
      { error: error.message, success: false },
      { status: 500 }
    );
  }
}
