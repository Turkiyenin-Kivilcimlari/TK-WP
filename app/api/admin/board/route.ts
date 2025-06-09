import { NextResponse } from "next/server";
import  Board  from "@/models/Board";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@/models/User";
import { encryptedJson } from "@/lib/response";
import {connectToDatabase} from "@/lib/mongodb";

// Board üyelerini listeleme
export async function GET() {
  try {
    // Admin yetkisi kontrol et
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPERADMIN)) {
      return encryptedJson({ success: false, error: "Yetkisiz erişim" }, { status: 403 });
    }

    await connectToDatabase();
    const boardMembers = await Board.find({}).sort({ createdAt: -1 });
    
    return encryptedJson({ success: true, boardMembers }, { status: 200 });
  } catch (error) {
    console.error("Board üyeleri alınırken hata:", error);
    return encryptedJson({ success: false, error: "İşlem başarısız" }, { status: 500 });
  }
}

// Yeni board üyesi ekleme
export async function POST(req: Request) {
  try {
    // Admin yetkisi kontrol et
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPERADMIN)) {
      return encryptedJson({ success: false, error: "Yetkisiz erişim" }, { status: 403 });
    }

    await connectToDatabase();
    
    const data = await req.json();
    
    // Gerekli alanları kontrol et
    if (!data.name || !data.designation || !data.quote || !data.src) {
      return encryptedJson({ 
        success: false, 
        error: "Tüm alanlar zorunludur (isim, ünvan, alıntı, fotoğraf URL)" 
      }, { status: 400 });
    }
    
    const newBoardMember = await Board.create({
      name: data.name,
      designation: data.designation,
      quote: data.quote,
      src: data.src
    });
    
    return encryptedJson({ 
      success: true, 
      message: "Board üyesi başarıyla eklendi", 
      boardMember: newBoardMember 
    }, { status: 201 });
    
  } catch (error) {
    console.error("Board üyesi eklenirken hata:", error);
    return encryptedJson({ success: false, error: "İşlem başarısız" }, { status: 500 });
  }
}
