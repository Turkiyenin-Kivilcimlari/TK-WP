import { connectToDatabase } from '@/lib/mongodb';
import Event, { EventStatus } from '@/models/Event';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, checkAdminAuthWithTwoFactor } from '@/middleware/authMiddleware';
import mongoose from 'mongoose';
import { UserRole } from '@/models/User';
import { encryptedJson } from '@/lib/response';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Etkinliği onaylama (admin için)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ID kontrolü
    const { id } = params;
    
    if (!id || id === 'undefined') {
      return encryptedJson(
        { success: false, message: "Geçersiz etkinlik ID'si" },
        { status: 400 }
      );
    }

    // MongoDB ObjectId doğrulaması
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return encryptedJson(
        { success: false, message: "Geçersiz etkinlik ID formatı" },
        { status: 400 }
      );
    }

    // Admin kontrolü
    const adminCheck = await checkAdminAuthWithTwoFactor(req);
    if (adminCheck) return adminCheck;
    
    // Normal token kontrolü
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
    
    await connectToDatabase();
    
    // Etkinliği bul
    const event = await Event.findById(id);
    if (!event) {
      return encryptedJson(
        { success: false, message: 'Etkinlik bulunamadı' },
        { status: 404 }
      );
    }
    
    // Etkinliği onayla
    event.status = EventStatus.APPROVED;
    event.reviewedAt = new Date();
    event.reviewedBy = new mongoose.Types.ObjectId(token.id);
    
    await event.save();
    
    return encryptedJson(
      { 
        success: true, 
        message: 'Etkinlik başarıyla onaylandı',
        event
      }
    );
    
  } catch (error: any) {
    return encryptedJson(
      { 
        success: false, 
        message: 'Etkinlik onaylanırken bir hata oluştu'
      },
      { status: 500 }
    );
  }
}
