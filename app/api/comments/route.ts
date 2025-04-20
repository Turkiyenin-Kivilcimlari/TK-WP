import { NextRequest, NextResponse } from 'next/server';

// API kullanım uyarısı
export async function GET(req: NextRequest) {
  return NextResponse.json({
    success: false,
    message: 'Bu endpoint kullanımdan kaldırıldı. Yorumlar /api/articles/[id]/comments üzerinden erişilebilir. Admin işlemleri için /api/admin/comments kullanılmalıdır.'
  }, { status: 410 });  // 410 Gone
}

export async function DELETE(req: NextRequest) {
  // /api/admin/comments'a yönlendir
  const url = new URL('/api/admin/comments', req.url);
  const id = req.nextUrl.searchParams.get('id');
  if (id) {
    url.searchParams.set('id', id);
  }
  return NextResponse.redirect(url);
}
