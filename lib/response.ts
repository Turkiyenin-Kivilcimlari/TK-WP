import { NextResponse } from 'next/server';
import { encrypt } from './crypto';

export function encryptedJson(data: any, opts: Parameters<typeof NextResponse.json>[1] = {}) {
  const payload = encrypt(JSON.stringify(data));
  return NextResponse.json({ payload }, opts);
}
