import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Event from '@/models/Event';
import { authenticateUser } from '@/middleware/authMiddleware';
import { UserRole } from '@/models/User';
import { checkAdminAuthWithTwoFactor } from '@/middleware/authMiddleware';
import { encryptedJson } from '@/lib/response';

export const dynamic = 'force-dynamic';

// Admin etkinlikleri listeleme
export async function GET(req: NextRequest) {
  try {
    // Admin işlemi olduğu için 2FA kontrolü
    const adminCheck = await checkAdminAuthWithTwoFactor(req);
    if (adminCheck) return adminCheck;
    
    // Normal token kontrolünü de yapalım
    const token = await authenticateUser(req);
    if (!token) {
      return encryptedJson(
        { success: false, message: 'Giriş yapmalısınız' },
        { status: 401 }
      );
    }
    
    // Admin yetkisi kontrolü
    if (token.role !== UserRole.ADMIN && token.role !== UserRole.SUPERADMIN) {
      return encryptedJson(
        { success: false, message: 'Bu işlem için admin yetkisi gereklidir' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    await connectToDatabase();
    
    // Query parametreleri
    const query: any = {};
    if (status) {
      query.status = status;
    }
    
    // Etkinlikleri getir
    const events = await Event.find(query)
      .sort({ createdAt: -1 })
      .populate('author', 'name lastname avatar')
      .skip(skip)
      .limit(limit);
      
    const total = await Event.countDocuments(query);
    
    return encryptedJson({
      success: true,
      events,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error: any) {
    return encryptedJson(
      { success: false, message: 'Bir hata oluştu'},
      { status: 500 }
    );
  }
}
