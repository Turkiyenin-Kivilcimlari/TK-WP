import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { checkAdminAuthWithTwoFactor } from '@/middleware/authMiddleware';
import Comment from '@/models/Comment';
import Article from '@/models/Article';
import { UserRole } from '@/models/User';
import mongoose from 'mongoose';
import { encryptedJson } from '@/lib/response';

// Tüm yorumları getirme (sadece admin için)
export async function GET(req: NextRequest) {
  try {
    // Admin işlemi olduğu için 2FA kontrolü ekliyoruz
    const adminCheck = await checkAdminAuthWithTwoFactor(req);
    if (adminCheck) return adminCheck;
    
    // Veritabanı bağlantısını kurmak için çağrıyı burada yapalım - öncelikli olarak
    await connectToDatabase();
    
    // Modellerimizin yüklenmesini sağlayalım (alternatif olarak)
    if (mongoose.models.Article === undefined) {
      require('@/models/Article');
    }

    // URL parametrelerini al
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const author = searchParams.get('author');
    const article = searchParams.get('article');
    
    // Arama sorgusu oluştur
    let query: any = {};
    
    // İçerik araması
    if (search) {
      query.content = { $regex: search, $options: 'i' };
    }
    
    // Yazar filtresi
    if (author && author !== 'all') {
      query.author = new mongoose.Types.ObjectId(author);
    }
    
    // Makale filtresi
    if (article && article !== 'all') {
      query.article = new mongoose.Types.ObjectId(article);
    }

    // Yorumları getir
    const comments = await Comment.find(query)
      .populate('author', 'name lastname') // email kaldırıldı
      .populate({
        path: 'article',
        select: 'title',
        model: 'Article'
      })
      .populate('parent', '_id')
      .sort({ createdAt: -1 });

    // Formatla
    const formattedComments = await Promise.all(comments.map(async comment => {
      const formattedComment = comment.toObject() as any;
      
      // ID formatını düzenle
      formattedComment.id = (formattedComment._id as mongoose.Types.ObjectId).toString();
      delete formattedComment._id;
      
      // Yazar bilgilerini düzenle
      if (formattedComment.author) {
        const author = formattedComment.author;
        formattedComment.authorId = author._id.toString();
        formattedComment.authorName = `${author.name || ''} ${author.lastname || ''}`.trim();
        delete formattedComment.author._id;
      }
      
      // Makale bilgilerini düzenle
      if (formattedComment.article) {
        const article = formattedComment.article;
        formattedComment.articleId = article._id.toString();
        formattedComment.articleTitle = article.title || 'İsimsiz Makale';
        delete formattedComment.article;
      }
      
      // Üst yorum bilgisini düzenle
      if (formattedComment.parent) {
        formattedComment.parentId = formattedComment.parent._id.toString();
        formattedComment.isReply = true;
        
        // Üst yorumu bulmak için fonksiyon
        const parentComment = await Comment.findById(formattedComment.parentId)
          .select('content author')
          .populate('author', 'name lastname');
          
        if (parentComment) {
          const parentAuthor = parentComment.author as any;
          formattedComment.parentAuthorName = `${parentAuthor.name || ''} ${parentAuthor.lastname || ''}`.trim();
          formattedComment.parentContent = parentComment.content;
        }
      } else {
        formattedComment.isReply = false;
      }
      
      delete formattedComment.parent;
      
      // Varsayılan olarak tüm yorumlar onaylı
      if (formattedComment.isApproved === undefined) {
        formattedComment.isApproved = true;
      }
      
      return formattedComment;
    }));
    
    return encryptedJson({
      success: true,
      comments: formattedComments
    });
    
  } catch (error: any) {
    return encryptedJson(
      { success: false, message: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}

// Bir yorumu silme (admin için)
export async function DELETE(req: NextRequest) {
  try {
    // Admin işlemi olduğu için 2FA kontrolü ekliyoruz
    const adminCheck = await checkAdminAuthWithTwoFactor(req);
    if (adminCheck) return adminCheck;

    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get('id');

    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
      return encryptedJson(
        { success: false, message: 'Geçersiz yorum kimliği' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Yorumu kontrol et
    const comment = await Comment.findById(commentId);
    
    if (!comment) {
      return encryptedJson(
        { success: false, message: 'Yorum bulunamadı' },
        { status: 404 }
      );
    }
    
    // Eğer ana yorum ise, alt yorumlarını da sil
    if (!comment.parent) {
      await Comment.deleteMany({ parent: commentId });
    }

    // Yorumu sil
    await Comment.findByIdAndDelete(commentId);

    return encryptedJson({
      success: true,
      message: 'Yorum başarıyla silindi'
    });
    
  } catch (error: any) {
    return encryptedJson(
      { success: false, message: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}
