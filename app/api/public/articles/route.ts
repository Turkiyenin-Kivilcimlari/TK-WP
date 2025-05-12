import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { encryptedJson } from '@/lib/response';

// Dynamic rendering için yapılandırma
export const dynamic = 'force-dynamic';

// Makaleleri getir
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    
    // Modelleri bağlantı kurulduktan sonra import et
    const Article = (await import('@/models/Article')).default;
    const User = (await import('@/models/User')).default;
    
    // URL parametrelerini al
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const tag = searchParams.get('tag') || '';
    const authorId = searchParams.get('author') || '';
    
    const skip = (page - 1) * limit;
    
    // Sorgu filtresi oluştur
    let filter: any = { status: 'published' };
    
    // Arama filtresi
    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }
    
    // Etiket filtresi
    if (tag) {
      filter.tags = tag;
    }
    
    // Yazar filtresi
    if (authorId && mongoose.Types.ObjectId.isValid(authorId)) {
      filter.author = new mongoose.Types.ObjectId(authorId);
    }
    
    // Toplam sayıyı al
    const totalDocs = await Article.countDocuments(filter);
    
    // Makaleleri getir
    const articles = await Article.find(filter)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
      path: 'author',
      model: User,
      select: 'name lastname avatar slug -_id' // role ve slug kaldırıldı
      });
    
    return encryptedJson({
      success: true,
      articles,
      pagination: {
        total: totalDocs,
        page,
        limit,
        pages: Math.ceil(totalDocs / limit)
      }
    });
    
  } catch (error: any) {
    return encryptedJson(
      { success: false, error: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}
