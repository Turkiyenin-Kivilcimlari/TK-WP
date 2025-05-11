import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { CommunityTeamMember } from "@/models/CommunityTeam";
import { encryptedJson } from "@/lib/response";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Tüm ekip üyelerini halka açık olarak getir
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    
    // Ekip üyelerini getir, sıralama üniversite ismine göre
    const teamMembers = await CommunityTeamMember.find({})
      .sort({ university: 1 })
      .lean();
    
    // Ekip üyelerini döndür
    return encryptedJson({
      success: true,
      team: teamMembers
    });
    
  } catch (error: any) {
    return encryptedJson(
      { success: false, message: 'Bir hata oluştu', error: error.message },
      { status: 500 }
    );
  }
}
