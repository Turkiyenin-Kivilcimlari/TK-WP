import { connectToDatabase } from '@/lib/mongodb';
import Comment from '@/models/Comment';
import { authenticateUser } from '@/middleware/authMiddleware';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Bir yorumu beğenme, beğenmeme veya reaksiyonu kaldırma
export async function POST(
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

    const userId = token.id;
    const commentId = params.id;
    const { reactionType } = await req.json();

    if (!reactionType || !['like', 'dislike'].includes(reactionType)) {
      return NextResponse.json(
        { success: false, message: 'Geçersiz reaksiyon tipi' },
        { status: 400 }
      );
    }

    // ObjectId kontrolü
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return NextResponse.json(
        { success: false, message: 'Geçersiz yorum ID formatı' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Yorumun var olup olmadığını kontrol et
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return NextResponse.json(
        { success: false, message: 'Yorum bulunamadı' },
        { status: 404 }
      );
    }

    // Kullanıcının mevcut reaksiyonunu kontrol et
    const existingReactionIndex = comment.reactions.findIndex(
      (reaction: any) => reaction.user.toString() === userId
    );

    // Eğer reaksiyon varsa ve aynı tipte ise kaldır
    if (existingReactionIndex !== -1 && comment.reactions[existingReactionIndex].type === reactionType) {
      comment.reactions.splice(existingReactionIndex, 1);
      await comment.updateReactionCounts();

      return NextResponse.json({
        success: true,
        reaction: null,
        message: 'Reaksiyon kaldırıldı'
      });
    } 
    // Eğer reaksiyon varsa ve farklı tipte ise güncelle
    else if (existingReactionIndex !== -1) {
      comment.reactions[existingReactionIndex].type = reactionType;
      await comment.updateReactionCounts();

      return NextResponse.json({
        success: true,
        reaction: reactionType,
        message: `Yorum ${reactionType === 'like' ? 'beğenildi' : 'beğenilmedi'}`
      });
    } 
    // Reaksiyon yoksa yeni oluştur
    else {
      comment.reactions.push({
        user: new mongoose.Types.ObjectId(userId),
        type: reactionType,
        createdAt: new Date()
      });
      
      await comment.updateReactionCounts();

      return NextResponse.json({
        success: true,
        reaction: reactionType,
        message: `Yorum ${reactionType === 'like' ? 'beğenildi' : 'beğenilmedi'}`
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}

// Yorum reaksiyon durumunu ve sayısını getir
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const commentId = params.id;
    
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
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return NextResponse.json(
        { success: false, message: 'Geçersiz yorum ID formatı' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Yorumu getir
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return NextResponse.json(
        { success: false, message: 'Yorum bulunamadı' },
        { status: 404 }
      );
    }

    // Kullanıcının reaksiyonunu kontrol et
    if (userId) {
      const userReactionObj = comment.reactions.find(
        (reaction: any) => reaction.user.toString() === userId
      );
      
      if (userReactionObj) {
        userReaction = userReactionObj.type;
      }
    }

    return NextResponse.json({
      success: true,
      likeCount: comment.likeCount,
      dislikeCount: comment.dislikeCount,
      userReaction
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}
