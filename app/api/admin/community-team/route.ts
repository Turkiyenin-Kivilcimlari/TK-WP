import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import {CommunityTeamMember} from '@/models/CommunityTeam';
import User from '@/models/User';
import { authenticateUser, checkAdminAuthWithTwoFactor } from '@/middleware/authMiddleware';
import { UserRole } from '@/models/User';
import { encryptedJson } from '@/lib/response';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Tüm topluluk takım üyelerini getir
export async function GET(req: NextRequest) {
  try {
    // Admin işlemi olduğu için 2FA kontrolü
    const adminCheck = await checkAdminAuthWithTwoFactor(req);
    if (adminCheck) return adminCheck;
    
    // Normal token kontrolü
    const token = await authenticateUser(req);
    if (!token) {
      return encryptedJson(
        { success: false, message: 'Giriş yapmalısınız' },
        { status: 401 }
      );
    }
    
    // Admin yetkisi kontrolü
    if (token.role !== UserRole.ADMIN && token.role !== UserRole.SUPERADMIN) {
      return encryptedJson(
        { success: false, message: 'Bu işlem için admin yetkisi gereklidir' },
        { status: 403 }
      );
    }

    await connectToDatabase();
    
    // Tüm takım üyelerini getir ve üniversite adına göre sırala
    const teamMembers = await CommunityTeamMember.find({}).sort({ university: 1 });
    
    return encryptedJson({
      success: true,
      teamMembers
    });
  } catch (error) {
    return encryptedJson(
      { success: false, message: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}

// Yeni topluluk takım üyesi ekleme
export async function POST(req: NextRequest) {
  try {
    // Admin işlemi olduğu için 2FA kontrolü
    const adminCheck = await checkAdminAuthWithTwoFactor(req);
    if (adminCheck) return adminCheck;
    
    // Normal token kontrolü
    const token = await authenticateUser(req);
    if (!token) {
      return encryptedJson(
        { success: false, message: 'Giriş yapmalısınız' },
        { status: 401 }
      );
    }
    
    // Admin yetkisi kontrolü
    if (token.role !== UserRole.ADMIN && token.role !== UserRole.SUPERADMIN) {
      return encryptedJson(
        { success: false, message: 'Bu işlem için admin yetkisi gereklidir' },
        { status: 403 }
      );
    }

    const { userId, title, university, photo } = await req.json();
    
    if (!userId || !title) {
      return encryptedJson(
        { success: false, message: 'Kullanıcı ID ve unvan gereklidir' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    
    // Kullanıcının varlığını kontrol et
    const user = await User.findById(userId);
    
    if (!user) {
      return encryptedJson(
        { success: false, message: 'Kullanıcı bulunamadı' },
        { status: 404 }
      );
    }
    
    // Kullanıcının zaten ekipte olup olmadığını kontrol et
    const existingMember = await CommunityTeamMember.findOne({ userId });
    
    if (existingMember) {
      return encryptedJson(
        { success: false, message: 'Bu kullanıcı zaten takımda' },
        { status: 400 }
      );
    }
    
    // Order alanı ile ilgili kod kaldırıldı
    
    // Yeni takım üyesini oluştur
    const newTeamMember = new CommunityTeamMember({
      userId,
      name: user.name,
      lastname: user.lastname,
      title,
      avatar: user.avatar,
      photo, // Özel fotoğraf
      university, // Üniversite bilgisi
      role: user.role,
      slug: user.slug
    });
    
    await newTeamMember.save();
    
    return encryptedJson({
      success: true,
      teamMember: newTeamMember
    });
    
  } catch (error) {
    return encryptedJson(
      { success: false, message: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}
