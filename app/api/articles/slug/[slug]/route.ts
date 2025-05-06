import { connectToDatabase } from '@/lib/mongodb';
import Article, { ArticleStatus } from '@/models/Article';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/middleware/authMiddleware';
import mongoose from 'mongoose';
import { UserRole } from '@/models/User';
import { encryptedJson } from '@/lib/response';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Fetch article by slug
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // Token check (optional) - only author or admin can see non-published articles
    const token = await authenticateUser(req);
    
    await connectToDatabase();
    
    const slug = params.slug;
    
    if (!slug) {
      return encryptedJson(
        { success: false, message: 'Slug ifadesi zorunludur.' },
        { status: 400 }
      );
    }
    
    // Get the article with the author information
    const article = await Article.findOne({ slug }).populate('author', 'name lastname avatar slug ');
    
    if (!article) {
      return encryptedJson(
        { success: false, message: 'Yazı bulunamadı' },
        { status: 404 }
      );
    }
    
    // Authorization check - only published articles are visible to everyone
    // For other statuses, the user must be the author or an admin
    if (article.status !== ArticleStatus.PUBLISHED) {
      const isAuthorized = token && (
        article.author._id.toString() === token.id || 
        token.role === UserRole.ADMIN || 
        token.role === UserRole.SUPERADMIN
      );
      
      if (!isAuthorized) {
        return encryptedJson(
          { success: false, message: 'Bu yazıyı görüntüleme izniniz yok.' },
          { status: 403 }
        );
      }
    }
    
    // Increment view count - if the viewer is not the article owner
    if (token && article.author._id.toString() !== token.id) {
      await Article.findByIdAndUpdate(article._id, { $inc: { views: 1 } });
    }
    
    // Format the article for the client
    const formattedArticle = article.toObject();
    
    // Convert ObjectId to string id
    formattedArticle.id = (formattedArticle._id as mongoose.Types.ObjectId).toString();
    delete formattedArticle._id;
    
    // Format author data
    if (formattedArticle.author && formattedArticle.author._id) {
      (formattedArticle.author as any).id = formattedArticle.author._id.toString();
      delete formattedArticle.author._id;
    }

    return encryptedJson({
      success: true,
      article: formattedArticle
    });
    
  } catch (error: any) {
    return encryptedJson(
      { 
        success: false, 
        message: 'Yazı yüklenirken bir hata oluştu.',
      },
      { status: 500 }
    );
  }
}
