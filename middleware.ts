import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { adminAuthMiddleware } from './middleware/adminAuthMiddleware'

// Admin middleware'i belirli path'ler için çalıştır
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Admin sayfaları için özel middleware kullan
  if (pathname.startsWith('/admin')) {
    return adminAuthMiddleware(request);
  }
  
  // Diğer sayfalar için normal akışa devam et
  return NextResponse.next();
}

// Admin sayfaları için middleware'i yapılandır
export const config = {
  matcher: ['/admin/:path*'],
}
