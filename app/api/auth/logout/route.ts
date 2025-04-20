import { NextResponse } from 'next/server';

export async function POST() {
  // Token'ı temizle
  const response = NextResponse.json(
    { success: true, message: 'Çıkış başarılı' },
    { status: 200 }
  );
  
  response.cookies.set('token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });
  
  return response;
}
