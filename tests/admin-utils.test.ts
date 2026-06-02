import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getAdminEmailList, isAdmin, isInternalAccount } from '@/lib/admin-utils'

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

  it('retourne [] si ADMIN_EMAILS absent', () => {
    delete process.env.ADMIN_EMAILS
    expect(getAdminEmailList()).toEqual([])
  })
})

describe('admin-utils — isAdmin', () => {
  beforeEach(() => {
    process.env.ADMIN_EMAILS = 'admin@blocktrust.tech'
  })
  afterEach(() => {
    process.env.ADMIN_EMAILS = ORIGINAL_ADMIN_EMAILS
  })

  it('match insensible à la casse', () => {
    expect(isAdmin('ADMIN@blocktrust.tech')).toBe(true)
    expect(isAdmin('admin@blocktrust.tech')).toBe(true)
  })

  it('refuse un email non admin / null / undefined', () => {
    expect(isAdmin('client@example.com')).toBe(false)
    expect(isAdmin(null)).toBe(false)
    expect(isAdmin(undefined)).toBe(false)
  })
})

describe('admin-utils — isInternalAccount', () => {
  beforeEach(() => {
    process.env.ADMIN_EMAILS = 'admin@blocktrust.tech'
  })
  afterEach(() => {
    process.env.ADMIN_EMAILS = ORIGINAL_ADMIN_EMAILS
  })

  it('true pour un admin', () => {
    expect(isInternalAccount('admin@blocktrust.tech')).toBe(true)
  })

  it('true pour les emails internes additionnels (Johanna), insensible à la casse', () => {
    expect(isInternalAccount('johannabernabe3@gmail.com')).toBe(true)
    expect(isInternalAccount('JohannaFartoukh@Yahoo.fr')).toBe(true)
  })

  it('false pour un email externe / null', () => {
    expect(isInternalAccount('client@example.com')).toBe(false)
    expect(isInternalAccount(null)).toBe(false)
    expect(isInternalAccount(undefined)).toBe(false)
  })
})
