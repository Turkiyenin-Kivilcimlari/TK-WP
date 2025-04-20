import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function adminAuthMiddleware(request: NextRequest) {
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

  // Admin veya SuperAdmin değilse ana sayfaya yönlendir
  if (token.role !== 'ADMIN' && token.role !== 'SUPERADMIN') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 2FA durumu kontrol et (cookie üzerinden)
  const twoFactorStatus = request.cookies.get('two-factor-status');
  
  let requiresVerification = true;
  
  if (twoFactorStatus) {
    try {
      const parsedStatus = JSON.parse(twoFactorStatus.value);
      // 2FA etkinse ve doğrulanmamışsa
      if (parsedStatus.enabled && !parsedStatus.verified) {
        requiresVerification = true;
      } else {
        requiresVerification = false;
      }
    } catch (error) {
      requiresVerification = true;
    }
  }

  // 2FA doğrulaması gerekiyorsa ana sayfaya yönlendir ve toast mesajı göster
  if (requiresVerification) {
    const url = new URL('/', request.url);
    url.searchParams.set('requireTwoFA', 'true');
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
