import { describe, expect, it } from 'vitest'
import { buildBisNotificationSubject } from '@/emails/BisNotificationEmail'
import { resolveBisSenderDisplayName } from '@/lib/bis-email-notify'
import { formatTruncatedContentHash } from '@/lib/bis-content-hash'

describe('bis-email-notify', () => {
  it('résout le nom affiché de l’expéditeur', () => {
    expect(resolveBisSenderDisplayName('Jim Acoca', 'jim@example.com')).toBe('Jim Acoca')
    expect(resolveBisSenderDisplayName(null, 'jimacoca@gmail.com')).toBe('Jimacoca')
  })

  it('construit le sujet email BIS', () => {
    expect(buildBisNotificationSubject('Jim Acoca')).toBe(
      'Jim Acoca a signé une interaction vérifiable',
    )
  })

  it('tronque le hash SHA-256 pour affichage email', () => {
    const hash = 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456'
    expect(formatTruncatedContentHash(hash)).toBe('a1b2c3d4...3456')
  })
})
