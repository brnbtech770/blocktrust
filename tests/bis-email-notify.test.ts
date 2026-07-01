import { describe, expect, it } from 'vitest'
import { buildBisNotificationSubject } from '@/emails/BisNotificationEmail'
import { resolveBisSenderDisplayName } from '@/lib/bis-email-notify'

describe('bis-email-notify', () => {
  it('résout le nom affiché de l’expéditeur', () => {
    expect(resolveBisSenderDisplayName('Jim Acoca', 'jim@example.com')).toBe('Jim Acoca')
    expect(resolveBisSenderDisplayName(null, 'jimacoca@gmail.com')).toBe('Jimacoca')
  })

  it('construit le sujet email BIS', () => {
    expect(buildBisNotificationSubject('Jim Acoca')).toBe(
      '[Jim Acoca] vous a envoyé une interaction signée BLOCKTRUST™',
    )
  })
})
