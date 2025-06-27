import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/models/User';
import { encryptedJson } from '@/lib/response';

// Route'u dynamic olarak işaretle
export const dynamic = 'force-dynamic';

// Server-Sent Events için progress tracking
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPERADMIN)) {
      return encryptedJson({ error: 'Yetkisiz erişim' }, { status: 403 });
    }
    
    const url = new URL(req.url);
    const backupId = url.searchParams.get('backupId');
    
    if (!backupId) {
      return encryptedJson({ error: 'Backup ID gerekli' }, { status: 400 });
    }
    
    // Server-Sent Events response
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      start(controller) {
        // İlk mesajı gönder
        const data = JSON.stringify({
          progress: 10,
          currentStep: 'Restore işlemi başlatılıyor...'
        });
        
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        
        // Simüle edilmiş progress updates
        let progress = 10;
        const interval = setInterval(() => {
          progress += 20;
          
          const stepMessage = progress <= 30 ? 'Yedek dosyası analiz ediliyor...' :
                            progress <= 50 ? 'Cloudinary bağlantısı kuruluyor...' :
                            progress <= 70 ? 'Dosyalar yükleniyor...' :
                            progress <= 90 ? 'Son işlemler yapılıyor...' : 'Tamamlanıyor...';
          
          const progressData = JSON.stringify({
            progress: Math.min(progress, 90),
            currentStep: stepMessage
          });
          
          controller.enqueue(encoder.encode(`data: ${progressData}\n\n`));
          
          if (progress >= 90) {
            clearInterval(interval);
            // Son mesajı gönder ve bağlantıyı kapat
            setTimeout(() => {
              const finalData = JSON.stringify({
                progress: 100,
                currentStep: 'Tamamlandı'
              });
              controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
              controller.close();
            }, 1000);
          }
        }, 2000);
        
        // Cleanup on abort
        req.signal.addEventListener('abort', () => {
          clearInterval(interval);
          controller.close();
        });
      }
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error) {
    return encryptedJson({ error: 'Progress tracking başarısız' }, { status: 500 });
  }
}
