import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Article, { ArticleStatus } from '@/models/Article';
import Event, { EventStatus } from '@/models/Event';
import { NextRequest } from 'next/server';
import { encryptedJson } from '@/lib/response';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';


interface Article {
    _id: mongoose.Types.ObjectId;
    title: string;
    slug: string;
    createdAt: Date;
    thumbnail?: string;
  }
  
  interface FormattedArticle {
    id: string;
    title: string;
    slug: string;
    createdAt: Date;
    thumbnail: string;
  }

// Slug ile kullanıcı profili getir
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    await connectToDatabase();
    
    const { slug } = params;
    
    // Kullanıcıyı bul (hassas alanları hariç tut)
    const user = await User.findOne({ slug }).select('name lastname avatar role slug about title createdAt')
    
    if (!user) {
      return encryptedJson(
        { success: false, message: 'Kullanıcı bulunamadı' },
        { status: 404 }
      );
    }
    
    // Kullanıcının yayınlanmış makalelerini getir
    const articles = await Article.find({
      author: user._id,
      status: ArticleStatus.PUBLISHED
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
    
    // Kullanıcının oluşturduğu etkinlikleri getir
    const events = await Event.find({
      author: user._id,
      status: EventStatus.APPROVED
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
    
    // Kullanıcının katıldığı etkinlikleri getir
    const participatedEvents = await Event.find({
      'participants.userId': user._id,
      status: EventStatus.APPROVED
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
    
    // Dönüş için kullanıcı verilerini hazırla
    const userData = {
      id: (user._id as mongoose.Types.ObjectId).toString(),
      name: user.name,
      lastname: user.lastname,
      fullName: `${user.name} ${user.lastname}`,
      avatar: user.avatar || '',
      role: user.role,
      slug: user.slug || '',
      about: user.about || '',
      title: user.title || '',
      createdAt: user.createdAt,
    };
    
    // Makaleleri formatla
    const formattedArticles = articles.map((article: Article) => ({
      id: article._id.toString(),
      title: article.title,
      slug: article.slug,
      createdAt: article.createdAt,
      thumbnail: article.thumbnail || '',
    }));
    
    // Etkinlikleri formatla
    const formattedEvents = events.map(event => ({
      id: event._id.toString(),
      title: event.title,
      slug: event.slug,
      coverImage: event.coverImage || '',
      eventType: event.eventType,
      status: event.status,
      eventDate: event.eventDays && event.eventDays.length > 0 ? event.eventDays[0].date : null,
    }));
    
    // Katıldığı etkinlikleri formatla
    const formattedParticipatedEvents = participatedEvents.map(event => ({
      id: event._id.toString(),
      title: event.title,
      slug: event.slug,
      coverImage: event.coverImage || '',
      eventType: event.eventType,
      status: event.status,
      eventDate: event.eventDays && event.eventDays.length > 0 ? event.eventDays[0].date : null,
    }));
    
    return encryptedJson({
      success: true,
      user: userData,
      articles: formattedArticles,
      events: formattedEvents,
      participatedEvents: formattedParticipatedEvents
    });
    
  } catch (error) {
    console.error("Profil API hatası:", error);
    return encryptedJson(
      { success: false, message: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
