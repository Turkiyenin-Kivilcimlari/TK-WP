import { NextResponse } from "next/server";
import  Board  from "@/models/Board";
import dbConnect from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@/models/User";
import { encryptedJson } from "@/lib/response";

// Board üyesi güncelleme
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    // Admin yetkisi kontrol et
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPERADMIN)) {
      return encryptedJson({ success: false, error: "Yetkisiz erişim" }, { status: 403 });
    }

    const { id } = params;
    await dbConnect();
    
    const data = await req.json();
    
    // Güncellenecek alanları kontrol et
    const updateData: Record<string, any> = {};
    if (data.name) updateData.name = data.name;
    if (data.designation) updateData.designation = data.designation;
    if (data.quote) updateData.quote = data.quote;
    if (data.src) updateData.src = data.src;
    
    // Boş güncelleme isteğini kontrol et
    if (Object.keys(updateData).length === 0) {
      return encryptedJson({ success: false, error: "Güncellenecek alan bulunamadı" }, { status: 400 });
    }
    
    const updatedBoardMember = await Board.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedBoardMember) {
      return encryptedJson({ success: false, error: "Board üyesi bulunamadı" }, { status: 404 });
    }
    
    return encryptedJson({ 
      success: true, 
      message: "Board üyesi başarıyla güncellendi", 
      boardMember: updatedBoardMember 
    }, { status: 200 });
    
  } catch (error) {
    console.error("Board üyesi güncellenirken hata:", error);
    return encryptedJson({ success: false, error: "İşlem başarısız" }, { status: 500 });
  }
}

// Board üyesi silme
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    // Admin yetkisi kontrol et
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPERADMIN)) {
      return encryptedJson({ success: false, error: "Yetkisiz erişim" }, { status: 403 });
    }

    const { id } = params;
    await dbConnect();
    
    const deletedBoardMember = await Board.findByIdAndDelete(id);
    
    if (!deletedBoardMember) {
      return encryptedJson({ success: false, error: "Board üyesi bulunamadı" }, { status: 404 });
    }
    
    return encryptedJson({ 
      success: true, 
      message: "Board üyesi başarıyla silindi"
    }, { status: 200 });
    
  } catch (error) {
    console.error("Board üyesi silinirken hata:", error);
    return encryptedJson({ success: false, error: "İşlem başarısız" }, { status: 500 });
  }
}
