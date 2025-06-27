import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rate limiting store - Production'da Redis kullanın
const rateLimitStore = new Map<string, {
  requests: Map<string, number[]>;
  bans: Map<string, number>;
}>();

function getRateLimitData(endpoint: string) {
  if (!rateLimitStore.has(endpoint)) {
    rateLimitStore.set(endpoint, {
      requests: new Map(),
      bans: new Map()
    });
  }
  return rateLimitStore.get(endpoint)!;
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return request.ip || 'unknown';
}

function isRateLimited(ip: string, endpoint: string): { limited: boolean; remainingTime?: number } {
  const data = getRateLimitData(endpoint);
  const now = Date.now();
  
  // Ban kontrolü
  const banUntil = data.bans.get(ip);
  if (banUntil && now < banUntil) {
    return { limited: true, remainingTime: Math.ceil((banUntil - now) / 1000) };
  }
  
  // Ban süresi geçmişse temizle
  if (banUntil && now >= banUntil) {
    data.bans.delete(ip);
  }
  
  // Rate limit kontrolü
  const requests = data.requests.get(ip) || [];
  const oneMinuteAgo = now - 60 * 1000;
  
  // Eski istekleri temizle
  const recentRequests = requests.filter(time => time > oneMinuteAgo);
  
  if (recentRequests.length >= 100) {
    // 10 dakika ban uygula
    data.bans.set(ip, now + 10 * 60 * 1000);
    data.requests.delete(ip); // İstek geçmişini temizle
    return { limited: true, remainingTime: 600 };
  }
  
  // Yeni isteği ekle
  recentRequests.push(now);
  data.requests.set(ip, recentRequests);
  
  return { limited: false };
}

// Session kontrolü için cookie kontrol fonksiyonu
function hasValidSession(request: NextRequest): boolean {
  // Hem development hem production cookie isimlerini kontrol et
  const sessionTokenDev = request.cookies.get('next-auth.session-token');
  const sessionTokenProd = request.cookies.get('__Secure-next-auth.session-token');
  const sessionTokenHttp = request.cookies.get('next-auth.session-token');
  
  // Herhangi bir session cookie'si varsa session var kabul et
  return !!(sessionTokenDev || sessionTokenProd || sessionTokenHttp);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // API rate limiting
  if (pathname.startsWith('/api/')) {
    const ip = getClientIP(request);
    const endpoint = pathname;
    
    const rateLimitResult = isRateLimited(ip, endpoint);
    
    if (rateLimitResult.limited) {
      return new NextResponse(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Bu API endpoint için rate limit aşıldı. ${rateLimitResult.remainingTime} saniye sonra tekrar deneyin.`,
          retryAfter: rateLimitResult.remainingTime
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': rateLimitResult.remainingTime?.toString() || '600',
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + (rateLimitResult.remainingTime || 600) * 1000).toISOString()
          }
        }
      );
    }
    
    // Rate limit geçildi, isteği devam ettir
    const response = NextResponse.next();
    
    // Rate limit bilgilerini header'a ekle
    const data = getRateLimitData(endpoint);
    const requests = data.requests.get(ip) || [];
    const oneMinuteAgo = Date.now() - 60 * 1000;
    const recentRequests = requests.filter(time => time > oneMinuteAgo);
    
    response.headers.set('X-RateLimit-Limit', '100');
    response.headers.set('X-RateLimit-Remaining', (100 - recentRequests.length).toString());
    response.headers.set('X-RateLimit-Reset', new Date(Date.now() + 60 * 1000).toISOString());
    
    return response;
  }

  const isAuthenticated = hasValidSession(request);

  // Basic routing protection - no server modules in middleware
  
  // Admin routes require authentication
  if (pathname.startsWith('/admin')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/signin?callbackUrl=' + encodeURIComponent(pathname), request.url));
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
      return NextResponse.redirect(new URL('/signin?callbackUrl=' + encodeURIComponent(pathname), request.url));
    }
    
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
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
