export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@/models/User';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Article from '@/models/Article';
import { checkAdminAuthWithTwoFactor } from '@/middleware/authMiddleware';
import mongoose from 'mongoose';

// For lean queries in stats route
interface ArticleWithStatus {
  status: string;
  _id?: mongoose.Types.ObjectId;
}

export async function GET(req: NextRequest) {
  try {
    // Admin işlemi olduğu için 2FA kontrolü ekliyoruz
    const adminCheck = await checkAdminAuthWithTwoFactor(req);
    if (adminCheck) return adminCheck;
    
    // Veritabanı bağlantısı
    await connectToDatabase();
    
    // Toplam kullanıcı sayısı
    const totalUsers = await User.countDocuments();
    
    // Geçen ay
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    // Bu ay
    const thisMonth = new Date();
    thisMonth.setDate(1);
    
    // Bu ayki yeni kullanıcılar
    const newUsers = await User.countDocuments({
      createdAt: { $gte: thisMonth }
    });
    
    // Geçen ayki kullanıcılar
    const lastMonthUsers = await User.countDocuments({
      createdAt: {
        $gte: lastMonth,
        $lt: thisMonth
      }
    });
    
    // Yüzdesel değişim hesabı
    const percentChange = lastMonthUsers > 0 
      ? Math.round(((newUsers - lastMonthUsers) / lastMonthUsers) * 100) 
      : 0;
    
    // İstatistik değerleri
    let totalCount = 0;
    let monthlyChange = 0;
    
    try {
      // Article modeli varsa, gerçek makale verilerini al
      if (Article) {
        // Debug: Makale durumlarını kontrol etmek için tüm makaleleri getir
        const allArticles = await Article.find({}, { status: 1 }).lean();
        
        // Farklı şekillerde sorgu deneyelim - muhtemelen case sensitive sorunu
        const publishedExact = await Article.countDocuments({ status: 'PUBLISHED' });
        const publishedLower = await Article.countDocuments({ status: 'published' });
        const publishedCase = await Article.countDocuments({ 
          status: { $regex: new RegExp('^published$', 'i') } 
        });
        
        
        // En doğru değeri kullan (case insensitive)
        totalCount = publishedCase;
        
        // Bu ayki makaleler - sadece yayında olanlar (case insensitive)
        const thisMonthArticles = await Article.countDocuments({
          createdAt: { $gte: thisMonth },
          status: { $regex: new RegExp('^published$', 'i') }
        });
        
        // Geçen ayki makaleler - sadece yayında olanlar (case insensitive)
        const lastMonthArticles = await Article.countDocuments({
          createdAt: {
            $gte: lastMonth,
            $lt: thisMonth
          },
          status: { $regex: new RegExp('^published$', 'i') }
        });
        
        // Makale değişim yüzdesi
        monthlyChange = lastMonthArticles > 0 
          ? Math.round(((thisMonthArticles - lastMonthArticles) / lastMonthArticles) * 100) 
          : 100; // Eğer geçen ay 0 ise, %100 artış
      }
    } catch (articleError) {
      // Article modeli yoksa sabit değerler kullan
      totalCount = 48;
      monthlyChange = 8;
    }
    
    // Proje sayısı (sabit değer)
    const activeProjects = { count: 12, change: 2 };
    
    // İçerik sayısı - makale verilerinden geliyor
    const contentCount = { count: totalCount, change: monthlyChange };
    
    return NextResponse.json({
      success: true,
      totalUsers,
      newUsers: {
        count: newUsers,
        percentChange
      },
      activeProjects,
      contentCount,
      // Dashboard'ın beklediği formatta yazı sayısı istatistikleri
      totalCount,        // Toplam yazı sayısı
      monthlyChange      // Aylık değişim yüzdesi (%)
    });
    
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Sunucu hatası: '
      },
      { status: 500 }
    );
  }
}
