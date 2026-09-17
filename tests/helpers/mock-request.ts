import { NextRequest } from 'next/server'

function testAppOrigin(): string {
  try {
    return new URL(
      process.env.NEXTAUTH_URL ??
        process.env.AUTH_URL ??
        process.env.NEXT_PUBLIC_APP_URL ??
        'https://blocktrust.tech',
    ).origin
  } catch {
    return 'https://blocktrust.tech'
  }
}

export function mockGetRequest(
  path: string,
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method: 'GET',
    headers: new Headers(headers),
  })
}

export function mockPostRequest(
  path: string,
  body: string,
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    headers: new Headers({
      'content-type': 'application/json',
      origin: testAppOrigin(),
      ...headers,
    }),
    body,
  })
}
