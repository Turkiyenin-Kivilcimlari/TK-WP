import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Application, { ApplicationStatus } from '@/models/Application';
import { authenticateUser, checkAdminAuthWithTwoFactor } from '@/middleware/authMiddleware';
import { UserRole } from '@/models/User';
import mongoose from 'mongoose';
import { encryptedJson } from '@/lib/response';

export const dynamic = 'force-dynamic';

// Update application status (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    const applicationId = params.id;
    
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return encryptedJson(
        { success: false, message: 'Geçersiz başvuru ID' },
        { status: 400 }
      );
    }
    
    const body = await req.json();
    const { status, adminNotes } = body;
    
    // Validate status
    if (!Object.values(ApplicationStatus).includes(status as ApplicationStatus)) {
      return encryptedJson(
        { success: false, message: 'Geçersiz durum değeri' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Find and update application
    const updatedApplication = await Application.findByIdAndUpdate(
      applicationId,
      { 
        status,
        ...(adminNotes !== undefined && { adminNotes }),
      },
      { new: true }
    );
    
    if (!updatedApplication) {
      return encryptedJson(
        { success: false, message: 'Başvuru bulunamadı' },
        { status: 404 }
      );
    }
    
    return encryptedJson(
      { 
        success: true, 
        message: 'Başvuru durumu güncellendi',
        application: updatedApplication 
      },
      { status: 200 }
    );
    
  } catch (error) {
    return encryptedJson(
      { success: false, message: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}

// Get specific application (admin only)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    const applicationId = params.id;
    
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return encryptedJson(
        { success: false, message: 'Geçersiz başvuru ID' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Find application
    const application = await Application.findById(applicationId);
    
    if (!application) {
      return encryptedJson(
        { success: false, message: 'Başvuru bulunamadı' },
        { status: 404 }
      );
    }
    
    return encryptedJson(
      { success: true, application },
      { status: 200 }
    );
    
  } catch (error) {
    return encryptedJson(
      { success: false, message: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}
