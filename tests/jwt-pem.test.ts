import { describe, expect, it } from 'vitest'
import { normalizeJwtPemFromEnv } from '@/lib/jwt-pem'

describe('jwt-pem', () => {
  it('normalizeJwtPemFromEnv remplace les \\n échappés', () => {
    const pem = '-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----'
    expect(normalizeJwtPemFromEnv(pem)).toBe(
      '-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----',
    )
  })

  it('normalizeJwtPemFromEnv retire les guillemets', () => {
    const pem = '"-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----"'
    expect(normalizeJwtPemFromEnv(pem)).toContain('BEGIN PRIVATE KEY')
    expect(normalizeJwtPemFromEnv(pem)).not.toContain('\\n')
  })
})
