import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { encryptedJson } from '@/lib/response';
import Supporter from '@/models/Supporter';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Get all supporters (public API - accessible to everyone)
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    
    // Get all supporters and sort by order field
    const supporters = await Supporter.find({}).sort({ order: 1 });
    
    return encryptedJson({
      success: true,
      supporters
    });
  } catch (error) {
    console.error("Supporters API error:", error);
    return encryptedJson(
      { success: false, message: 'Destekçiler yüklenirken bir hata oluştu' },
      { status: 500 }
    );
  }
}
