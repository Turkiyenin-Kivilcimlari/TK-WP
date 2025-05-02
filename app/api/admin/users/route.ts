export const dynamic = 'force-dynamic';

import { connectToDatabase } from '@/lib/mongodb';
import User, { UserRole } from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuthWithTwoFactor } from '@/middleware/authMiddleware';
import { encryptedJson } from '@/lib/response';

// Tüm kullanıcıları getir (sadece yönetim üyeleri için)
export async function GET(req: NextRequest) {
  try {
    // Yetkilendirme kontrolü - 2FA dahil admin yetkisi kontrolü
    const authResponse = await checkAdminAuthWithTwoFactor(req);
    if (authResponse) return authResponse;
    
    await connectToDatabase();
    
    // Filtreleme ve sayfalama parametrelerini al
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const role = searchParams.get('role') as UserRole | null;
    const search = searchParams.get('search');
    
    const skip = (page - 1) * limit;
    
    // Sorgu oluştur
    const query: any = {};
    
    // Rol filtreleme
    if (role && Object.values(UserRole).includes(role)) {
      query.role = role;
    }
    
    // Arama filtreleme
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { lastname: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Kullanıcıları getir
    const users = await User.find(query)
      .select('name lastname email role avatar createdAt emailVerified twoFactorEnabled') // Sadece gerekli alanları seç, password ve twoFactorSecret hariç
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Toplam kullanıcı sayısını hesapla
    const total = await User.countDocuments(query);
    
    return encryptedJson({
      success: true,
      count: users.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      users
    });
  } catch (error) {
    return encryptedJson(
      { success: false, message: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
