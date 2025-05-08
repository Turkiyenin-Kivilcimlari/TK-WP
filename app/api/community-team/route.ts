import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import  { CommunityTeam,TeamCategory } from "@/models/CommunityTeam";
import { encryptedJson } from "@/lib/response";

    interface TeamMember {
      category: TeamCategory;
      order: number;
      [key: string]: any; // For other properties that might exist in the document
    }

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Tüm ekip üyelerini halka açık olarak getir
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    
    // Kategori bazında gruplandırılmış ekip üyelerini getir
    const teams = await CommunityTeam.find({})
      .sort({ category: 1, order: 1 })
      .lean();
    
    // Kategorilere göre grupla
    const teamsByCategory: Record<string, any[]> = {};
    
    Object.values(TeamCategory).forEach(category => {
      teamsByCategory[category] = [];
    });
    
    
    
    // Type assertion for teams array
    (teams as unknown as TeamMember[]).forEach(member => {
      if (teamsByCategory[member.category]) {
      teamsByCategory[member.category].push(member);
      }
    });
    
    // Kategori isimlerini Türkçe'ye çevir
    const categoryLabels: Record<string, string> = {
      [TeamCategory.ORGANIZATIONAL_DEVELOPMENT]: "Organizasyonel Gelişim Ekibi",
      [TeamCategory.COMMUNITY_MANAGERS]: "Topluluk Yöneticileri",
      [TeamCategory.SOCIAL_MEDIA]: "Sosyal Medya & Tanıtım Ekibi",
      [TeamCategory.WEBSITE_DEVELOPMENT]: "Website Geliştirme Ekibi",
      [TeamCategory.CONTENT]: "İçerik Ekibi"
    };
    
    // Kategori isimlerini ve ekip üyelerini döndür
    return encryptedJson({
      success: true,
      teams: teamsByCategory,
      categories: Object.keys(teamsByCategory).map(key => ({
        id: key,
        name: categoryLabels[key] || key
      })),
      categoryLabels
    });
    
  } catch (error: any) {
    return encryptedJson(
      { success: false, message: 'Bir hata oluştu', error: error.message },
      { status: 500 }
    );
  }
}
