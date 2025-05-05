import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/middleware/authMiddleware';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { encryptedJson } from '@/lib/response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Get the session using the request object
    const session = await getServerSession(authOptions);

    // Check if the user is authenticated
    if (!session || !session.user) {
      return encryptedJson(
        { 
          success: false, 
          message: "Oturum bulunamadı",
          data: { 
            enabled: false, 
            verified: false, 
            required: false, 
            isAdmin: false 
          } 
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    await connectToDatabase();
    
    const user = await User.findById(userId);
    
    if (!user) {
      return encryptedJson(
        { 
          success: false, 
          message: 'Kullanıcı bulunamadı',
          data: { 
            enabled: false, 
            verified: false, 
            required: false, 
            isAdmin: false 
          }
        },
        { status: 404 }
      );
    }
    
    const isTwoFactorEnabled = user.twoFactorEnabled || false;
    const isTwoFactorVerified = user.twoFactorVerified || false;
    const requiresTwoFactor = user.role === 'ADMIN' || user.role === 'SUPERADMIN';
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPERADMIN';
    
    // Son doğrulama zamanını kontrol et (3 saat geçerliliği)
    // Admin kullanıcıları için süre kontrolünü 3 saat olarak ayarlayalım
    let isVerificationExpired = false;

    if (isAdmin && isTwoFactorEnabled) {
      // Doğrulama yapılmış mı kontrol et
      if (isTwoFactorVerified) {
        // Doğrulama zamanını kontrol et
        if (user.lastTwoFactorVerification) {
          const now = new Date();
          const lastVerification = new Date(user.lastTwoFactorVerification);
          const diffMs = now.getTime() - lastVerification.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const verificationTimeoutMins = 180; // Admin için 3 saat (180 dakika)
          isVerificationExpired = diffMins > verificationTimeoutMins; 
        } else {
          // Verified true ama lastTwoFactorVerification yok - şimdi oluştur
          user.lastTwoFactorVerification = new Date();
          await user.save();
          isVerificationExpired = false;
        }
      } else {
        // Doğrulama yapılmamış
        isVerificationExpired = true;
      }
    } else {
      // Admin olmayan kullanıcılar için always false
      isVerificationExpired = false;
    }
    
    return encryptedJson({
      success: true,
      data: {
        enabled: isTwoFactorEnabled,
        verified: isAdmin ? (isTwoFactorVerified && !isVerificationExpired) : true,
        required: requiresTwoFactor,
        isAdmin: isAdmin,
        lastVerification: user.lastTwoFactorVerification || null,
        sessionTimeoutMins: 180 // 3 saat
      }
    });
    
  } catch (error) {
    return encryptedJson(
      { 
        success: false, 
        message: 'Sunucu hatası',
        data: { 
          enabled: false, 
          verified: false, 
          required: false, 
          isAdmin: false 
        }
      },
      { status: 500 }
    );
  }
}
