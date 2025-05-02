import { encryptedJson } from '@/lib/response';

export async function POST() {
  const response = encryptedJson(
    { success: true, message: 'Çıkış başarılı' },
    { status: 200 }
  );
  
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    expires: new Date(0),
    path: '/',
  });
  
  return response;
}
