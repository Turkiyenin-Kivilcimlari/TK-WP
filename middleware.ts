import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthenticated = !!request.cookies.get('next-auth.session-token');

  // Basic routing protection - no server modules in middleware
  
  // Admin routes require authentication
  if (pathname.startsWith('/admin')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/signin', request.url));
    }
    
    // For backup pages, we'll check permissions in the page component
    if (pathname.startsWith('/admin/backup')) {
      return NextResponse.next(); // Let component handle permissions
    }
    
    return NextResponse.next();
  }

  // User routes require authentication
  if (
    pathname.startsWith('/profile') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/my-articles') ||
    pathname.startsWith('/my-events')
  ) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/signin', request.url));
    }
    
    return NextResponse.next();
  }

  return NextResponse.next();
}

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
    '/my-events',
  ],
};
