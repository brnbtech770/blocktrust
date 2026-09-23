import { describe, it, expect, vi, beforeEach } from 'vitest'

const findMany = vi.hoisted(() => vi.fn())
const auditCreate = vi.hoisted(() => vi.fn())
const resolveUserVault = vi.hoisted(() => vi.fn())

vi.mock('@/app/lib/db', () => ({
  prisma: {
    trustVaultEntry: { findMany },
    auditLog: { create: auditCreate },
  },
}))

vi.mock('@/lib/mcp/helpers/vault-access', () => ({
  resolveUserVault,
}))

import { handleSearchVault } from '@/lib/mcp/tools/search-vault'

const IBAN = 'FR7630006000011234567890189'

const ctx = {
  userId: 'user-1',
  userEmail: 'owner@example.com',
  plan: 'PREMIUM',
}

describe('search_vault MCP — pas de plaintext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auditCreate.mockResolvedValue({ id: 'audit-1' })
    resolveUserVault.mockResolvedValue({
      vault: { vaultId: 'vault-1', organizationId: 'org-1', canManage: false },
    })
    findMany.mockResolvedValue([
      {
        id: 'entry-1',
        name: 'RIB principal',
        type: 'IBAN',
        value: IBAN,
        valueEnc: null,
        description: 'compte société',
        createdAt: new Date('2026-01-15T00:00:00.000Z'),
      },
    ])
  })

  it('compareValue ne renvoie jamais storedValue ni l’IBAN en clair', async () => {
    const result = await handleSearchVault(ctx, { compareValue: 'x' })
    const text = result.content[0]?.text ?? ''
    const parsed = JSON.parse(text) as {
      entries: Array<Record<string, unknown>>
    }

    expect(parsed.entries).toHaveLength(1)
    expect(parsed.entries[0]).not.toHaveProperty('storedValue')
    expect(text).not.toContain('storedValue')
    expect(text).not.toContain(IBAN)
    expect(parsed.entries[0]?.match).toBe(false)
    expect(String(parsed.entries[0]?.valuePreview)).toContain('••••')

    await vi.waitFor(() => {
      expect(auditCreate).toHaveBeenCalled()
    })

    const searchCall = auditCreate.mock.calls.find(
      (call) => call[0]?.data?.action === 'VAULT_MCP_SEARCH',
    )
    expect(searchCall).toBeTruthy()
    const persisted = JSON.stringify(searchCall?.[0])
    expect(persisted).not.toContain(IBAN)
    expect(persisted).not.toContain('"x"')
    expect(persisted).toContain('valueHash')
  })

  it('un compareValue égal à la référence donne match true sans plaintext', async () => {
    const result = await handleSearchVault(ctx, { compareValue: IBAN })
    const text = result.content[0]?.text ?? ''
    const parsed = JSON.parse(text) as {
      entries: Array<{ match: boolean | null; storedValue?: string; valuePreview: string }>
    }

    expect(parsed.entries[0]?.match).toBe(true)
    expect(parsed.entries[0]).not.toHaveProperty('storedValue')
    expect(text).not.toContain(IBAN)
    expect(parsed.entries[0]?.valuePreview).not.toBe(IBAN)
  })
})
