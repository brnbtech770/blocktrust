import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  compareVaultRibValues,
  normalizeVaultCompareValue,
  validateIbanMod97,
  vaultValuesMatch,
  maskVaultEntryValue,
  buildVaultEntryWriteData,
  readVaultEntryPlaintext,
} from '@/lib/vault-entry-value'
import { encryptVaultEntryValue, decryptVaultEntryValue } from '@/lib/vault-entry-crypto'

describe('vault-entry-value — normalisation IBAN', () => {
  it('normalise espaces et casse', () => {
    expect(normalizeVaultCompareValue('fr76 3000 6000 0112 3456 7890 189')).toBe(
      'FR7630006000011234567890189',
    )
  })

  it('vaultValuesMatch ignore espaces', () => {
    expect(vaultValuesMatch('FR76 3000 6000 0112 3456 7890 189', 'fr7630006000011234567890189')).toBe(true)
  })
})

describe('vault-entry-value — mod-97 IBAN', () => {
  it('valide un IBAN français connu', () => {
    expect(validateIbanMod97('FR7630006000011234567890189')).toBe(true)
  })

  it('rejette un IBAN invalide', () => {
    expect(validateIbanMod97('FR7630006000011234567890188')).toBe(false)
  })
})

describe('vault-entry-value — compare multi-entrées (V-C2)', () => {
  const ibanA = 'FR7630006000011234567890189'
  const ibanB = 'DE89370400440532013000'

  it('match si au moins une entrée correspond (2e entrée)', () => {
    const result = compareVaultRibValues(
      [
        { id: '1', name: 'RIB A', type: 'IBAN', value: ibanA },
        { id: '2', name: 'RIB B', type: 'IBAN', value: ibanB },
      ],
      ibanB,
    )
    expect(result.fraudAlert?.type).toBe('RIB_MATCH')
    expect(result.matchedEntryId).toBe('2')
  })

  it('mismatch seulement si aucune entrée ne matche', () => {
    const result = compareVaultRibValues(
      [
        { id: '1', name: 'RIB A', type: 'IBAN', value: ibanA },
        { id: '2', name: 'RIB B', type: 'IBAN', value: ibanB },
      ],
      'FR7630006000011234567890999',
    )
    expect(result.fraudAlert?.type).toBe('RIB_MISMATCH')
    expect(result.fraudAlert?.level).toBe('CRITICAL')
  })

  it('match avec espaces dans la valeur reçue', () => {
    const result = compareVaultRibValues(
      [{ id: '1', name: 'RIB', type: 'IBAN', value: ibanA }],
      'FR76 3000 6000 0112 3456 7890 189',
    )
    expect(result.fraudAlert?.type).toBe('RIB_MATCH')
  })
})

describe('vault-entry-crypto — roundtrip AES-256-GCM', () => {
  const prev = process.env.NEXTAUTH_SECRET

  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = 'test-vault-secret-for-unit-tests'
  })

  afterEach(() => {
    process.env.NEXTAUTH_SECRET = prev
  })

  it('chiffre et déchiffre une valeur', () => {
    const plain = 'FR7630006000011234567890189'
    const enc = encryptVaultEntryValue(plain)
    expect(enc).not.toContain(plain)
    expect(decryptVaultEntryValue(enc)).toBe(plain)
  })

  it('buildVaultEntryWriteData vide value legacy', () => {
    const { value, valueEnc } = buildVaultEntryWriteData('secret-rib')
    expect(value).toBe('')
    expect(valueEnc.length).toBeGreaterThan(10)
    expect(readVaultEntryPlaintext({ value, valueEnc })).toBe('secret-rib')
  })
})

describe('vault-entry-value — masquage', () => {
  it('masque un IBAN', () => {
    expect(maskVaultEntryValue('IBAN', 'FR7630006000011234567890189')).toBe('FR76 •••• 0189')
  })
})
