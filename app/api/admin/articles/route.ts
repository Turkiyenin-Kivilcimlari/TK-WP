import { connectToDatabase } from '@/lib/mongodb';
import Article, { ArticleStatus, IArticle } from '@/models/Article';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, checkAdminAuthWithTwoFactor } from '@/middleware/authMiddleware';
import { UserRole } from '@/models/User';
import mongoose from 'mongoose';
import { encryptedJson } from '@/lib/response';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Tüm makaleleri getir (sadece adminler için)
export async function GET(req: NextRequest) {
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
    
    // Parametreleri al
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status') || undefined;
    const author = searchParams.get('author') || undefined;
    const date = searchParams.get('date') || undefined;
    const search = searchParams.get('search') || undefined;
    const sort = searchParams.get('sort') || 'desc';
    
    const skip = (page - 1) * limit;
    
    // Filtreleme
    const query: any = {};
    
    // Durum filtresi
    if (status && Object.values(ArticleStatus).includes(status as ArticleStatus)) {
      query.status = status;
    }
    
    // Yazar filtresi
    if (author && author !== 'all') {
      query.author = new mongoose.Types.ObjectId(author);
    }
    
    // Tarih filtresi
    if (date) {
      // Belirli bir günün başlangıcı ve sonu
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      query.createdAt = {
        $gte: startDate,
        $lte: endDate,
      };
    }
    
    // Arama filtresi
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { 'blocks.content': { $regex: search, $options: 'i' } }
      ];
    }

    await connectToDatabase();
    
    // Sıralama seçeneği
    const sortOption: { createdAt: 1 | -1 } = { createdAt: sort === 'asc' ? 1 : -1 };
    
    // Makaleleri getir (yazar bilgileriyle birlikte)
    const articles = await Article.find(query)
      .populate('author', 'name lastname') // email kaldırıldı
      .sort(sortOption)
      .skip(skip)
      .limit(limit);
    
    // Toplam makale sayısını hesapla
    const total = await Article.countDocuments(query);
    
    // Makaleleri client için uygun formata dönüştür
    const formattedArticles = articles.map((article: IArticle) => {
      const formattedArticle = article.toObject();
      formattedArticle.id = (formattedArticle._id as any).toString();
      delete formattedArticle._id;
      
      // Yazar varsa, yazar ID'sini düzelt
      if (formattedArticle.author && formattedArticle.author._id) {
        (formattedArticle.author as any).id = formattedArticle.author._id.toString();
        delete (formattedArticle.author as any)._id;
      }
      
      return formattedArticle;
    });
    
    return encryptedJson({
      success: true,
      articles: formattedArticles,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
    
  } catch (error: any) {
    return encryptedJson(
      { success: false, message: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}
