import { connectToDatabase } from '@/lib/mongodb';
import Article, { ArticleStatus } from '@/models/Article';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/middleware/authMiddleware';
import { createArticleSlug, generateSlug } from '@/lib/utils';
import { encryptedJson } from '@/lib/response';

// Force this route to be dynamically rendered
export const dynamic = 'force-dynamic';

// Kullanıcının kendi makalelerini getir
export async function GET(req: NextRequest) {
  try {
    // Kimlik doğrulama kontrolü
    const token = await authenticateUser(req);
    if (!token) {
      return encryptedJson(
        { success: false, message: 'Giriş yapmalısınız' },
        { status: 401 }
      );
    }
    
    // Parametreleri al
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || undefined;
    
    const skip = (page - 1) * limit;
    
    // Filtreleme
    const query: any = { author: token.id };
    if (status && Object.values(ArticleStatus).includes(status as ArticleStatus)) {
      query.status = status;
    }

    await connectToDatabase();
    
    // Toplam makale sayısını al
    const total = await Article.countDocuments(query);
    
    // Makaleleri al - rejection bilgisini de getir
    const articles = await Article.find(query)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('title slug status createdAt updatedAt publishedAt views rejection');
    
    // Toplam sayfa sayısını hesapla
    const pages = Math.ceil(total / limit);
    
    return encryptedJson({
      success: true,
      count: articles.length,
      total,
      page,
      pages,
      articles
    });
    
  } catch (error: any) {
    return encryptedJson(
      { success: false, message: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}

// Yeni makale oluştur
export async function POST(req: NextRequest) {
  try {
    const token = await authenticateUser(req);
    if (!token) {
      return encryptedJson({ success: false, message: "Giriş yapmalısınız" }, { status: 401 });
    }

    // İstek içeriğini önce string olarak alıp inceleyebiliriz
    const requestBody = await req.text();
    
    // Sonra JSON olarak parse edelim
    const body = JSON.parse(requestBody);
    const { title, blocks, status, tags, thumbnail } = body;
    

    // Başlık kontrolü
    if (!title || !title.trim()) {
      return encryptedJson(
        { success: false, message: 'Başlık gereklidir' },
        { status: 400 }
      );
    }
    
    // Blok kontrolü
    if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
      return encryptedJson(
        { success: false, message: 'En az bir içerik bloğu gereklidir' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Makale verilerini hazırla
    const articleData: any = {
      title,
      blocks,
      author: token.id,  // session.user.id yerine token.id kullanıyoruz
      status: status || ArticleStatus.DRAFT,
      tags: tags || [],
    };
    
    // Slug oluştur
    articleData.slug = createArticleSlug(title, tags || []);
    
    // Thumbnail verisini ekleyelim - undefined olmaması için açık kontrol
    if (thumbnail !== undefined) {
      articleData.thumbnail = thumbnail;
    }
    
    
    // Yeni makale oluştur
    const article = new Article(articleData);
    
    
    // Makaleyi kaydet
    const savedArticle = await article.save();
    
    
    return encryptedJson({
      success: true,
      message: "Makale başarıyla oluşturuldu",
      article: {
        id: savedArticle._id ? savedArticle._id.toString() : (savedArticle as any).id,
        title: savedArticle.title,
        status: savedArticle.status,
        createdAt: savedArticle.createdAt,
        slug: savedArticle.slug,
        thumbnail: savedArticle.thumbnail, // Açıkça thumbnail'i ekleyelim
      }
    });
    
  } catch (error: any) {
    return encryptedJson(
      { success: false, message: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}
