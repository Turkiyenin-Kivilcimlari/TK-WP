import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { encryptedJson } from '@/lib/response';
import { authenticateUser, checkAdminAuthWithTwoFactor } from '@/middleware/authMiddleware';
import { UserRole } from '@/models/User';
import Supporter from '@/models/Supporter';

// Dynamic rendering
export const dynamic = 'force-dynamic';

// Reorder supporters
export async function POST(req: NextRequest) {
  try {
    // Admin authentication check with 2FA
    const adminCheck = await checkAdminAuthWithTwoFactor(req);
    if (adminCheck) return adminCheck;
    
    // Regular token check
    const token = await authenticateUser(req);
    if (!token) {
      return encryptedJson(
        { success: false, message: 'Giriş yapmalısınız' },
        { status: 401 }
      );
    }
    
    // Admin role check
    if (token.role !== UserRole.ADMIN && token.role !== UserRole.SUPERADMIN) {
      return encryptedJson(
        { success: false, message: 'Bu işlem için admin yetkisi gereklidir' },
        { status: 403 }
      );
    }

    // Get reordering data from request body
    const body = await req.json();
    const { items } = body;
    
    if (!items || !Array.isArray(items)) {
      return encryptedJson(
        { success: false, message: 'Geçersiz sıralama verileri' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    
    // Update each supporter's order
    const updatePromises = items.map((item) => {
      return Supporter.findByIdAndUpdate(
        item.id,
        { $set: { order: item.order } }
      );
    });
    
    await Promise.all(updatePromises);
    
    return encryptedJson({
      success: true,
      message: 'Sıralama başarıyla güncellendi'
    });
    
  } catch (error) {
    return encryptedJson(
      { success: false, message: 'Sıralama güncellenemedi' },
      { status: 500 }
    );
  }
}
