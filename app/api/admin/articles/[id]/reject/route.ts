import { connectToDatabase } from '@/lib/mongodb';
import Article, { ArticleStatus } from '@/models/Article';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, checkAdminAuthWithTwoFactor } from '@/middleware/authMiddleware';
import mongoose from 'mongoose';
import { UserRole } from '@/models/User';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Makaleyi reddetme (admin için)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin işlemi olduğu için 2FA kontrolü ekliyoruz
    const adminCheck = await checkAdminAuthWithTwoFactor(req);
    if (adminCheck) return adminCheck;
    
    // Normal token kontrolünü de yapalım
    const token = await authenticateUser(req);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Giriş yapmalısınız' },
        { status: 401 }
      );
    }
    
    // Admin yetkisi kontrolü
    if (token.role !== UserRole.ADMIN && token.role !== UserRole.SUPERADMIN) {
      return NextResponse.json(
        { success: false, message: 'Bu işlem için admin yetkisi gereklidir' },
        { status: 403 }
      );
    }
    
    const articleId = params.id;
    if (!articleId || !mongoose.Types.ObjectId.isValid(articleId)) {
      return NextResponse.json(
        { success: false, message: 'Geçersiz makale kimliği' },
        { status: 400 }
      );
    }
    
    // İstek gövdesini al
    const body = await req.json();
    const { reason } = body;
    
    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { success: false, message: 'Reddetme nedeni zorunludur' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Makaleyi bul
    const article = await Article.findById(articleId);
    
    if (!article) {
      return NextResponse.json(
        { success: false, message: 'Makale bulunamadı' },
        { status: 404 }
      );
    }
    
    // Makaleyi reddet ve draft durumuna geri al
    const updatedArticle = await Article.findByIdAndUpdate(
      articleId,
      {
        $set: {
          status: ArticleStatus.DRAFT,
          rejection: {
            reason: reason,
            date: new Date()
          },
          updatedAt: new Date()
        }
      },
      { new: true }
    );
    
    if (!updatedArticle) {
      return NextResponse.json(
        { success: false, message: 'Makale reddedilemedi' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Makale başarıyla reddedildi',
      article: {
        id: updatedArticle._id,
        title: updatedArticle.title,
        status: updatedArticle.status,
        rejection: updatedArticle.rejection
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}
