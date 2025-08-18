import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Comment from '@/models/Comment';
import Article from '@/models/Article';
import mongoose from 'mongoose';
import { UserRole } from '@/models/User';
import { authenticateUser } from '@/middleware/authMiddleware';
import { encryptedJson } from '@/lib/response';

// Yorumları getirme işlevi
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const articleId = params.id;

    if (!mongoose.isValidObjectId(articleId)) {
      return encryptedJson({ message: "Geçersiz makale ID'si" }, { status: 400 });
    }

    // Article modelini kontrol et - makale var mı?
    const article = await Article.findById(articleId);
    if (!article) {
      return encryptedJson({ message: "Makale bulunamadı" }, { status: 404 });
    }

    // Yorumları getir
    const comments = await Comment.find({ article: articleId, parent: null })
      .populate('author', 'name lastname avatar')
      .sort({ createdAt: -1 });

    // Formatlanmış yorumlar dizisi
    const formattedComments = [];

    // Alt yorumları getir ve formatla
    for (let i = 0; i < comments.length; i++) {
      const replies = await Comment.find({ article: articleId, parent: comments[i]._id })
        .populate('author', 'name lastname avatar')
        .sort({ createdAt: 1 });
      
      // Alt yorumları formatla
      const formattedReplies = replies.map(reply => {
        const replyObj = reply.toObject();
        
        // Alt yorum ID dönüşümü
        replyObj.id = (replyObj._id as any).toString();
        delete replyObj._id;
        
        // Alt yorum yazar ID dönüşümü
        if (replyObj.author && typeof replyObj.author === 'object' && '_id' in replyObj.author) {
          (replyObj.author as any).id = replyObj.author._id.toString();
          delete (replyObj.author as any)._id;
        }
        
        return replyObj;
      });
      
      // Ana yorumu formatla
      const commentObj = comments[i].toObject();
      
      // Ana yorum ID dönüşümü
      commentObj.id = (commentObj._id as any).toString();
      delete commentObj._id;
      
      // Ana yorum yazar ID dönüşümü
      if (commentObj.author && typeof commentObj.author !== 'string' && (commentObj.author as any)._id) {
        (commentObj.author as any).id = (commentObj.author as any)._id.toString();
        delete (commentObj.author as any)._id;
      }
      
      // Formatlanmış yorumu diziye ekle
      formattedComments.push({
        ...commentObj,
        replies: formattedReplies
      });
    }

    return encryptedJson({ success: true, comments: formattedComments });
  } catch (error: any) {
    return encryptedJson(
      { message: "Yorumlar yüklenirken bir hata oluştu." },
      { status: 500 }
    );
  }
}

// Yeni yorum ekleme
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Kimlik doğrulama kontrolü ekleyelim
    if (!session || !session.user) {
      return encryptedJson(
        { error: "Bu işlem için giriş yapmalısınız." },
        { status: 401 }
      );
    }

    const { id } = params;
    await connectToDatabase();

    const body = await request.json();
    
    // Author alanını oturumdaki kullanıcı ID'sinden alalım
    const comment = {
      ...body,
      author: session.user.id, // Kullanıcı ID'sini author olarak ekliyoruz
      article: id
    };

    const newComment = await Comment.create(comment);
    
    // Populasyonu yap
    const populatedComment = await Comment.findById(newComment._id)
      .populate('author', 'name lastname avatar');
    if (!populatedComment) {
      return encryptedJson(
        { success: false, message: 'Yorum bulunamadı' },
        { status: 404 }
      );
    }
    const formattedComment = populatedComment.toObject() as { _id: any; [key: string]: any };
    formattedComment.id = formattedComment._id.toString();
    delete formattedComment._id;
    
    // Yazar _id'sini id'ye dönüştür
    if (formattedComment.author && formattedComment.author._id) {
      (formattedComment.author as any).id = (formattedComment.author as any)._id.toString();
      delete (formattedComment.author as any)._id;
    }
    
    // Yanıt
    return encryptedJson({
      success: true,
      message: 'Yorum başarıyla eklendi',
      comment: formattedComment
    }, { status: 201 });
    
  } catch (error: any) {
    return encryptedJson(
      { success: false, message: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}
