import { connectToDatabase } from '@/lib/mongodb';
import Article from '@/models/Article';
import { authenticateUser } from '@/middleware/authMiddleware';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { encryptedJson } from '@/lib/response';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Bir makaleyi beğenme, beğenmeme veya reaksiyonu kaldırma
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Kimlik doğrulama kontrolü
    const token = await authenticateUser(req);
    if (!token) {
      return encryptedJson(
        { success: false, message: 'Giriş yapmalısınız' },
        { status: 401 }
      );
    }

    const userId = token.id;
    const articleId = params.id;
    const { reactionType } = await req.json();

    if (!reactionType || !['like', 'dislike'].includes(reactionType)) {
      return encryptedJson(
        { success: false, message: 'Geçersiz reaksiyon tipi' },
        { status: 400 }
      );
    }

    // ObjectId kontrolü
    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      return encryptedJson(
        { success: false, message: 'Geçersiz makale ID formatı' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Makalenin var olup olmadığını kontrol et
    const article = await Article.findById(articleId);
    if (!article) {
      return encryptedJson(
        { success: false, message: 'Makale bulunamadı' },
        { status: 404 }
      );
    }

    // Kullanıcının mevcut reaksiyonunu kontrol et
    const existingReactionIndex = article.reactions.findIndex(
      (reaction: any) => reaction.user.toString() === userId
    );

    // Eğer reaksiyon varsa ve aynı tipte ise kaldır
    if (existingReactionIndex !== -1 && article.reactions[existingReactionIndex].type === reactionType) {
      article.reactions.splice(existingReactionIndex, 1);
      await article.updateReactionCounts();

      return encryptedJson({
        success: true,
        reaction: null,
        message: 'Reaksiyon kaldırıldı'
      });
    } 
    // Eğer reaksiyon varsa ve farklı tipte ise güncelle
    else if (existingReactionIndex !== -1) {
      article.reactions[existingReactionIndex].type = reactionType;
      await article.updateReactionCounts();

      return encryptedJson({
        success: true,
        reaction: reactionType,
        message: `Makale ${reactionType === 'like' ? 'beğenildi' : 'beğenilmedi'}`
      });
    } 
    // Reaksiyon yoksa yeni oluştur
    else {
      article.reactions.push({
        user: new mongoose.Types.ObjectId(userId),
        type: reactionType,
        createdAt: new Date()
      });
      
      await article.updateReactionCounts();

      return encryptedJson({
        success: true,
        reaction: reactionType,
        message: `Makale ${reactionType === 'like' ? 'beğenildi' : 'beğenilmedi'}`
      });
    }
  } catch (error: any) {
    return encryptedJson(
      { success: false, message: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}

// Makale reaksiyon durumunu ve sayısını getir
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const articleId = params.id;
    
    // Token varsa kullanıcının reaksiyon durumunu kontrol et
    let userId = null;
    let userReaction = null;
    
    try {
      const token = await authenticateUser(req);
      if (token) {
        userId = token.id;
      }
    } catch (error) {
      // Token yoksa sessiz bir şekilde devam et
    }

    // ObjectId kontrolü
    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      return encryptedJson(
        { success: false, message: 'Geçersiz makale ID formatı' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Makaleyi getir
    const article = await Article.findById(articleId);
    if (!article) {
      return encryptedJson(
        { success: false, message: 'Makale bulunamadı' },
        { status: 404 }
      );
    }

    // Kullanıcının reaksiyonunu kontrol et
    if (userId) {
      const userReactionObj = article.reactions.find(
        (reaction: any) => reaction.user.toString() === userId
      );
      
      if (userReactionObj) {
        userReaction = userReactionObj.type;
      }
    }

    return encryptedJson({
      success: true,
      likeCount: article.likeCount,
      dislikeCount: article.dislikeCount,
      userReaction
    });
  } catch (error: any) {
    return encryptedJson(
      { success: false, message: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}
