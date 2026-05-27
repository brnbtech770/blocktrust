import { NextRequest } from 'next/server'

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
      ...headers,
    }),
    body,
  })
}
