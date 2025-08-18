import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Comment from '@/models/Comment';
import Article from '@/models/Article';
import { checkAdminAuthWithTwoFactor } from '@/middleware/authMiddleware';
import mongoose from 'mongoose';
import { encryptedJson } from '@/lib/response';

// Define an interface for the lean article result
interface ArticleLean {
  _id: mongoose.Types.ObjectId;
  title?: string;
}

// Dynamic rendering için yapılandırma
export const dynamic = 'force-dynamic';

// Yorum yapılan makaleleri getir (admin için)
export async function GET(req: NextRequest) {
  try {
    // Admin işlemi olduğu için 2FA kontrolü ekliyoruz
    const adminCheck = await checkAdminAuthWithTwoFactor(req);
    if (adminCheck) return adminCheck;

    await connectToDatabase();

    // Yorum yapılan makale ID'lerini topla
    const articleIds = await Comment.distinct('article');

    // Bu ID'lere sahip makaleleri getir
    const articles = await Article.find(
      { _id: { $in: articleIds } },
      'title'
    ).lean();

    // ID'leri string'e çevir
    const formattedArticles = articles.map((article: ArticleLean) => ({
      id: article._id.toString(),
      title: article.title || 'İsimsiz Makale'
    }));

    return encryptedJson({
      success: true,
      articles: formattedArticles
    });
  } catch (error: any) {
    return encryptedJson(
      { success: false, message: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}
