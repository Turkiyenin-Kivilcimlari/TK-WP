import { connectToDatabase } from '@/lib/mongodb';
import Article, { ArticleStatus } from '@/models/Article';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/middleware/authMiddleware';
import mongoose from 'mongoose';
import { UserRole } from '@/models/User';
import { deleteMultipleImages } from '@/lib/cloudinary';
import { createArticleSlug } from '@/lib/utils';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Belirli bir makaleyi getirme
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Token kontrolü (optional) - yazının durumu published değilse sadece yazar veya admin görebilir
        const token = await authenticateUser(req); // true ile opsiyonel yapıyordu ancak tanım sadece bir argüman bekliyor
    
    await connectToDatabase();
    
    const articleId = params.id;
    
    // Makalenin varlığını doğrudan ObjectId kullanmadan kontrol et
    if (!mongoose.isValidObjectId(articleId)) {
      return NextResponse.json(
        { success: false, message: 'Geçersiz makale ID formatı' },
        { status: 400 }
      );
    }
    
    // Makale ve yazar bilgilerini getir
    const article = await Article.findById(articleId).populate('author', 'name lastname avatar');
    
    if (!article) {
      return NextResponse.json(
        { success: false, message: 'Makale bulunamadı' },
        { status: 404 }
      );
    }
    
    // Ensure author is populated and not just an ObjectId
    if (!article.author || typeof article.author === 'string' || article.author instanceof mongoose.Types.ObjectId) {
      return NextResponse.json(
        { success: false, message: 'Yazar bilgileri yüklenemedi' },
        { status: 500 }
      );
    }
    
    if (!article) {
      return NextResponse.json(
        { success: false, message: 'Makale bulunamadı' },
        { status: 404 }
      );
    }
    
    // Yetki kontrolü - sadece yayınlanmış makaleleri herkes görebilir
    // Diğer durumlar için yazar veya admin olmalı
    if (article.status !== ArticleStatus.PUBLISHED) {
      const isAuthorized = token && (
        (article.author as any)._id.toString() === token.id || 
        token.role === UserRole.ADMIN
      );
      
      if (!isAuthorized) {
        return NextResponse.json(
          { success: false, message: 'Bu makaleyi görüntüleme yetkiniz yok' },
          { status: 403 }
        );
      }
    }
    
    // Görüntülenme sayısını artır - görüntüleyen makale sahibi değilse
    if (token && (article.author as any)._id.toString() !== token.id) {
      await Article.findByIdAndUpdate(articleId, { $inc: { views: 1 } });
    }
    
    // ObjectId'yi id'ye dönüştür
    const formattedArticle = {
      ...article.toObject(),
      id: String(article._id),
      author: article.populated('author')
        ? {
            ...(article.author as any).toObject(),
            id: (article.author as any)._id.toString(),
          }
        : { id: (article.author as mongoose.Types.ObjectId).toString() },
    };
    
    // _id alanlarını temizle
    delete (formattedArticle as any)._id;
    delete (formattedArticle.author as any)._id;

    // Kullanıcıya göre alanları seç
    const articleData = {
      id: article._id instanceof mongoose.Types.ObjectId ? article._id.toString() : String(article._id),
      title: article.title,
      blocks: article.blocks,
      author: {
        id: (article.author as any)._id.toString(),
        name: (article.author as any).name,
        lastname: (article.author as any).lastname,
        avatar: (article.author as any).avatar || null
      },
      status: article.status,
      tags: article.tags || [],
      views: article.views,
      likeCount: article.likeCount || 0,
      dislikeCount: article.dislikeCount || 0,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      publishedAt: article.publishedAt || null,
      thumbnail: article.thumbnail || null, // Thumbnail alanını ekle
    };
    
    return NextResponse.json({
      success: true,
      article: articleData
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Bir hata oluştu'
      },
      { status: 500 }
    );
  }
}

// Makale güncelleme
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
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
    
    const articleId = params.id;
    if (!articleId || !mongoose.Types.ObjectId.isValid(articleId)) {
      return NextResponse.json(
        { success: false, message: 'Geçersiz makale kimliği' },
        { status: 400 }
      );
    }
    
    // İstek gövdesini al
    const body = await req.json();
    const { title, blocks, status, tags, thumbnail } = body; // thumbnail değeri de alınacak
    
    
    // Başlık kontrolü
    if (title !== undefined && (!title || !title.trim())) {
      return NextResponse.json(
        { success: false, message: 'Başlık gereklidir' },
        { status: 400 }
      );
    }
    
    // Blok kontrolü
    if (blocks !== undefined && (!blocks || !Array.isArray(blocks) || blocks.length === 0)) {
      return NextResponse.json(
        { success: false, message: 'En az bir içerik bloğu gereklidir' },
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
    
    // Admin işlemi kontrolü - admin veya superadmin admin API'sine yönlendirilmeli
    const isAdmin = token.role === UserRole.ADMIN || token.role === UserRole.SUPERADMIN;
    const isAuthor = article.author.toString() === token.id;
    
    // Admin kullanıcıları admin API'sine yönlendir
    if (isAdmin) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'İşleminiz yapılamıyor.',
        },
        { status: 410 }  // 410 Gone status - bu endpoint artık admin işlemleri için kullanılmıyor
      );
    }
    
    // Admin değilse ve yazar değilse güncelleme izni yok
    if (!isAuthor) {
      return NextResponse.json(
        { success: false, message: 'Bu makaleyi güncelleme yetkiniz yok' },
        { status: 403 }
      );
    }
    
    // Normal kullanıcılar için durum değişikliği kısıtlaması
    if (status !== undefined && status !== article.status) {
      return NextResponse.json(
        { success: false, message: 'Makale durumunu değiştirme yetkiniz yok' },
        { status: 403 }
      );
    }
    
    // Güncellenecek alanları belirle
    const updates: any = {};
    
    // Yazar için izin verilen alanlar
    if (title !== undefined) {
      updates.title = title;
      
      // Başlık değiştiğinde ve etiketler mevcutsa slug da güncellenmeli
      if (title) {
        const currentTags = tags !== undefined ? tags : article.tags;
        updates.slug = createArticleSlug(title, currentTags, params.id);
      }
    }
    if (blocks !== undefined) updates.blocks = blocks;
    if (tags !== undefined) {
      updates.tags = tags;
      
      // Etiketler değiştiğinde ve başlık varsa slug da güncellenmeli
      if (title !== undefined) {
        updates.slug = createArticleSlug(title, tags, params.id);
      } else if (article.title) {
        updates.slug = createArticleSlug(article.title, tags, params.id);
      }
    }
    if (thumbnail !== undefined) updates.thumbnail = thumbnail;
    
    // Admin olmayan kullanıcılar sadece kendi makalelerini güncelleyebilir
    if (!isAdmin && status !== undefined && status !== article.status) {
      return NextResponse.json(
        { success: false, message: 'Makale durumunu değiştirme yetkiniz yok' },
        { status: 403 }
      );
    }
    
    // Admin olmayan kullanıcılar için izin verilen alanlar
    if (isAuthor) {
      if (title !== undefined) updates.title = title;
      if (blocks !== undefined) updates.blocks = blocks;
      if (tags !== undefined) updates.tags = tags;
      if (thumbnail !== undefined) updates.thumbnail = thumbnail;
    }
    
    // Admin kullanıcılar veya makale sahibi için durum güncellemesi
    if (status !== undefined) {
      updates.status = status;
      
      // Enum doğrulaması yap
      if (!Object.values(ArticleStatus).includes(status as ArticleStatus)) {
        return NextResponse.json(
          { success: false, message: `Geçersiz durum değeri.` },
          { status: 400 }
        );
      }
      
      // Eğer durum "PENDING_APPROVAL" olarak değişiyorsa ve daha önce DRAFT ise
      if (status === ArticleStatus.PENDING_APPROVAL && article.status === ArticleStatus.DRAFT) {
        // Reddetme bilgilerini temizle (eğer önceden reddedilmişse)
        updates.rejection = {
          reason: null,
          date: null
        };
      }
      // Eğer durum "published" olarak değişiyorsa ve daha önce published değilse
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
        thumbnail: updatedArticle.thumbnail, // Thumbnail bilgisini de dönelim
        updatedAt: updatedArticle.updatedAt
      }
    });
    
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Bir hata oluştu',
      },
      { status: 500 }
    );
  }
}

// Makale güncelleme
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Kimlik doğrulama kontrolü
    const token = await authenticateUser(req);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Giriş yapmalısınız' },
        { status: 401 }
      );
    }
    
    const articleId = params.id;
    if (!articleId || !mongoose.Types.ObjectId.isValid(articleId)) {
      return NextResponse.json(
        { success: false, message: 'Geçersiz makale kimliği' },
        { status: 400 }
      );
    }
    
    // İstek verisini önce string olarak alıp inceleyebiliriz
    const requestBody = await req.text();
    
    // Sonra JSON olarak parse edelim
    const body = JSON.parse(requestBody);
    const { title, blocks, status, tags, thumbnail } = body;
    
    
    // Başlık kontrolü
    if (title !== undefined && (!title || !title.trim())) {
      return NextResponse.json(
        { success: false, message: 'Başlık gereklidir' },
        { status: 400 }
      );
    }
    
    // Blok kontrolü
    if (blocks !== undefined && (!blocks || !Array.isArray(blocks) || blocks.length === 0)) {
      return NextResponse.json(
        { success: false, message: 'En az bir içerik bloğu gereklidir' },
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
    
    // Makale sahibi değilse güncelleme izni yok
    if (article.author.toString() !== token.id) {
      return NextResponse.json(
        { success: false, message: 'Bu makaleyi güncelleme yetkiniz yok' },
        { status: 403 }
      );
    }
    
    // Güncellenebilir alanlar
    const updateData: any = {
      title,
      blocks,
      updatedAt: new Date()
    };
    
    // Opsiyonel alanlar
    if (status) updateData.status = status;
    if (tags) updateData.tags = tags;
    
    // Thumbnail değerini her durumda eklemeliyiz (null olsa bile)
    updateData.thumbnail = thumbnail;
    
    // Slug'ı güncelle
    updateData.slug = createArticleSlug(title, tags || article.tags, params.id);
    
    // Makaleyi güncelle
    const updatedArticle = await Article.findByIdAndUpdate(
      params.id,
      { $set: updateData },
      { new: true }
    );
    
    if (!updatedArticle) {
      return NextResponse.json(
        { success: false, message: 'Makale bulunamadı' },
        { status: 404 }
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
        success: false, 
        message: 'Bir hata oluştu',
      },
      { status: 500 }
    );
  }
}

// Makale silme
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Kimlik doğrulama kontrolü
    const token = await authenticateUser(req);
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Yetkilendirme başarısız' },
        { status: 401 }
      );
    }

    const articleId = params.id;
    await connectToDatabase();

    // Makaleyi bul
    const article = await Article.findById(articleId).select('author thumbnail blocks');
    
    if (!article) {
      return NextResponse.json(
        { success: false, message: 'Makale bulunamadı' },
        { status: 404 }
      );
    }

    // Yetki kontrolü - yalnızca makale sahibi veya admin silebilir
    const isAuthor = article.author.toString() === token.id;
    const isAdmin = token.role === UserRole.ADMIN || token.role === UserRole.SUPERADMIN;

    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Bu işlem için yetkiniz yok' },
        { status: 403 }
      );
    }

    // Makaleye ait görselleri topla
    const imageUrls: string[] = [];
    
    // Thumbnail varsa ekle
    if (article.thumbnail) {
      imageUrls.push(article.thumbnail);
    }
    
    // İçerik bloklarından görsel URL'lerini çıkar
    if (article.blocks && Array.isArray(article.blocks)) {
      article.blocks.forEach((block: any) => {
        // Görsel tipi blokların URL'leri
        if (block.type === 'image' && block.imageUrl) {
          imageUrls.push(block.imageUrl);
        }
      });
    }
    
    // Önce makaleyi veritabanından sil
    await Article.findByIdAndDelete(articleId);

    // Ardından görselleri Cloudinary'den sil
    if (imageUrls.length > 0) {
      const deleteResult = await deleteMultipleImages(imageUrls);
    }

    return NextResponse.json({
      success: true,
      message: 'Makale başarıyla silindi',
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Makale silinemedi',
      },
      { status: 500 }
    );
  }
}

// Makaleyi reddetme işlemi /api/admin/articles altında işlenmeli
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Token kontrolünü yapalım
    const token = await authenticateUser(req);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Giriş yapmalısınız' },
        { status: 401 }
      );
    }
    
    // Admin olup olmadığını kontrol et
    if (token.role === UserRole.ADMIN || token.role === UserRole.SUPERADMIN) {
      // Admin işlemleri için doğru endpoint'e yönlendir
      return NextResponse.json(
        { 
          success: false, 
          message: 'İşleminiz yapılamıyor.',
        },
        { status: 410 }  // 410 Gone status - bu endpoint artık bu işlem için kullanılmıyor
      );
    }
    
    // Normal kullanıcılar için bu işlem izin verilmiyor
    return NextResponse.json(
      { success: false, message: 'Bu işlem için admin yetkisi gereklidir' },
      { status: 403 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}

