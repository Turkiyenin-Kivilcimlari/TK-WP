import { connectToDatabase } from '@/lib/mongodb';
import Article, { ArticleStatus } from '@/models/Article';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, checkAdminAuthWithTwoFactor } from '@/middleware/authMiddleware';
import mongoose from 'mongoose';
import { UserRole } from '@/models/User';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Belirli bir makaleyi getir (admin için)
export async function GET(
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
    
    await connectToDatabase();
    
    // Makaleyi yazarı ile birlikte getir
    const article = await Article.findById(articleId).populate('author', 'name lastname email avatar');
    
    if (!article) {
      return NextResponse.json(
        { success: false, message: 'Makale bulunamadı' },
        { status: 404 }
      );
    }
    
    // MongoDB belgesini JavaScript nesnesine dönüştür
    const formattedArticle = article.toObject();
    
    // ID dönüşümlerini yap
    formattedArticle.id = (formattedArticle._id as mongoose.Types.ObjectId).toString();
    delete formattedArticle._id;
    
    // Yazar bilgisini düzenle
    if (formattedArticle.author && formattedArticle.author._id) {
      (formattedArticle.author as any).id = formattedArticle.author._id.toString();
      if ('_id' in formattedArticle.author) {
        delete (formattedArticle.author as any)._id;
      }
    }
    
    return NextResponse.json({
      success: true,
      article: formattedArticle
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}

// Makaleyi güncelle (admin için)
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
    const { title, blocks, status, tags, thumbnail } = body;
  
    
    await connectToDatabase();
    
    // Makaleyi bul
    const article = await Article.findById(articleId);
    
    if (!article) {
      return NextResponse.json(
        { success: false, message: 'Makale bulunamadı' },
        { status: 404 }
      );
    }
    
    // Güncellenecek alanları belirle
    const updates: any = {};
    
    // İçerik alanları
    if (title !== undefined) updates.title = title;
    if (blocks !== undefined) updates.blocks = blocks;
    if (tags !== undefined) updates.tags = tags;
    if (thumbnail !== undefined) updates.thumbnail = thumbnail;
    
    // Durum değişikliği
    if (status !== undefined) {
      updates.status = status;
      
      // Enum doğrulaması
      if (!Object.values(ArticleStatus).includes(status as ArticleStatus)) {
        return NextResponse.json(
          { success: false, message: `Geçersiz durum değeri: ${status}. Geçerli değerler: ${Object.values(ArticleStatus).join(', ')}` },
          { status: 400 }
        );
      }
      
      // Eğer durum "PUBLISHED" olarak değişiyorsa ve daha önce published değilse
      if (status === ArticleStatus.PUBLISHED && article.status !== ArticleStatus.PUBLISHED) {
        updates.publishedAt = new Date();
      }
    }
    
    // Eğer güncellenecek alan yoksa hata döndür
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, message: 'Güncellenecek alan bulunamadı' },
        { status: 400 }
      );
    }
    
    // Son güncelleme zamanını ayarla
    updates.updatedAt = new Date();
    
    // Makaleyi güncelle
    const updatedArticle = await Article.findByIdAndUpdate(
      articleId,
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!updatedArticle) {
      return NextResponse.json(
        { success: false, message: 'Makale güncellenemedi' },
        { status: 500 }
      );
    }
    
    
    return NextResponse.json({
      success: true,
      message: 'Makale başarıyla güncellendi',
      article: {
        id: updatedArticle._id,
        title: updatedArticle.title,
        status: updatedArticle.status,
        updatedAt: updatedArticle.updatedAt
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: 'Bir hata oluştu',
      },
      { status: 500 }
    );
  }
}

// Makale silme (admin için)
export async function DELETE(
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
    
    await connectToDatabase();
    
    // Makaleyi bul
    const article = await Article.findById(articleId);
    
    if (!article) {
      return NextResponse.json(
        { success: false, message: 'Makale bulunamadı' },
        { status: 404 }
      );
    }
    
    // Makaleyi sil
    await Article.findByIdAndDelete(articleId);
    
    return NextResponse.json({
      success: true,
      message: 'Makale başarıyla silindi'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}

// Makalenin durumunu güncelle (admin için)
export async function PUT(
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
    
    // İstek verisini al
    const body = await req.json();
    const { status } = body;
    
    if (!status) {
      return NextResponse.json(
        { success: false, message: 'Durum bilgisi gereklidir' },
        { status: 400 }
      );
    }
    
    // Enum doğrulaması
    if (!Object.values(ArticleStatus).includes(status as ArticleStatus)) {
      return NextResponse.json(
        { success: false, message: `Geçersiz durum değeri: ${status}. Geçerli değerler: ${Object.values(ArticleStatus).join(', ')}` },
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
      return NextResponse.json(
        { success: false, message: 'Makale güncellenemedi' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
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
    return NextResponse.json(
      { success: false, message: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}
