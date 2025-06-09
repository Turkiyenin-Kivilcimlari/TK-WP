import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/models/User';
import * as fs from 'fs';
import * as path from 'path';

// Kullanıcı verileri dosya yolu (örnek implementasyon)
const USERS_FILE_PATH = path.join(process.cwd(), 'data', 'users.json');

// Kullanıcı verilerini dosyadan oku
async function getUsers() {
  try {
    const dataDir = path.dirname(USERS_FILE_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    if (!fs.existsSync(USERS_FILE_PATH)) {
      fs.writeFileSync(USERS_FILE_PATH, JSON.stringify([], null, 2), 'utf8');
      return [];
    }
    
    const data = fs.readFileSync(USERS_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Kullanıcılar yüklenirken hata oluştu:', error);
    return [];
  }
}

// Yetki kontrolü yap
async function checkPermission() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== UserRole.SUPERADMIN) {
    return false;
  }
  return true;
}

// Tüm kullanıcıları getir
export async function GET() {
  try {
    const hasPermission = await checkPermission();
    if (!hasPermission) {
      return new NextResponse(JSON.stringify({ error: 'Yetkisiz erişim' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const users = await getUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error('Kullanıcı verileri alınırken hata oluştu:', error);
    return NextResponse.json({ error: 'Kullanıcı verileri alınamadı' }, { status: 500 });
  }
}

// Kullanıcı oluştur veya güncelle
export async function POST(request: NextRequest) {
  try {
    const hasPermission = await checkPermission();
    if (!hasPermission) {
      return new NextResponse(JSON.stringify({ error: 'Yetkisiz erişim' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const userData = await request.json();
    const users = await getUsers();
    
    const existingIndex = users.findIndex((user: any) => user.id === userData.id);
    
    if (existingIndex >= 0) {
      // Varolan kullanıcıyı güncelle
      users[existingIndex] = { ...users[existingIndex], ...userData };
    } else {
      // Yeni kullanıcı ekle
      users.push(userData);
    }
    
    // Dosyaya kaydet
    try {
      fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(users, null, 2), 'utf8');
      return NextResponse.json(userData);
    } catch (error) {
      console.error('Kullanıcı kaydedilirken hata oluştu:', error);
      throw error;
    }
  } catch (error) {
    console.error('Kullanıcı kaydedilirken hata oluştu:', error);
    return NextResponse.json({ error: 'Kullanıcı kaydedilemedi' }, { status: 500 });
  }
}
