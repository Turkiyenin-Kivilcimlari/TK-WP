import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { adminAuthMiddleware } from './middleware/adminAuthMiddleware'
import { userAuthMiddleware } from './middleware/userAuthMiddleware'

// Middleware'i belirli path'ler için çalıştır
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Admin sayfaları için özel middleware kullan
  if (pathname.startsWith('/admin')) {
    return adminAuthMiddleware(request);
  }
  
  // Kullanıcı özel sayfaları için middleware kullan
  if (pathname.startsWith('/profile') || 
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/my-articles') ||
      pathname.startsWith('/my-events')) {
    return userAuthMiddleware(request);
  }
  
  // Diğer sayfalar için normal akışa devam et
  return NextResponse.next();
}

// Middleware'i yapılandır
export const config = {
  matcher: [
    '/admin/:path*',
    '/profile/:path*',
    '/profile',
    '/dashboard/:path*',
    '/dashboard',
    '/my-articles/:path*',
    '/my-articles',
    '/my-events/:path*',
    '/my-events'
  ],
}
