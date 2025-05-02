import { connectToDatabase } from '@/lib/mongodb';
import User, { UserRole } from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, checkAdminAuthWithTwoFactor } from '@/middleware/authMiddleware';
import mongoose from 'mongoose';
import Article from '@/models/Article'; // Article modelini ekleyelim
import Comment from '@/models/Comment'; // Comment modelini ekleyelim
import { encryptedJson } from '@/lib/response';

// Kullanıcı bilgilerini güncelle (admin işlemi)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin işlemi olduğu için 2FA kontrolü ekliyoruz
    const adminCheck = await checkAdminAuthWithTwoFactor(req);
    if (adminCheck) return adminCheck;
    
    // Normal token kontrolünü de yap
    const token = await authenticateUser(req) as { role: UserRole; id: string };
    if (!token) {
      return encryptedJson(
        { success: false, message: 'Giriş yapmalısınız' },
        { status: 401 }
      );
    }
    
    const userId = params.id;
    
    // Geçerli bir MongoDB ID'si mi kontrol et
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return encryptedJson(
        { success: false, message: 'Geçersiz kullanıcı kimliği' },
        { status: 400 }
      );
    }
    
    // İstek gövdesini al
    const body = await req.json();
    const { name, lastname, phone, role } = body;
    
    await connectToDatabase();
    
    // Kullanıcıyı bul
    const user = await User.findById(userId);
    
    if (!user) {
      return encryptedJson(
        { success: false, message: 'Kullanıcı bulunamadı' },
        { status: 404 }
      );
    }
    
    // Yönetici değilse, sadece kendi bilgilerini güncelleyebilir
    if (token.role !== UserRole.ADMIN && token.role !== UserRole.SUPERADMIN && token.id !== userId) {
      return encryptedJson(
        { success: false, message: 'Bu kullanıcının bilgilerini güncelleme izniniz yok' },
        { status: 403 }
      );
    }
    
    // ADMIN rolündeki kullanıcıların rolünün değiştirilmesini engelle
    // SUPERADMIN ise bu kısıtlama olmayacak
    if (role && user.role === UserRole.ADMIN && token.role !== UserRole.SUPERADMIN) {
      return encryptedJson(
        { success: false, message: 'Yönetim üyelerinin rolü değiştirilemez' },
        { status: 403 }
      );
    }
    
    // Rol değişikliğini sadece yöneticiler yapabilir
    // ADMIN rolü artık sadece MEMBER ve REPRESENTATIVE rollerini değiştirebilir
    if (role && token.role !== UserRole.ADMIN && token.role !== UserRole.SUPERADMIN) {
      return encryptedJson(
        { success: false, message: 'Kullanıcı rolünü değiştirme yetkiniz yok' },
        { status: 403 }
      );
    }
    
    // SUPERADMIN olmayan bir yönetici diğer bir kullanıcıyı SUPERADMIN yapamaz
    if (role === UserRole.SUPERADMIN && token.role !== UserRole.SUPERADMIN) {
      return encryptedJson(
        { success: false, message: 'SUPERADMIN yetkisi atama yetkiniz yok' },
        { status: 403 }
      );
    }
    
    // Güncellenebilecek alanları belirle
    const updateData: any = {};
    
    if (name) updateData.name = name;
    if (lastname) updateData.lastname = lastname;
    if (phone) updateData.phone = phone;
    
    // Rol güncellemesini düzeltelim - SUPERADMIN ve ADMIN için izin verelim
    if (role) {
      // Token sahibi SUPERADMIN ise veya ADMIN ise (ve hedef kullanıcı ADMIN veya SUPERADMIN değilse)
      if (token.role === UserRole.SUPERADMIN || 
          (token.role === UserRole.ADMIN && 
           user.role !== UserRole.ADMIN && 
           user.role !== UserRole.SUPERADMIN)) {
        updateData.role = role;
      }
    }
    
    // Kullanıcıyı güncelle
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    ).select('-password');
    
    return encryptedJson({ 
      success: true, 
      message: 'Kullanıcı bilgileri güncellendi', 
      user: updatedUser 
    });
  } catch (error) {
    return encryptedJson(
      { success: false, message: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}

// Kullanıcıyı sil (yöneticiler ve süper yöneticiler için)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin işlemi olduğu için 2FA kontrolü ekliyoruz
    const adminCheck = await checkAdminAuthWithTwoFactor(req);
    if (adminCheck) return adminCheck;
    
    
    // Normal token kontrolünü de yap
    const token = await authenticateUser(req) as { role: UserRole; id: string };
    if (!token) {
      return encryptedJson(
        { success: false, message: 'Giriş yapmalısınız' },
        { status: 401 }
      );
    }

    // Sadece ADMIN ve SUPERADMIN rolündekilerin silme yetkisi var
    if (token.role !== UserRole.ADMIN && token.role !== UserRole.SUPERADMIN) {
      return encryptedJson(
        { success: false, message: 'Bu işlem için yetkiniz bulunmamaktadır' },
        { status: 403 }
      );
    }
    
    // Gelen ID'yi temizle ve kullan
    let userId = params.id;
    
    // ID parametresini daha iyi kontrol et
    if (!userId || userId === 'undefined' || userId === 'null') {
      return encryptedJson(
        { success: false, message: 'Geçerli bir kullanıcı kimliği belirtilmedi' },
        { status: 400 }
      );
    }
    
    // Geçerli bir MongoDB ID'si mi kontrol et
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return encryptedJson(
        { success: false, message: `Geçersiz kullanıcı kimliği formatı.` },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Kullanıcı var mı kontrol et
    const exists = await User.findById(userId);
    
    if (!exists) {
      return encryptedJson(
        { success: false, message: `Kullanıcı bulunamadı.` },
        { status: 404 }
      );
    }
    
    // ADMIN kullanıcılar ADMIN ve SUPERADMIN kullanıcıları silemez
    // Sadece SUPERADMIN diğer yönetici kullanıcıları silebilir
    if (token.role === UserRole.ADMIN && 
        (exists.role === UserRole.ADMIN || exists.role === UserRole.SUPERADMIN)) {
      return encryptedJson(
        { success: false, message: 'Yönetim üyelerinin hesaplarını silme yetkiniz bulunmamaktadır' },
        { status: 403 }
      );
    }
    
    // Süper yöneticiler bile diğer süper yöneticileri silemez (güvenlik için)
    if (token.role === UserRole.SUPERADMIN && exists.role === UserRole.SUPERADMIN) {
      return encryptedJson(
        { success: false, message: 'Süper yöneticiler birbirlerini silemez' },
        { status: 403 }
      );
    }
    

    // 1. Kullanıcının makalelerini sil
    const deletedArticles = await Article.deleteMany({ author: userId });
    
    // 2. Kullanıcının yorumlarını sil
    const deletedComments = await Comment.deleteMany({ author: userId });
    
    // 3. Kullanıcıyı sil
    const user = await User.findByIdAndDelete(userId);
    
    if (!user) {
      return encryptedJson(
        { success: false, message: 'Kullanıcı silinirken bir hata oluştu' },
        { status: 500 }
      );
    }
    
    return encryptedJson({
      success: true,
      message: 'Kullanıcı ve ilişkili tüm içerikleri başarıyla silindi',
      deletedData: {
        articles: deletedArticles.deletedCount,
        comments: deletedComments.deletedCount
      }
    });
  } catch (error: any) {
    return encryptedJson(
      { success: false, message: `Kullanıcı silinirken hata oluştu.` },
      { status: 500 }
    );
  }
}
