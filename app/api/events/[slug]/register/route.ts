import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Event, { EventStatus, IEvent } from '@/models/Event';
import User from '@/models/User';
import { authenticateUser } from '@/middleware/authMiddleware';
import { Types } from 'mongoose';
import { encryptedJson } from '@/lib/response';

export const dynamic = 'force-dynamic';

// Etkinliğe katılma 
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // Kimlik doğrulama kontrolü
    const token = await authenticateUser(req);
    if (!token) {
      return encryptedJson(
        { success: false, message: 'Giriş yapmalısınız' },
        { status: 401 }
      );
    }
    
    const slug = params.slug;
    
    await connectToDatabase();
    
    // Etkinliği bul
    const event = await Event.findOne({ slug });
    
    if (!event) {
      return encryptedJson(
        { success: false, message: 'Etkinlik bulunamadı' },
        { status: 404 }
      );
    }
    
    // Etkinlik onaylanmış mı kontrol et
    if (event.status !== EventStatus.APPROVED) {
      return encryptedJson(
        { success: false, message: 'Bu etkinliğe şu anda kayıt olamazsınız' },
        { status: 400 }
      );
    }
    
    // Etkinlik tarihi geçmiş mi kontrol et
    const lastDay = event.eventDays && event.eventDays.length > 0 
      ? event.eventDays[event.eventDays.length - 1] 
      : null;
      
    if (lastDay) {
      const lastDayDate = new Date(lastDay.date);
      if (lastDayDate < new Date()) {
        return encryptedJson(
          { success: false, message: 'Bu etkinlik sona ermiştir' },
          { status: 400 }
        );
      }
    }
    
    // Kullanıcı zaten kayıtlı mı kontrol et
    const isAlreadyRegistered = event.participants.some(
      (participant) => participant.userId.toString() === token.id
    );
    
    if (isAlreadyRegistered) {
      return encryptedJson(
        { success: false, message: 'Bu etkinliğe zaten kayıtlısınız' },
        { status: 400 }
      );
    }
    
    // Kullanıcı bilgilerini al
    const user = await User.findById(token.id);
    
    if (!user) {
      return encryptedJson(
        { success: false, message: 'Kullanıcı bulunamadı' },
        { status: 404 }
      );
    }
    
    // Kullanıcıyı etkinliğe kaydet
    event.participants.push({
      userId: new Types.ObjectId(user._id ? user._id.toString() : token.id),
      name: user.name,
      lastname: user.lastname,
      email: user.email,
      registeredAt: new Date()
    });
    
    // participantCount alanını güncelle
    event.participantCount = event.participants.length;
    
    await event.save();
    
    return encryptedJson({
      success: true,
      message: 'Etkinliğe başarıyla kaydoldunuz',
      participantCount: event.participantCount
    });
    
  } catch (error: any) {
    return encryptedJson(
      { success: false, message: 'Etkinliğe kayıt olurken bir hata oluştu' },
      { status: 500 }
    );
  }
}

// Etkinlik katılımını iptal et
export async function DELETE(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // Kimlik doğrulama kontrolü
    const token = await authenticateUser(req);
    if (!token) {
      return encryptedJson(
        { success: false, message: 'Giriş yapmalısınız' },
        { status: 401 }
      );
    }
    
    const slug = params.slug;
    
    await connectToDatabase();
    
    // Etkinliği bul
    const event = await Event.findOne({ slug });
    
    if (!event) {
      return encryptedJson(
        { success: false, message: 'Etkinlik bulunamadı' },
        { status: 404 }
      );
    }
    
    // Kullanıcı kayıtlı mı kontrol et
    const participantIndex = event.participants.findIndex(
      (participant) => participant.userId.toString() === token.id
    );
    
    if (participantIndex === -1) {
      return encryptedJson(
        { success: false, message: 'Bu etkinliğe kayıtlı değilsiniz' },
        { status: 400 }
      );
    }
    
    // Kullanıcıyı etkinlik katılımcılarından çıkar
    event.participants.splice(participantIndex, 1);
    
    // participantCount alanını güncelle
    event.participantCount = event.participants.length;
    
    await event.save();
    
    return encryptedJson({
      success: true,
      message: 'Etkinlik kaydınız iptal edildi',
      participantCount: event.participantCount
    });
    
  } catch (error: any) {
    return encryptedJson(
      { success: false, message: 'Etkinlik kaydı iptal edilirken bir hata oluştu' },
      { status: 500 }
    );
  }
}
