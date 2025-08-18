import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Article, { ArticleStatus } from '@/models/Article';
import { ARTICLE_TAGS } from '@/lib/constants';
import { encryptedJson } from '@/lib/response';

// Dynamic rendering için yapılandırma
export const dynamic = 'force-dynamic';

// Kullanılan tüm etiketleri getir (herkes erişebilir)
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    
    // Yayınlanmış makalelerde kullanılan tüm etiketleri bul
    const usedTags = await Article.distinct('tags', { 
      status: ArticleStatus.PUBLISHED 
    });
    
    // ARTICLE_TAGS'den değer ve etiket bilgilerini al
    const formattedTags = usedTags.map((tag: string) => {
      // Sabit etiket listesinde bu etiket var mı kontrol et
      const predefinedTag = ARTICLE_TAGS.find(t => t.value === tag);
      
      return {
        value: tag,
        label: predefinedTag ? predefinedTag.label : tag // Eğer sabit listede varsa onun label'ını, yoksa direkt tag'in kendisini kullan
      };
    });
    
    return encryptedJson({
      success: true,
      tags: formattedTags
    });
    
  } catch (error: any) {
    return encryptedJson(
      { success: false, message: 'Etiketleri getirirken bir hata oluştu' },
      { status: 500 }
    );
  }
}
