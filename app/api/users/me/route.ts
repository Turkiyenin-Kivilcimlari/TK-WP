import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/middleware/authMiddleware';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { encryptedJson } from '@/lib/response';
import slugify from 'slugify';

// Force this route to be dynamically rendered
export const dynamic = 'force-dynamic';

// Kullanıcının kendi bilgilerini getir
export async function GET(req: NextRequest) {
  try {
    // Önce server session'ı kontrol et, sonra token'a bak
    const session = await getServerSession(authOptions);
    let userId;
    
    if (session?.user?.id) {
      // Server session var, bu ID'yi kullan
      userId = session.user.id;
    } else {
      // Session yoksa JWT token'ı kontrol et
      const token = await authenticateUser(req);
      if (!token || typeof token === 'string') {
        return encryptedJson(
          { success: false, message: 'Giriş yapmalısınız' },
          { status: 401 }
        );
      }
      userId = token.id;
    }
    
    await connectToDatabase();
    
    // Kullanıcıyı bul ve hassas alanları hariç tut
    const user = await User.findById(userId).select('-password -twoFactorSecret');
    
    if (!user) {
      return encryptedJson(
        { success: false, message: 'Kullanıcı bulunamadı' },
        { status: 404 }
      );
    }
    
    return encryptedJson({ success: true, user });
  } catch (error) {
    return encryptedJson(
      { success: false, message: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}

// Kullanıcının kendi bilgilerini güncelleme
export async function PUT(req: NextRequest) {
  try {
    // Kimlik doğrulama kontrolü
    const token = await authenticateUser(req);
    if (!token || typeof token === 'string') {
      return encryptedJson(
        { success: false, message: 'Giriş yapmalısınız' },
        { status: 401 }
      );
    }
    
    const userId = token.id;
    
    // İstek gövdesini al
    const body = await req.json();
    const { name, lastname, phone, avatar, allowEmails, slug, about, title } = body;
    
    await connectToDatabase();
    
    // Kullanıcıyı bul
    const user = await User.findById(userId);
    
    if (!user) {
      return encryptedJson(
        { success: false, message: 'Kullanıcı bulunamadı' },
        { status: 404 }
      );
    }
    
    // Güncellenebilecek alanları belirle
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (lastname !== undefined) updateData.lastname = lastname;
    if (phone !== undefined) updateData.phone = phone;
    if (allowEmails !== undefined) updateData.allowEmails = allowEmails;
    if (about !== undefined) updateData.about = about;
    if (title !== undefined) updateData.title = title; // Title alanını ekleyelim
    
    // Slug özel işlemi - geçerli slug kontrolü
    if (slug !== undefined) {
      if (slug) {
        // Slug belirtilmişse, başka kullanıcı tarafından kullanılıp kullanılmadığını kontrol et
        const slugExists = await User.findOne({ 
          slug, 
          _id: { $ne: userId } 
        });
        
        if (slugExists) {
          return encryptedJson(
            { success: false, message: 'Bu profil URL\'si başka bir kullanıcı tarafından kullanılıyor' },
            { status: 400 }
          );
        }
        
        // Slug geçerli karakterler içeriyor mu kontrol et
        const slugRegex = /^[a-z0-9-]+$/;
        if (!slugRegex.test(slug)) {
          return encryptedJson(
            { success: false, message: 'Profil URL\'si yalnızca küçük harfler, sayılar ve tire içerebilir' },
            { status: 400 }
          );
        }
        
        updateData.slug = slug;
      } else if (slug === "") {
        // Slug boş gönderilmişse, ad ve soyadından otomatik oluştur
        const baseSlug = slugify(`${user.name} ${user.lastname}`);
        
        // Benzersiz slug oluştur
        let newSlug = baseSlug;
        let counter = 1;
        
        while (true) {
          const slugExists = await User.findOne({ 
            slug: newSlug, 
            _id: { $ne: userId } 
          });
          
          if (!slugExists) break;
          
          newSlug = `${baseSlug}-${counter}`;
          counter++;
        }
        
        updateData.slug = newSlug;
      }
    }
    
    // Avatar özel işlemi - açıkça boş string gönderilirse, sil
    if (avatar === "") {
      updateData.avatar = "";
    } else if (avatar) {
      updateData.avatar = avatar;
    }
    
    // Kullanıcıyı güncelle
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    ).select('-password').lean();
    
    if (!updatedUser) {
      return encryptedJson(
        { success: false, message: 'Kullanıcı güncellenemedi' },
        { status: 500 }
      );
    }

    
    // Sunucu tarafı oturum güncelleme - daha güçlü etki için
    const session = await getServerSession(authOptions);
    if (session) {
      
      // NextAuth oturum yapısı
      session.user = {
        ...session.user,
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        lastname: updatedUser.lastname,
        email: updatedUser.email,
        avatar: updatedUser.avatar || "",
        role: updatedUser.role,
        slug: updatedUser.slug,
      };
      
      // Veri şeması tutarlılığını sağla
      if (!updatedUser.avatar) {
        session.user.avatar = "";
      }
    }
    
    // Güncellenmiş kullanıcı bilgilerini döndür
    return encryptedJson({ 
      success: true, 
      message: 'Kullanıcı bilgileri güncellendi', 
      user: {
        id: updatedUser._id ? updatedUser._id.toString() : userId,
        name: updatedUser.name,
        lastname: updatedUser.lastname,
        email: updatedUser.email,
        phone: updatedUser.phone,
        avatar: updatedUser.avatar || "",
        role: updatedUser.role,
        allowEmails: updatedUser.allowEmails,
        slug: updatedUser.slug,
        about: updatedUser.about || "",
        title: updatedUser.title || "" // Title alanını ekleyelim
      }
    });
  } catch (error) {
    return encryptedJson(
      { success: false, message: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
