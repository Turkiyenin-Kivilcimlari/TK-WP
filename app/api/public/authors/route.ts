import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Article, { ArticleStatus } from '@/models/Article';
import { encryptedJson } from '@/lib/response';

// Dynamic rendering için yapılandırma
export const dynamic = 'force-dynamic';

// Makalesi olan tüm yazarları getir (herkes erişebilir)
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    
    // Yayınlanmış makalesi olan yazarların ID'lerini bul
    const articleAuthors = await Article.distinct('author', { 
      status: ArticleStatus.PUBLISHED 
    });
    
    if (!articleAuthors || articleAuthors.length === 0) {
      return encryptedJson({
        success: true,
        authors: []
      });
    }
    
    // Bu yazarların bilgilerini getir
    const authors = await User.find(
      { _id: { $in: articleAuthors } },
      'name lastname avatar'
    ).lean();
    
    // Yazarların bilgilerini formatla
    const formattedAuthors = authors.map(author => ({
      id: author._id.toString(),
      fullname: `${author.name || ''} ${author.lastname || ''}`.trim(),
      avatar: author.avatar
    }));
    
    return encryptedJson({
      success: true,
      authors: formattedAuthors
    });
    
  } catch (error: any) {
    return encryptedJson(
      { success: false, message: 'Yazarları getirirken bir hata oluştu' },
      { status: 500 }
    );
  }
}
