import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Application from '@/models/Application';
import { authenticateUser } from '@/middleware/authMiddleware';
import { encryptedJson } from '@/lib/response';
import mongoose from 'mongoose';
import { UserRole } from '@/models/User';

// API route for admins to update application status
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = await authenticateUser(req);
    
    if (!token || typeof token === 'string') {
      return encryptedJson(
        { success: false, message: 'Giriş yapmalısınız' },
        { status: 401 }
      );
    }
    
    // Admin role check
    if (token.role !== UserRole.ADMIN && token.role !== UserRole.SUPERADMIN) {
      return encryptedJson(
        { success: false, message: 'Bu işlemi yapmak için yetkiniz bulunmamaktadır' },
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
    
    // Get status update data from request body
    const { status, adminNotes } = await req.json();
    
    // Validate status
    const validStatuses = ['pending', 'approved', 'rejected', 'draft', 'deleted'];
    
    if (!validStatuses.includes(status)) {
      return encryptedJson(
        { success: false, message: 'Geçersiz durum değeri' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Check if application exists
    const application = await Application.findById(applicationId);
    
    if (!application) {
      return encryptedJson(
        { success: false, message: 'Başvuru bulunamadı' },
        { status: 404 }
      );
    }
    
    // Update application status and admin notes
    const updateData: any = { 
      status,
      updatedAt: new Date(),
      updatedBy: 'admin',
    };
    
    // Add admin notes if provided
    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }
    
    // If marking as approved or rejected, ensure it's not a draft anymore
    if (status === 'approved' || status === 'rejected') {
      updateData.isDraft = false;
    }
    
    // Update the application
    const updatedApplication = await Application.findByIdAndUpdate(
      applicationId,
      { $set: updateData },
      { new: true }
    );
    
    return encryptedJson(
      { 
        success: true, 
        message: 'Başvuru durumu güncellendi',
        application: updatedApplication
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Error updating application status:', error);
    return encryptedJson(
      { 
        success: false, 
        message: 'Başvuru durumu güncellenirken bir hata oluştu'
      },
      { status: 500 }
    );
  }
}
