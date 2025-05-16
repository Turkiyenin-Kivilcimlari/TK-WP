import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Application from '@/models/Application';
import { authenticateUser } from '@/middleware/authMiddleware';
import { encryptedJson } from '@/lib/response';

export const dynamic = 'force-dynamic';

// Create a new application
export async function POST(req: NextRequest) {
  try {
    const token = await authenticateUser(req);
    
    if (!token || typeof token === 'string') {
      return encryptedJson(
        { success: false, message: 'Giriş yapmalısınız' },
        { status: 401 }
      );
    }
    
    const userId = token.id;
    const data = await req.json();
    const isDraft = data.isDraft === true;
    
    await connectToDatabase();
    
    // Check if required fields are present for non-draft submissions
    if (!isDraft) {
      const requiredFields = [
        'schoolName', 'contactInfo', 'emailAddress', 'department', 
        'grade', 'contactChannel', 'communityVision', 'communityExpectation'
      ];
      
      const missingFields = requiredFields.filter(field => !data[field]);
      
      if (missingFields.length > 0) {
        return encryptedJson(
          { 
            success: false, 
            message: 'Zorunlu alanlar eksik',
            missingFields 
          },
          { status: 400 }
        );
      }
    }
    
    // Create a new application
    const application = new Application({
      ...data,
      userId,
      status: isDraft ? 'draft' : 'pending', // Set status based on isDraft
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await application.save();
    
    return encryptedJson(
      { 
        success: true, 
        message: isDraft ? 'Başvurunuz taslak olarak kaydedildi' : 'Başvurunuz alındı',
        application
      },
      { status: 201 }
    );
    
  } catch (error: any) {
    console.error('Application save error:', error);
    
    return encryptedJson(
      { 
        success: false, 
        message: error.message || 'Başvuru kaydedilirken bir hata oluştu'
      },
      { status: 500 }
    );
  }
}

// Get all applications for the current user
export async function GET(req: NextRequest) {
  try {
    const token = await authenticateUser(req);
    
    if (!token || typeof token === 'string') {
      return encryptedJson(
        { success: false, message: 'Giriş yapmalısınız' },
        { status: 401 }
      );
    }
    
    const userId = token.id;
    const searchParams = req.nextUrl.searchParams;
    const isUserSpecific = searchParams.get('userId') === userId;
    
    await connectToDatabase();
    
    let query = {};
    
    // If user is requesting their own applications, filter by userId
    if (isUserSpecific) {
      query = { userId };
    }
    
    const applications = await Application.find(query).sort({ createdAt: -1 });
    
    return encryptedJson(
      { 
        success: true, 
        applications
      },
      { status: 200 }
    );
    
  } catch (error) {
    return encryptedJson(
      { 
        success: false, 
        message: 'Başvurular alınırken bir hata oluştu'
      },
      { status: 500 }
    );
  }
}
