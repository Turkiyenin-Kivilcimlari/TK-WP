import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Application from '@/models/Application';
import { authenticateUser } from '@/middleware/authMiddleware';
import { encryptedJson } from '@/lib/response';
import mongoose from 'mongoose';

// Fetch a specific application
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = await authenticateUser(req);
    
    if (!token || typeof token === 'string') {
      return encryptedJson(
        { success: false, message: 'Giriş yapmalısınız' },
        { status: 401 }
      );
    }
    
    const userId = token.id;
    const applicationId = params.id;
    
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return encryptedJson(
        { success: false, message: 'Geçersiz başvuru ID' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Check if application exists and belongs to the user
    const application = await Application.findOne({
      _id: applicationId,
      userId
    });
    
    if (!application) {
      return encryptedJson(
        { success: false, message: 'Başvuru bulunamadı veya görüntüleme yetkiniz yok' },
        { status: 404 }
      );
    }
    
    return encryptedJson(
      { 
        success: true,
        application
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Error fetching application:', error);
    return encryptedJson(
      { 
        success: false, 
        message: 'Başvuru bilgileri alınırken bir hata oluştu'
      },
      { status: 500 }
    );
  }
}

// Başvuru güncelleme
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = await authenticateUser(req);
    
    if (!token || typeof token === 'string') {
      return encryptedJson(
        { success: false, message: 'Giriş yapmalısınız' },
        { status: 401 }
      );
    }
    
    const userId = token.id;
    const applicationId = params.id;
    
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return encryptedJson(
        { success: false, message: 'Geçersiz başvuru ID' },
        { status: 400 }
      );
    }
    
    const data = await req.json();
    
    await connectToDatabase();
    
    // Başvurunun varlığını ve kullanıcıya ait olduğunu kontrol et
    const application = await Application.findOne({
      _id: applicationId,
      userId
    });
    
    if (!application) {
      return encryptedJson(
        { success: false, message: 'Başvuru bulunamadı veya bu başvuruyu güncelleme yetkiniz yok' },
        { status: 404 }
      );
    }
    
    // Güncelleme için sadece belirli alanları al
    const updatableFields = [
      'name', 'email', 'phone', 'university', 'classYear', 'expertise', 
      'experience', 'motivation', 'availability', 'additionalInfo'
    ];
    
    const updates: Record<string, any> = {};
    updatableFields.forEach(field => {
      if (field in data) {
        updates[field] = data[field];
      }
    });
    
    const updatedApplication = await Application.findByIdAndUpdate(
      applicationId,
      { $set: updates },
      { new: true }
    );
    
    return encryptedJson(
      { 
        success: true, 
        message: 'Başvurunuz başarıyla güncellendi',
        application: updatedApplication
      },
      { status: 200 }
    );
    
  } catch (error) {
    return encryptedJson(
      { 
        success: false, 
        message: 'Başvuru güncellenirken bir hata oluştu'
      },
      { status: 500 }
    );
  }
}

// Başvuru silme
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = await authenticateUser(req);
    
    if (!token || typeof token === 'string') {
      return encryptedJson(
        { success: false, message: 'Giriş yapmalısınız' },
        { status: 401 }
      );
    }
    
    const userId = token.id;
    const applicationId = params.id;
    
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return encryptedJson(
        { success: false, message: 'Geçersiz başvuru ID' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Başvurunun varlığını ve kullanıcıya ait olduğunu kontrol et
    const application = await Application.findOne({
      _id: applicationId,
      userId
    });
    
    if (!application) {
      return encryptedJson(
        { success: false, message: 'Başvuru bulunamadı veya bu başvuruyu silme yetkiniz yok' },
        { status: 404 }
      );
    }
    
    await Application.findByIdAndDelete(applicationId);
    
    return encryptedJson(
      { 
        success: true, 
        message: 'Başvurunuz başarıyla silindi'
      },
      { status: 200 }
    );
    
  } catch (error) {
    return encryptedJson(
      { 
        success: false, 
        message: 'Başvuru silinirken bir hata oluştu'
      },
      { status: 500 }
    );
  }
}
