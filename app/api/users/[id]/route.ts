import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { authenticateUser } from '@/middleware/authMiddleware';
import mongoose from 'mongoose';

// Bu endpoint GET işlemi için kullanılır
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Kimlik doğrulama kontrolü
    const token = await authenticateUser(req);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Giriş yapmalısınız' },
        { status: 401 }
      );
    }
    
    const userId = params.id;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, message: 'Geçersiz kullanıcı kimliği' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    const user = await User.findById(userId).select('-password -resetToken -resetTokenExpiry -verificationToken -verificationExpiry -twoFactorSecret');
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Kullanıcı bulunamadı' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        lastname: user.lastname,
        email: user.email,
        role: user.role,
        avatar: user.avatar || '',
        twoFactorEnabled: user.twoFactorEnabled || false,
        createdAt: user.createdAt,
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}

// PUT ve DELETE işlemleri için kullanıcıyı api/admin/users/[id] endpoint'ine yönlendirmek yerine,
// bu endpoint'lerin kullanılmadığını belirten bir yanıt dönüyoruz
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json(
    { success: false, message: 'Bu endpoint kullanımdan kaldırıldı. Lütfen /api/admin/users/[id] endpoint\'ini kullanın' },
    { status: 410 } // 410 Gone
  );
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json(
    { success: false, message: 'Bu endpoint kullanımdan kaldırıldı. Lütfen /api/admin/users/[id] endpoint\'ini kullanın' },
    { status: 410 } // 410 Gone
  );
}
