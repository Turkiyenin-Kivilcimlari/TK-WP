import { NextRequest, NextResponse } from 'next/server';

// API kullanım uyarısı ve yönlendirme
export async function GET(req: NextRequest) {
  const url = new URL('/api/admin/comments/articles', req.url);
  return NextResponse.redirect(url);
}
