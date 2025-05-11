import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Event, { EventStatus, IEvent, EventType } from '@/models/Event';
import User from '@/models/User';
import { authenticateUser } from '@/middleware/authMiddleware';
import { Types } from 'mongoose';
import { encryptedJson } from '@/lib/response';

export const dynamic = 'force-dynamic';

// Etkinliğin geçip geçmediğini kontrol eden yardımcı fonksiyon
function isEventPast(event: any): boolean {
  if (!event || !event.eventDays || event.eventDays.length === 0) {
    return true;
  }

  const now = new Date();
  const lastDay = event.eventDays[event.eventDays.length - 1];
  
  if (!lastDay || !lastDay.date) return true;
  
  const lastDate = new Date(lastDay.date);
  
  if (lastDay.endTime) {
    const [hours, minutes] = lastDay.endTime.split(':').map(Number);
    lastDate.setHours(hours, minutes, 0, 0);
  } 
  else if (lastDay.eventType === EventType.ONLINE && lastDay.startTime) {
    const [hours, minutes] = lastDay.startTime.split(':').map(Number);
    lastDate.setHours(hours, minutes, 0, 0);
    lastDate.setHours(lastDate.getHours() + 1);
  } 
  else {
    lastDate.setHours(23, 59, 59, 999);
  }

  return now > lastDate;
}

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
        { success: false, message: 'Bu etkinlik henüz onaylanmamış' },
        { status: 400 }
      );
    }
    
    // Etkinliğin geçmişte olup olmadığını kontrol et - geliştirilmiş kontrol
    if (isEventPast(event)) {
      return encryptedJson(
        { success: false, message: 'Bu etkinliğin tarihi geçmiş' },
        { status: 400 }
      );
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
    
    // Etkinliğin geçmişte olup olmadığını kontrol et
    if (isEventPast(event)) {
      return encryptedJson(
        { success: false, message: 'Bu etkinliğin tarihi geçmiş, katılımınızı iptal edemezsiniz' },
        { status: 400 }
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
