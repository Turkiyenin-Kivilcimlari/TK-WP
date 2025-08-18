import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import {CommunityTeamMember} from '@/models/CommunityTeam';
import { encryptedJson } from '@/lib/response';

export const dynamic = 'force-dynamic';

// Topluluk takım üyelerini getir (public API - herkes erişebilir)
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    
    // Tüm takım üyelerini getir ve üniversite adına göre sırala
    const members = await CommunityTeamMember.find({}).sort({ university: 1 });
    
    return encryptedJson({
      success: true,
      members
    });
  } catch (error) {
    return encryptedJson(
      { success: false, message: 'Takım üyeleri yüklenirken bir hata oluştu' },
      { status: 500 }
    );
  }
}
