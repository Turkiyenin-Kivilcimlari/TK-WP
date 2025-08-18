import * as cron from 'node-cron';
import nodemailer from 'nodemailer';
import { getBackupSettings } from '@/lib/backup/backupPermissions';
import { BackupOperationStatus } from '@/models/Backup';
import User,{ UserRole } from '@/models/User'; // User türünü de içe aktarıyoruz
import path from 'path';
import { getUsersByRole } from '@/lib/userService';

interface EmailNotificationOptions {
  subject: string;
  body: string;
  recipients: string[];
}

/**
 * E-posta göndermek için nodemailer taşıyıcısı oluşturur
 */
function createMailTransporter() {
  // Taşıyıcı yapılandırmasını loglama
  console.log('Mail taşıyıcısı oluşturuluyor:', {
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT) || 465,
    secure: process.env.MAIL_PORT === '465',
  });

  // Mail hizmeti sağlayıcısına bağlı olarak doğru ayarları kullan
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT) || 465,
    secure: process.env.MAIL_PORT === '465', // Otomatik olarak güvenli bağlantı belirle
    auth: {
      user: process.env.MAIL_EMAIL,
      pass: process.env.MAIL_PASSWORD,
    },
    // Bağlantı zaman aşımı sürelerini artır
    connectionTimeout: 10000, // 10 saniye
    greetingTimeout: 10000,
    socketTimeout: 15000,
    // TLS/SSL ayarları
    tls: {
      rejectUnauthorized: false // Self-signed sertifikaları kabul et
    },
    // Debug modunu etkinleştir
    debug: process.env.NODE_ENV === 'development'
  });
}

// E-posta kuyruğu
const emailQueue: EmailNotificationOptions[] = [];
let isProcessingQueue = false;

/**
 * E-posta kuyruğunu işler
 */
async function processEmailQueue() {
  if (isProcessingQueue || emailQueue.length === 0) return;
  
  isProcessingQueue = true;
  console.log(`E-posta kuyruğu işleniyor (${emailQueue.length} e-posta)`);
  
  try {
    const email = emailQueue.shift();
    if (email) {
      const { subject, body, recipients } = email;
      
      if (!recipients || recipients.length === 0) {
        console.log('Bildirim gönderilecek alıcı bulunamadı');
        return;
      }
      
      const transporter = createMailTransporter();
      
      // E-posta gönderim işlemini deneme
      const maxRetries = 3;
      let retries = 0;
      let success = false;
      
      while (!success && retries < maxRetries) {
        try {
          console.log(`E-posta gönderiliyor (deneme ${retries + 1}/${maxRetries})...`);
          console.log('Alıcılar:', recipients);
          
          const info = await transporter.sendMail({
            from: `"Yedekleme Sistemi" <${process.env.MAIL_EMAIL}>`,
            to: recipients.join(', '),
            subject,
            html: body,
            // Gönderi hızını ayarla
            priority: 'high'
          });
          
          console.log('E-posta bildirimi gönderildi:', info.messageId);
          console.log('Gönderim yanıtı:', info.response);
          success = true;
        } catch (error) {
          console.error(`E-posta gönderim hatası (deneme ${retries + 1}/${maxRetries}):`, error);
          retries++;
          
          if (retries < maxRetries) {
            // Her denemeden önce biraz bekle (exponential backoff)
            const delay = retries * 2000; // 2, 4, 6 saniye...
            console.log(`${delay}ms bekledikten sonra tekrar denenecek...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      if (!success) {
        console.error('Maksimum deneme sayısına ulaşıldı, e-posta gönderilemedi');
      }
    }
  } catch (error) {
    console.error('E-posta kuyruğu işlenirken hata oluştu:', error);
  } finally {
    isProcessingQueue = false;
    
    // Kuyrukta başka e-postalar varsa işlemeye devam et
    if (emailQueue.length > 0) {
      setTimeout(processEmailQueue, 1000); // 1 saniye sonra tekrar kontrol et
    }
  }
}

/**
 * E-posta bildirimini kuyruğa ekler ve gönderim sürecini başlatır
 */
async function sendEmailNotification(options: EmailNotificationOptions): Promise<void> {
  // E-postayı kuyruğa ekle
  emailQueue.push(options);
  console.log(`E-posta kuyruğa eklendi. Kuyrukta ${emailQueue.length} e-posta var.`);
  
  // Kuyruk işlem sürecini başlat
  if (!isProcessingQueue) {
    processEmailQueue();
  }
}

/**
 * Bildirim alıcılarının e-posta adreslerini alır
 */
async function getNotificationRecipients(): Promise<string[]> {
  const settings = await getBackupSettings();
  
  let recipients: string[] = [];
  
  // Ayarlardaki alıcıları ekle
  if (settings?.notifications?.email?.recipients && 
      Array.isArray(settings.notifications.email.recipients)) {
    recipients = [...settings.notifications.email.recipients];
    console.log('Ayarlardan alınan alıcılar:', recipients);
  }
  
  // Superadmin kullanıcıları ekle
  try {
    console.log('Süper admin kullanıcıları alınıyor...');
    const superadmins = await getUsersByRole(UserRole.SUPERADMIN);
    
    console.log(`${superadmins.length} süper admin bulundu`);
    
    // Süper admin e-postalarını ekle
    superadmins.forEach((admin: { email?: string; name?: string; lastname?: string }) => {
      if (admin.email && !recipients.includes(admin.email)) {
        console.log(`Süper admin ekleniyor: ${admin.name || ''} ${admin.lastname || ''} <${admin.email}>`);
        recipients.push(admin.email);
      }
    });
  } catch (error) {
    console.error('Süper admin e-postaları alınırken hata oluştu:', error);
  }
  
  // Benzersiz alıcıları filtrele
  const uniqueRecipients = Array.from(new Set(recipients));
  console.log(`Toplam ${uniqueRecipients.length} benzersiz e-posta alıcısı`);
  
  return uniqueRecipients;
}

/**
 * Yedekleme şifresini e-posta ile gönderir
 */
export async function sendBackupPassword(password: string, backupDir: string): Promise<void> {
  const settings = await getBackupSettings();
  
  if (!settings?.notifications?.email?.enabled) {
    console.log('E-posta bildirimleri devre dışı, şifre gönderilmedi');
    return;
  }
  
  const recipients = await getNotificationRecipients();
  if (!recipients.length) {
    console.error('Hiç alıcı bulunamadı, şifre e-postası gönderilemedi');
    return;
  }
  
  console.log('Yedekleme şifresi e-posta alıcıları:', recipients);
  const backupName = path.basename(backupDir);
  const date = new Date().toLocaleDateString('tr-TR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit' 
  });
  
  const subject = `🔒 ÖNEMLİ: Yedekleme Şifresi - ${backupName}`;
  
  const body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #005FB8;">
        <h2 style="margin-top: 0; color: #005FB8;">Yedekleme Şifresi Bildirimi</h2>
        <p>Bu e-posta, sistem yedekleme işlemi tamamlandığında otomatik olarak gönderilmiştir.</p>
      </div>
      
      <p>Sayın Yetkili,</p>
      <p>Aşağıdaki şifre, <strong>${backupName}</strong> adlı yedekleme için <strong>${date}</strong> tarihinde oluşturulmuştur.</p>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center; border: 1px solid #ddd;">
        <span style="font-family: monospace; font-size: 18px; color: #d63031; word-break: break-all;">${password}</span>
      </div>
      
      <p><strong>Önemli Uyarı:</strong></p>
      <ul style="padding-left: 20px; line-height: 1.6;">
        <li>Bu şifre olmadan yedekleme dosyalarına erişilemez ve geri yükleme yapılamaz.</li>
        <li>Şifreyi güvenli bir yerde saklayınız ve yetkisiz kişilerle paylaşmayınız.</li>
        <li>Şifrenin kaybolması durumunda, bu yedeğe bir daha erişilemeyecektir.</li>
      </ul>
      
      <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 15px; font-size: 12px; color: #666;">
        <p>
          Bu e-posta otomatik olarak gönderilmiştir, lütfen yanıtlamayınız.<br>
          İlgili sistem: ${process.env.NEXT_PUBLIC_APP_NAME || 'Sistem Yedekleme Servisi'}<br>
          Gönderilme zamanı: ${new Date().toLocaleString('tr-TR')}<br>
          Bildirim kimliği: ${Date.now().toString(36)}
        </p>
      </div>
    </div>
  `;
  
  await sendEmailNotification({
    subject,
    body,
    recipients,
  });
  
  console.log('Yedekleme şifresi e-postası kuyruğa alındı');
}

/**
 * Yedekleme tamamlandığında bildirim gönderir
 */
export async function sendBackupNotification(
  status: BackupOperationStatus,
  backupPath: string,
  error?: string
): Promise<void> {
  const settings = await getBackupSettings();
  
  if (!settings?.notifications?.email?.enabled) {
    return;
  }
  
  const isSuccess = status === BackupOperationStatus.COMPLETED;
  
  // Başarılı bildirimleri denetimi
  if (isSuccess && !settings.notifications.email.onSuccess) {
    return;
  }
  
  // Başarısız bildirimleri denetimi
  if (!isSuccess && !settings.notifications.email.onFailure) {
    return;
  }
  
  const recipients = await getNotificationRecipients();
  const backupName = path.basename(backupPath);
  const date = new Date().toLocaleDateString('tr-TR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit' 
  });
  
  const subject = isSuccess
    ? `✅ Yedekleme Başarılı: ${backupName}`
    : `❌ Yedekleme Başarısız: ${backupName}`;
  
  let body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background-color: ${isSuccess ? '#f0fff4' : '#fff5f5'}; padding: 20px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid ${isSuccess ? '#38a169' : '#e53e3e'};">
        <h2 style="margin-top: 0; color: ${isSuccess ? '#2f855a' : '#c53030'};">
          ${isSuccess ? 'Yedekleme İşlemi Başarılı' : 'Yedekleme İşlemi Başarısız'}
        </h2>
        <p>Bu e-posta, sistem yedekleme işlemi ${isSuccess ? 'tamamlandığında' : 'başarısız olduğunda'} otomatik olarak gönderilmiştir.</p>
      </div>
      
      <h3>Yedekleme Bilgileri</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 40%;">Yedekleme Adı:</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${backupName}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Tarih:</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${date}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Durum:</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">
            <span style="color: ${isSuccess ? '#38a169' : '#e53e3e'}; font-weight: bold;">
              ${isSuccess ? 'TAMAMLANDI' : 'BAŞARISIZ'}
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Yedekleme Yolu:</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-family: monospace; font-size: 0.9em;">${backupPath}</td>
        </tr>
      </table>
  `;
  
  if (!isSuccess && error) {
    body += `
      <div style="background-color: #fff5f5; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #feb2b2;">
        <h3 style="color: #c53030; margin-top: 0;">Hata Detayları:</h3>
        <pre style="white-space: pre-wrap; word-break: break-all; background-color: #fffafa; padding: 10px; border-radius: 3px; font-family: monospace; font-size: 0.9em; color: #c53030;">${error}</pre>
      </div>
      
      <h3>Öneriler</h3>
      <ul style="padding-left: 20px; line-height: 1.6;">
        <li>Hata kayıtlarını kontrol ederek sorunun kaynağını belirleyin.</li>
        <li>Disk alanı yeterli mi kontrol edin.</li>
        <li>Veritabanı bağlantıları ve izinlerini kontrol edin.</li>
        <li>Gerekirse manuel olarak yedekleme işlemini başlatın.</li>
      </ul>
    `;
  }
  
  if (isSuccess) {
    body += `
      <h3>Bilgiler</h3>
      <ul style="padding-left: 20px; line-height: 1.6;">
        <li>Yedekleme şifresi, ayrı bir e-posta ile gönderilmiştir.</li>
        <li>Yedekleme dosyaları, belirtilen yolda saklanmaktadır.</li>
        <li>Geri yükleme gerektiğinde, yönetim panelinden işlem yapabilirsiniz.</li>
        <li>Yedekleme ayarlarınızı yönetim panelinden özelleştirebilirsiniz.</li>
      </ul>
    `;
  }
  
  body += `
      <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 15px; font-size: 12px; color: #666;">
        <p>
          Bu e-posta otomatik olarak gönderilmiştir, lütfen yanıtlamayınız.<br>
          İlgili sistem: ${process.env.NEXT_PUBLIC_APP_NAME || 'Sistem Yedekleme Servisi'}<br>
          Gönderilme zamanı: ${new Date().toLocaleString('tr-TR')}<br>
          Bildirim kimliği: ${Date.now().toString(36)}
        </p>
      </div>
    </div>
  `;
  
  await sendEmailNotification({
    subject,
    body,
    recipients,
  });
  
  console.log(`Yedekleme ${isSuccess ? 'başarı' : 'hata'} bildirimi gönderildi. Alıcı sayısı: ${recipients.length}`);
}

/**
 * Zamanlanmış yedekleme görevlerini başlatır
 */
export function initializeBackupScheduler() {
  // Her gün programlı yedekleme yapılmasını sağlar
  cron.schedule('0 3 * * *', async () => {
    const settings = await getBackupSettings();
    
    if (!settings?.schedule) {
      console.log('Yedekleme zamanlaması ayarlanmamış');
      return;
    }
    
    try {
      // Bu kısımda zamanlanmış yedekleme başlatılır
      console.log('Zamanlanmış yedekleme başlatıldı');
    } catch (error) {
      console.error('Zamanlanmış yedekleme başlatılırken hata oluştu:', error);
    }
  });
}
