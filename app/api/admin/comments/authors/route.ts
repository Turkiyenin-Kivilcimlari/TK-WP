import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Comment from '@/models/Comment';
import User from '@/models/User';
import { checkAdminAuthWithTwoFactor } from '@/middleware/authMiddleware';
import mongoose from 'mongoose';

// Dynamic rendering için yapılandırma
export const dynamic = 'force-dynamic';

// Yorum yapan yazarları getir (admin için)
export async function GET(req: NextRequest) {
  try {
    // Admin işlemi olduğu için 2FA kontrolü ekliyoruz
    const adminCheck = await checkAdminAuthWithTwoFactor(req);
    if (adminCheck) return adminCheck;

    await connectToDatabase();

    // Yorum yapan kullanıcıların ID'lerini topla
    const authorIds = await Comment.distinct('author');

    // Bu ID'lere sahip kullanıcıları getir
    const authors = await User.find(
      { _id: { $in: authorIds } },
      'name lastname'
    ).lean();

    // ID'leri string'e çevir ve isim formatlamasını yap
    const formattedAuthors = authors.map(author => ({
      id: author._id.toString(),
      name: `${author.name || ''} ${author.lastname || ''}`.trim() || 'İsimsiz Kullanıcı'
    }));

    return NextResponse.json({
      success: true,
      authors: formattedAuthors
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}
