import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { UserRole } from '@/models/User';

// E-posta adresine göre kullanıcıları getir
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const email = decodeURIComponent(params.id); // URL-encoded e-postayı çöz
    
    // MongoDB veritabanına bağlan
    await connectToDatabase();
    
    // Veritabanından kullanıcıyı sorgu yap
    const user = await User.findOne({ email: email }).lean();
    
    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }
    
    // Kullanıcı verisini düzenle
    const userData = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      lastname: user.lastname,
      role: user.role,
    };
    
    return NextResponse.json(userData);
  } catch (error) {
    console.error('Kullanıcı bilgisi alınırken hata oluştu:', error);
    return NextResponse.json({ error: 'Kullanıcı bilgisi alınamadı' }, { status: 500 });
  }
}