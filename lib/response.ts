import { NextResponse } from 'next/server';

// Responses are served over HTTPS/TLS; no application-layer encryption.
// (A prior scheme keyed off NEXT_PUBLIC_ENCRYPTION_KEY, which is exposed in
// the client bundle and therefore provided no confidentiality.)
export function encryptedJson(data: any, opts: Parameters<typeof NextResponse.json>[1] = {}) {
  return NextResponse.json(data, opts);
}
