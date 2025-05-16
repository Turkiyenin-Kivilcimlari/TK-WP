import { NextRequest } from 'next/server';
import { encryptedJson } from "@/lib/response";
import { UserRole } from "@/models/User";
import { connectToDatabase } from '@/lib/mongodb';
import { checkAdminAuthWithTwoFactor } from '@/middleware/authMiddleware';
import {CommunityTeamMember} from '@/models/CommunityTeam';
import mongoose from 'mongoose';

// Dinamik rota için yapılandırma
export const dynamic = 'force-dynamic';

// Belirli bir takım üyesini getirme
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin yetkisi doğrulama
    const adminCheck = await checkAdminAuthWithTwoFactor(req);

    // adminCheck null ise yetkilendirme başarılı, değilse hata yanıtıdır
    if (adminCheck) {
      return adminCheck; // Hata yanıtını doğrudan döndür
    }

    await connectToDatabase();
    
    // ID kontrol et
    const { id } = params;
    if (!id) {
      return encryptedJson(
        { success: false, message: "Üye ID'si eksik" },
        { status: 400 }
      );
    }

    // Takım üyesini bul
    const teamMember = await CommunityTeamMember.findById(id);
    if (!teamMember) {
      return encryptedJson(
        { success: false, message: "Takım üyesi bulunamadı" },
        { status: 404 }
      );
    }

    return encryptedJson({ success: true, teamMember });
  } catch (error) {
    console.error("Takım üyesi getirme hatası:", error);
    return encryptedJson(
      { success: false, message: "Takım üyesi getirilemedi" },
      { status: 500 }
    );
  }
}

// Takım üyesini güncelleme
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin yetkisi doğrulama - hata ayıklama için detaylı loglar ekleyelim
    console.log("Admin kimlik doğrulama başlıyor...");
    // Admin işlemi olduğu için 2FA kontrolü ekliyoruz
    const adminCheck = await checkAdminAuthWithTwoFactor(req);

    // adminCheck null ise yetkilendirme başarılı, değilse hata yanıtıdır
    if (adminCheck) {
      return adminCheck; // Hata yanıtını doğrudan döndür
    }

    await connectToDatabase();
    
    // ID kontrol et
    const { id } = params;
    if (!id) {
      return encryptedJson(
        { success: false, message: "Üye ID'si eksik" },
        { status: 400 }
      );
    }

    // MongoDB ObjectID formatı kontrolü
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return encryptedJson(
        { success: false, message: "Geçersiz ID formatı" },
        { status: 400 }
      );
    }

    // Gelen verileri al ve logla
    const body = await req.json();
    console.log("Gelen veriler:", body);
    
    // Güncellenecek ID'yi logla
    console.log("Güncellenecek üye ID:", id);
    
    // Önce belgenin var olup olmadığını kontrol et
    const existingMember = await CommunityTeamMember.findById(id);
    if (!existingMember) {
      console.log(`ID: ${id} ile eşleşen takım üyesi bulunamadı`);
      return encryptedJson(
        { success: false, message: "Takım üyesi bulunamadı" },
        { status: 404 }
      );
    }
    
    console.log("Mevcut üye bulundu:", existingMember._id);
    
    // Güncellenebilir alanları belirle
    const updateData = {
      title: body.title,
      university: body.university,
      photo: body.photo,
      universityLogo: body.universityLogo,
    };

    // Takım üyesini güncelle
    const updatedMember = await CommunityTeamMember.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true } // Güncellenmiş dokümanı döndür
    );

    if (!updatedMember) {
      console.log("Güncelleme işlemi başarısız, üye bulunamadı");
      return encryptedJson(
        { success: false, message: "Takım üyesi bulunamadı veya güncellenemedi" },
        { status: 404 }
      );
    }

    console.log("Üye başarıyla güncellendi:", updatedMember._id);
    return encryptedJson({
      success: true,
      message: "Takım üyesi başarıyla güncellendi",
      teamMember: updatedMember,
    });
  } catch (error) {
    console.error("Takım üyesi güncelleme hatası:", error);
    return encryptedJson(
      { success: false, message: "Takım üyesi güncellenemedi: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

// Takım üyesini silme
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin yetkisi doğrulama
    const adminCheck = await checkAdminAuthWithTwoFactor(req);

    // adminCheck null ise yetkilendirme başarılı, değilse hata yanıtıdır
    if (adminCheck) {
      return adminCheck; // Hata yanıtını doğrudan döndür
    }

    await connectToDatabase();
    
    // ID kontrol et
    const { id } = params;
    if (!id) {
      return encryptedJson(
        { success: false, message: "Üye ID'si eksik" },
        { status: 400 }
      );
    }

    // Takım üyesini sil
    const deletedMember = await CommunityTeamMember.findByIdAndDelete(id);
    if (!deletedMember) {
      return encryptedJson(
        { success: false, message: "Takım üyesi bulunamadı" },
        { status: 404 }
      );
    }

    return encryptedJson({
      success: true,
      message: "Takım üyesi başarıyla silindi",
    });
  } catch (error) {
    console.error("Takım üyesi silme hatası:", error);
    return encryptedJson(
      { success: false, message: "Takım üyesi silinemedi" },
      { status: 500 }
    );
  }
}
