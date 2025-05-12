import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function userAuthMiddleware(request: NextRequest) {
  // NextAuth JWT token'ını al
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET
  });

  // Kullanıcı oturum açmamışsa giriş sayfasına yönlendir
  if (!token) {
    const url = new URL('/signin', request.url);
    url.searchParams.set('callbackUrl', request.url);
    return NextResponse.redirect(url);
  }

  // Kullanıcı giriş yapmış, devam et
  return NextResponse.next();
}
