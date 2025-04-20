import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { authenticateUser, checkAdminAuthWithTwoFactor } from '@/middleware/authMiddleware';
import Comment from '@/models/Comment';
import mongoose from 'mongoose';
import { UserRole } from '@/models/User';

// Dynamic route için yapılandırma
export const dynamic = 'force-dynamic';

// Yorum silme endpoint'i
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    // Kimlik doğrulama kontrolü
    const token = await authenticateUser(req);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Giriş yapmalısınız' },
        { status: 401 }
      );
    }

    const { id: articleId, commentId } = params;

    // ID kontrolü
    if (!articleId || !mongoose.Types.ObjectId.isValid(articleId)) {
      return NextResponse.json(
        { success: false, message: 'Geçersiz makale kimliği' },
        { status: 400 }
      );
    }

    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
      return NextResponse.json(
        { success: false, message: 'Geçersiz yorum kimliği' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Yorumu bul
    const comment = await Comment.findById(commentId);

    if (!comment) {
      return NextResponse.json(
        { success: false, message: 'Yorum bulunamadı' },
        { status: 404 }
      );
    }

    // Yetki kontrolü: Yorumun sahibi kendi yorumunu siliyorsa normal kontrol yeterli
    if (comment.author.toString() === token.id) {
      // Kullanıcı kendi yorumunu siliyor, 2FA kontrolüne gerek yok
    } 
    // Admin veya SuperAdmin ise 2FA kontrolü yap
    else if (token.role === UserRole.ADMIN || token.role === UserRole.SUPERADMIN) {
      // Admin için 2FA kontrolü
      const adminCheck = await checkAdminAuthWithTwoFactor(req);
      if (adminCheck) return adminCheck; // 2FA doğrulaması başarısız olursa hata dön
    } 
    // Ne kendi yorumu ne de admin - izin verme
    else {
      return NextResponse.json(
        { success: false, message: 'Bu yorumu silme yetkiniz yok' },
        { status: 403 }
      );
    }

    // Eğer ana yorum ise, alt yorumlarını da sil
    if (!comment.parent) {
      await Comment.deleteMany({ parent: commentId });
    }

    // Yorumu sil
    await Comment.findByIdAndDelete(commentId);

    return NextResponse.json({
      success: true,
      message: 'Yorum başarıyla silindi'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}
