import { describe, it, expect, afterEach } from 'vitest'
import {
  getAdminEmailList,
  getAllInternalEmails,
  isAdmin,
  isDashboardAdmin,
  isInternalAccount,
  isSuperAdmin,
  DASHBOARD_ADMIN_EMAILS,
  INTERNAL_EMAILS,
} from '@/lib/admin-utils'

const ORIGINAL_ADMIN_EMAILS = process.env.ADMIN_EMAILS

describe('admin-utils — getAdminEmailList', () => {
  afterEach(() => {
    process.env.ADMIN_EMAILS = ORIGINAL_ADMIN_EMAILS
  })

  it('parse une liste multi-emails (trim + lowercase + filtre vides)', () => {
    process.env.ADMIN_EMAILS = ' Admin@Blocktrust.tech , , second@blocktrust.tech '
    expect(getAdminEmailList()).toEqual([
      'admin@blocktrust.tech',
      'second@blocktrust.tech',
    ])
  })

  it('retourne DASHBOARD_ADMIN_EMAILS si ADMIN_EMAILS absent', () => {
    delete process.env.ADMIN_EMAILS
    expect(getAdminEmailList()).toEqual([...DASHBOARD_ADMIN_EMAILS])
  })
})

describe('admin-utils — isDashboardAdmin / isAdmin', () => {
  it('true pour les 4 emails dashboard admin', () => {
    for (const email of DASHBOARD_ADMIN_EMAILS) {
      expect(isDashboardAdmin(email)).toBe(true)
      expect(isAdmin(email)).toBe(true)
    }
  })

  it('false pour les comptes internes secondaires', () => {
    expect(isDashboardAdmin('brnbimmo@gmail.com')).toBe(false)
    expect(isDashboardAdmin('johannabernabe3@gmail.com')).toBe(false)
    expect(isAdmin('contact@brnb.fr')).toBe(false)
  })

  it('refuse email externe / null', () => {
    expect(isDashboardAdmin('client@example.com')).toBe(false)
    expect(isDashboardAdmin(null)).toBe(false)
  })
})

describe('admin-utils — isSuperAdmin', () => {
  it('true uniquement pour brnbtech@gmail.com', () => {
    expect(isSuperAdmin('brnbtech@gmail.com')).toBe(true)
    expect(isSuperAdmin('BRNBTECH@gmail.com')).toBe(true)
    expect(isSuperAdmin('laurianne@winter-keys.com')).toBe(false)
  })
})

describe('admin-utils — isInternalAccount', () => {
  it('true pour les 9 comptes internes', () => {
    for (const email of getAllInternalEmails()) {
      expect(isInternalAccount(email)).toBe(true)
    }
    expect(isInternalAccount('JohannaFartoukh@Yahoo.fr')).toBe(true)
  })

  it('false pour un email externe / null', () => {
    expect(isInternalAccount('client@example.com')).toBe(false)
    expect(isInternalAccount(null)).toBe(false)
  })

  it('couvre bien DASHBOARD_ADMIN + INTERNAL sans doublon', () => {
    expect(getAllInternalEmails()).toHaveLength(
      DASHBOARD_ADMIN_EMAILS.length + INTERNAL_EMAILS.length,
    )
  })
})
