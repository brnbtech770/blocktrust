import { describe, expect, it } from 'vitest'

/** Logique statut certificat — miroir de lib/delete-revoked-certificate.ts */
function canDeleteCertificate(status: string): boolean {
  return status === 'REVOKED'
}

/** Logique blocage suppression contact — miroir de lib/delete-contact.ts */
const BLOCKING = ['ACTIVE', 'ANCHORED', 'PENDING', 'SUSPENDED'] as const

function canDeleteContact(certStatuses: string[]): boolean {
  return !certStatuses.some((s) =>
    (BLOCKING as readonly string[]).includes(s),
  )
}

describe('suppression certificat révoqué', () => {
  it('autorise REVOKED uniquement', () => {
    expect(canDeleteCertificate('REVOKED')).toBe(true)
    expect(canDeleteCertificate('ACTIVE')).toBe(false)
    expect(canDeleteCertificate('ANCHORED')).toBe(false)
    expect(canDeleteCertificate('EXPIRED')).toBe(false)
  })
})

describe('suppression contact', () => {
  it('bloque si certificat actif ou en validation', () => {
    expect(canDeleteContact(['REVOKED'])).toBe(true)
    expect(canDeleteContact([])).toBe(true)
    expect(canDeleteContact(['ACTIVE'])).toBe(false)
    expect(canDeleteContact(['REVOKED', 'PENDING'])).toBe(false)
  })
})
