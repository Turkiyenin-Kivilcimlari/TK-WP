import { connectToDatabase } from '@/lib/mongodb';
import Article, { ArticleStatus } from '@/models/Article';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, checkAdminAuthWithTwoFactor } from '@/middleware/authMiddleware';
import mongoose from 'mongoose';
import { UserRole } from '@/models/User';
import { encryptedJson } from '@/lib/response';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Makale durumunu güncelle (admin için)
export async function PATCH(
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
    
    const articleId = params.id;
    if (!articleId || !mongoose.Types.ObjectId.isValid(articleId)) {
      return encryptedJson(
        { success: false, message: 'Geçersiz makale kimliği' },
        { status: 400 }
      );
    }
    
    // İstek verisini al
    const body = await req.json();
    const { status } = body;
    
    if (!status) {
      return encryptedJson(
        { success: false, message: 'Durum bilgisi gereklidir' },
        { status: 400 }
      );
    }
    
    
    // Enum doğrulaması
    if (!Object.values(ArticleStatus).includes(status as ArticleStatus)) {
      return encryptedJson(
        { success: false, message: `Geçersiz durum değeri: ${status}. Geçerli değerler: ${Object.values(ArticleStatus).join(', ')}` },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Makaleyi bul
    const article = await Article.findById(articleId);
    
    if (!article) {
      return encryptedJson(
        { success: false, message: 'Makale bulunamadı' },
        { status: 404 }
      );
    }
    
    // Güncellenecek alanlar
    const updates: any = { 
      status, 
      updatedAt: new Date() 
    };
    
    // Eğer durum "PUBLISHED" olarak değişiyorsa ve daha önce published değilse
    if (status === ArticleStatus.PUBLISHED && article.status !== ArticleStatus.PUBLISHED) {
      updates.publishedAt = new Date();
    }
    
    // Makaleyi güncelle
    const updatedArticle = await Article.findByIdAndUpdate(
      articleId,
      { $set: updates },
      { new: true }
    );
    
    if (!updatedArticle) {
      return encryptedJson(
        { success: false, message: 'Makale güncellenemedi' },
        { status: 500 }
      );
    }
    
    
    return encryptedJson({
      success: true,
      message: 'Makale durumu başarıyla güncellendi',
      article: {
        id: updatedArticle._id,
        title: updatedArticle.title,
        status: updatedArticle.status,
        updatedAt: updatedArticle.updatedAt
      }
    });
  } catch (error: any) {
    return encryptedJson(
      { success: false, message: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}
