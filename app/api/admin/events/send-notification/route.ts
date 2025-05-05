import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User, { UserRole } from "@/models/User";
import Event from "@/models/Event";
import { authenticateUser } from "@/middleware/authMiddleware";
import { encryptedJson } from "@/lib/response";
import { sendEmail } from "@/lib/mail";

export async function POST(req: NextRequest) {
  try {
    // Kimlik doğrulama kontrolü
    const token = await authenticateUser(req);
    if (!token) {
      return encryptedJson(
        { success: false, message: "Giriş yapmalısınız" },
        { status: 401 }
      );
    }

    // Admin kontrolü
    if (token.role !== UserRole.ADMIN && token.role !== UserRole.SUPERADMIN) {
      return encryptedJson(
        { success: false, message: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    // İstek gövdesinden verileri al
    const { eventId, slug, title, eventDate, eventType, description } = await req.json();

    if (!eventId || !slug || !title) {
      return encryptedJson(
        { success: false, message: "Eksik parametreler" },
        { status: 400 }
      );
    }

    // Veritabanı bağlantısı
    await connectToDatabase();

    // Etkinliği bul
    const event = await Event.findById(eventId);

    if (!event) {
      return encryptedJson(
        { success: false, message: "Etkinlik bulunamadı" },
        { status: 404 }
      );
    }

    // E-posta almayı kabul etmiş kullanıcıları bul
    const users = await User.find({ allowEmails: true });

    if (users.length === 0) {
      return encryptedJson(
        { success: false, message: "E-posta alacak kullanıcı bulunamadı" },
        { status: 404 }
      );
    }

    // E-posta gönderme işlemi
    let successCount = 0;

    for (const user of users) {
      try {
        const eventUrl = `${process.env.NEXT_PUBLIC_APP_URL}/events/${slug}`;
        
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Yeni Etkinlik: ${title}</h2>
            <p>Merhaba ${user.name},</p>
            <p>Yeni bir etkinliğimiz var ve sizi de aramızda görmek isteriz!</p>
            
            <div style="margin: 20px 0;">
              <img src="${event.coverImage}" alt="${title}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 5px;">
            </div>
            
            <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
              <p><strong>Etkinlik:</strong> ${title}</p>
              <p><strong>Tarih:</strong> ${eventDate || 'Belirtilmemiş'}</p>
              <p><strong>Tür:</strong> ${eventType || 'Belirtilmemiş'}</p>
              ${description ? `<p><strong>Açıklama:</strong> ${description.substring(0, 200)}${description.length > 200 ? '...' : ''}</p>` : ''}
            </div>
            
            <div style="margin: 20px 0; text-align: center;">
              <a href="${eventUrl}" style="background-color: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Etkinlik Detaylarını Görüntüle
              </a>
            </div>
            
            <p>Bu e-postayı, Türkiye'nin Kıvılcımları platformundaki etkinlik bildirimleri için izin verdiğiniz için alıyorsunuz.</p>
            <p>Bildirim tercihlerinizi değiştirmek için <a href="${process.env.NEXT_PUBLIC_APP_URL}/profile">profil sayfanızı</a> ziyaret edebilirsiniz.</p>
          </div>
        `;

        await sendEmail({
          to: user.email,
          subject: `Yeni Etkinlik: ${title}`,
          html
        });

        successCount++;
      } catch (emailError) {
        console.error(`Failed to send email to ${user.email}:`, emailError);
      }
    }

    return encryptedJson({
      success: true,
      message: `${successCount} kullanıcıya e-posta gönderildi`,
      sentCount: successCount,
      totalUsers: users.length
    });
  } catch (error) {
    console.error("Error sending event notifications:", error);
    return encryptedJson(
      { success: false, message: "E-posta gönderirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
