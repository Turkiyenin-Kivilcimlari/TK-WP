import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { checkAdminAuthWithTwoFactor } from '@/middleware/authMiddleware';
import Comment from '@/models/Comment';
import Article from '@/models/Article';
import mongoose from 'mongoose';
import { encryptedJson } from '@/lib/response';

// Dynamic rendering için yapılandırma
export const dynamic = 'force-dynamic';

// Tüm yorumları getirme (sadece admin için)
export async function GET(req: NextRequest) {
  try {
    // Admin işlemi olduğu için 2FA kontrolü ekliyoruz
    const adminCheck = await checkAdminAuthWithTwoFactor(req);
    if (adminCheck) return adminCheck;

    // Veritabanı bağlantısını kuralım
    await connectToDatabase();

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
      .populate('author', 'name lastname')
      .populate({
        path: 'article',
        select: 'title',
        model: 'Article'
      })
      .populate('parent', '_id content')
      .populate({
        path: 'parent',
        populate: {
          path: 'author',
          select: 'name lastname',
          model: 'User'
        }
      })
      .sort({ createdAt: -1 });

    // Yorumları formatla
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
        delete formattedComment.author;
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
        
        // Üst yorumun içeriği ve yazarı
        if (formattedComment.parent.content) {
          formattedComment.parentContent = formattedComment.parent.content;
          
          if (formattedComment.parent.author) {
            const parentAuthor = formattedComment.parent.author;
            formattedComment.parentAuthorName = `${parentAuthor.name || ''} ${parentAuthor.lastname || ''}`.trim();
          }
        }
      } else {
        formattedComment.isReply = false;
      }
      delete formattedComment.parent;
      
      return formattedComment;
    }));

    return encryptedJson({
      success: true,
      comments: formattedComments
    });
  } catch (error: any) {
    return encryptedJson(
      { success: false, message: 'Bir hata oluştu'},
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
      { success: false, message: 'Bir hata oluştu'},
      { status: 500 }
    );
  }
}
