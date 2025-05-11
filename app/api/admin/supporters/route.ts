import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { encryptedJson } from '@/lib/response';
import { authenticateUser, checkAdminAuthWithTwoFactor } from '@/middleware/authMiddleware';
import { UserRole } from '@/models/User';
import Supporter from '@/models/Supporter';

// Dynamic rendering
export const dynamic = 'force-dynamic';

// Get all supporters (admin only)
export async function GET(req: NextRequest) {
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

    await connectToDatabase();
    
    // Get all supporters
    const supporters = await Supporter.find({}).sort({ order: 1 });
    
    return encryptedJson({
      success: true,
      supporters
    });
  } catch (error) {
    return encryptedJson(
      { success: false, message: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}

// Add new supporter (admin only)
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

    const { name, title, photo } = await req.json();
    
    if (!name || !title) {
      return encryptedJson(
        { success: false, message: 'İsim ve ünvan alanları zorunludur' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    
    // Find the current total number of supporters for ordering
    const totalSupporters = await Supporter.countDocuments({});
    
    // Create new supporter with automatic ordering
    const newSupporter = new Supporter({
      name,
      title,
      photo,
      order: totalSupporters + 1
    });
    
    await newSupporter.save();
    
    return encryptedJson({
      success: true,
      supporter: newSupporter
    });
    
  } catch (error) {
    return encryptedJson(
      { success: false, message: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}
