import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Application from '@/models/Application';
import User from '@/models/User';
import { authenticateUser, checkAdminAuthWithTwoFactor } from '@/middleware/authMiddleware';
import { UserRole } from '@/models/User';
import { encryptedJson } from '@/lib/response';

export const dynamic = 'force-dynamic';

// Get all applications (admin only)
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
    
    // Get applications with user details
    const applications = await Application.find()
      .sort({ createdAt: -1 });
    
    // Get user information
    const userIds = applications.map(app => app.userId);
    const users = await User.find({ 
      _id: { $in: userIds } 
    }, { 
      _id: 1, name: 1, lastname: 1, email: 1, avatar: 1 
    }).lean();
    
    // Map user details to applications
    const applicationsWithUserDetails = applications.map(app => {
      const user = users.find(u => u._id && u._id.toString() === app.userId.toString());
      return {
        ...app.toObject(),
        user: user ? user : null
      };
    });
    
    return encryptedJson(
      { success: true, applications: applicationsWithUserDetails },
      { status: 200 }
    );
    
  } catch (error) {
    return encryptedJson(
      { success: false, message: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}
