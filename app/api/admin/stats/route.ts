export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Article from '@/models/Article';
import { checkAdminAuthWithTwoFactor } from '@/middleware/authMiddleware';
import { encryptedJson } from '@/lib/response';

// Promise.allSettled kullanarak veritabanı işlemlerini paralel çalıştırma
export async function GET(req: NextRequest) {
  try {
    // Admin işlemi olduğu için 2FA kontrolü ekliyoruz
    const adminCheck = await checkAdminAuthWithTwoFactor(req);
    if (adminCheck) return adminCheck;
    
    // Veritabanı bağlantısı
    await connectToDatabase();
    
    // Tarih hesaplamaları
    const thisMonth = new Date();
    thisMonth.setDate(1); // Ayın 1'i
    thisMonth.setHours(0, 0, 0, 0); // Günün başlangıcı
    
    // Geçen ay
    const lastMonth = new Date(thisMonth);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    // Tüm veritabanı sorgularını paralel olarak çalıştır
    // Bu performansı önemli ölçüde artırır
    const [
      totalUsersResult,
      newUsersResult,
      lastMonthUsersResult,
      publishedArticlesResult,
      thisMonthArticlesResult,
      lastMonthArticlesResult
    ] = await Promise.allSettled([
      User.countDocuments().lean().exec(),
      User.countDocuments({ createdAt: { $gte: thisMonth } }).lean().exec(),
      User.countDocuments({
        createdAt: { $gte: lastMonth, $lt: thisMonth }
      }).lean().exec(),
      Article.countDocuments({
        status: { $regex: new RegExp('^published$', 'i') }
      }).lean().exec(),
      Article.countDocuments({
        createdAt: { $gte: thisMonth },
        status: { $regex: new RegExp('^published$', 'i') }
      }).lean().exec(),
      Article.countDocuments({
        createdAt: { $gte: lastMonth, $lt: thisMonth },
        status: { $regex: new RegExp('^published$', 'i') }
      }).lean().exec()
    ]);
    
    // Promise sonuçlarını güvenli şekilde çıkar
    const totalUsers = totalUsersResult.status === 'fulfilled' ? totalUsersResult.value : 0;
    const newUsers = newUsersResult.status === 'fulfilled' ? newUsersResult.value : 0;
    const lastMonthUsers = lastMonthUsersResult.status === 'fulfilled' ? lastMonthUsersResult.value : 0;
    
    const publishedArticles = publishedArticlesResult.status === 'fulfilled' ? publishedArticlesResult.value : 0;
    const thisMonthArticles = thisMonthArticlesResult.status === 'fulfilled' ? thisMonthArticlesResult.value : 0;
    const lastMonthArticles = lastMonthArticlesResult.status === 'fulfilled' ? lastMonthArticlesResult.value : 0;
    
    // Yüzdesel değişim hesabı
    let percentChange = 0;
    if (lastMonthUsers > 0) {
      percentChange = Math.round(((newUsers - lastMonthUsers) / lastMonthUsers) * 100);
    } else if (newUsers > 0) {
      percentChange = 100; // Geçen ay 0, bu ay var - %100 artış
    }
    
    // Makale değişim yüzdesi
    let monthlyChange = 0;
    if (lastMonthArticles > 0) {
      monthlyChange = Math.round(((thisMonthArticles - lastMonthArticles) / lastMonthArticles) * 100);
    } else if (thisMonthArticles > 0) {
      monthlyChange = 100; // Geçen ay 0, bu ay var - %100 artış
    }
    
    // Aktif projeler (dummy data)
    const activeProjects = { 
      count: 12, 
      change: 2 
    };
    
    // API yanıtı - tutarlı veri yapısı
    return encryptedJson({
      success: true,
      totalUsers,
      newUsers: {
        count: newUsers,
        percentChange
      },
      activeProjects,
      contentCount: {
        count: publishedArticles,
        change: monthlyChange
      },
      // Dashboard için gereken ek veri yapısı
      totalCount: publishedArticles,
      monthlyChange
    });
    
  } catch (error) {
    console.error("Stats API error:", error);
    return encryptedJson(
      { 
        success: false, 
        message: 'İstatistik verileri alınamadı',
        error: error instanceof Error ? error.message : 'Bilinmeyen hata',
        // Dashboard'ın hata durumunda kullanacağı minimum veri
        totalUsers: 0,
        newUsers: { count: 0, percentChange: 0 },
        activeProjects: { count: 0, change: 0 },
        contentCount: { count: 0, change: 0 },
        totalCount: 0,
        monthlyChange: 0
      },
      { status: 500 }
    );
  }
}
