import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockPostRequest } from './helpers/mock-request'

const authMock = vi.hoisted(() => vi.fn())

const prismaMock = vi.hoisted(() => ({
  organization: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
  organizationMember: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
  },
  trustVault: {
    create: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
  },
  trustVaultEntry: {
    create: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
  },
  subscription: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
}))

const loadVaultForUserMock = vi.hoisted(() => vi.fn())
const findOrganizationByRefMock = vi.hoisted(() => vi.fn())
const requireOrgMemberMock = vi.hoisted(() => vi.fn())

vi.mock('@/app/lib/auth-server', () => ({
  auth: authMock,
}))

vi.mock('@/app/lib/db', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/org-vault-server', () => ({
  loadVaultForUser: loadVaultForUserMock,
  findOrganizationByRef: findOrganizationByRefMock,
  requireOrgMember: requireOrgMemberMock,
  orgRoleCanManageVaults: (role: string) =>
    role === 'OWNER' || role === 'ADMIN' || role === 'MANAGER',
  orgRoleCanInvite: (role: string) =>
    role === 'OWNER' || role === 'ADMIN' || role === 'MANAGER',
  orgRoleCanManageOrgSettings: (role: string) => role === 'OWNER' || role === 'ADMIN',
  orgRoleCanDeleteVault: (role: string) => role === 'OWNER' || role === 'ADMIN',
}))

vi.mock('@/lib/email', () => ({
  sendEmailFireAndForget: vi.fn(),
}))

vi.mock('@/lib/email-signature', () => ({
  getUserEmailSignature: vi.fn().mockResolvedValue({
    senderName: 'Test',
    certId: null,
    verifyUrl: null,
  }),
}))

import { POST as postOrganization } from '@/app/api/organization/route'
import { POST as postVault } from '@/app/api/organization/[orgRef]/vaults/route'
import { POST as postEntry } from '@/app/api/vault/[vaultId]/entries/route'
import { POST as postCheckMatch } from '@/app/api/vault/check-match/route'
import { checkVaultMatchForUserContacts } from '@/lib/vault-utils'

describe('Vault — création organisation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMock.mockResolvedValue({ user: { id: 'user-owner' } })
    prismaMock.subscription.findUnique.mockResolvedValue({
      plan: 'B2B_STARTER',
      status: 'active',
    })
    prismaMock.organization.findUnique.mockResolvedValue(null)
    prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => unknown) =>
      fn(prismaMock),
    )
    prismaMock.organization.create.mockResolvedValue({
      id: 'org-1',
      name: 'Acme Corp',
      slug: 'acme-corp',
      tier: 'B2B_STARTER',
    })
    prismaMock.organizationMember.create.mockResolvedValue({ id: 'mem-1' })
  })

  it('crée une organisation pour un abonné B2B', async () => {
    const res = await postOrganization(
      mockPostRequest('/api/organization', JSON.stringify({ name: 'Acme Corp' })),
    )

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.organization.slug).toBe('acme-corp')
    expect(prismaMock.organizationMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: 'OWNER', userId: 'user-owner' }),
      }),
    )
  })
})

describe('Vault — création coffre', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMock.mockResolvedValue({ user: { id: 'user-owner' } })
    findOrganizationByRefMock.mockResolvedValue({
      id: 'org-1',
      tier: 'B2B_STARTER',
    })
    requireOrgMemberMock.mockResolvedValue({ role: 'OWNER', joinedAt: new Date() })
    prismaMock.trustVault.count.mockResolvedValue(0)
    prismaMock.trustVaultEntry.count.mockResolvedValue(0)
    prismaMock.trustVault.create.mockResolvedValue({
      id: 'vault-1',
      name: 'Fournisseurs',
      description: null,
      createdAt: new Date().toISOString(),
    })
  })

  it('crée un coffre pour OWNER', async () => {
    const res = await postVault(
      mockPostRequest('/api/organization/acme/vaults', JSON.stringify({ name: 'Fournisseurs' })),
      { params: Promise.resolve({ orgRef: 'acme' }) },
    )

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.vault.name).toBe('Fournisseurs')
  })
})

describe('Vault — entrées', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMock.mockResolvedValue({ user: { id: 'user-owner' } })
    loadVaultForUserMock.mockResolvedValue({
      vault: { id: 'vault-1', organizationId: 'org-1' },
      membership: { role: 'OWNER' },
    })
    prismaMock.organization.findUnique.mockResolvedValue({ tier: 'B2B_STARTER' })
    prismaMock.trustVaultEntry.count.mockResolvedValue(0)
    prismaMock.trustVaultEntry.create.mockResolvedValue({
      id: 'entry-1',
      name: 'Contact principal',
      type: 'EMAIL',
      value: 'partner@corp.com',
      description: null,
      createdAt: new Date().toISOString(),
    })
  })

  it('ajoute une entrée EMAIL', async () => {
    const res = await postEntry(
      mockPostRequest(
        '/api/vault/vault-1/entries',
        JSON.stringify({
          name: 'Contact principal',
          type: 'EMAIL',
          value: 'partner@corp.com',
        }),
      ),
      { params: Promise.resolve({ vaultId: 'vault-1' }) },
    )

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.entry.value).toBe('partner@corp.com')
  })

  it('refuse la création pour un MEMBER', async () => {
    loadVaultForUserMock.mockResolvedValue({
      vault: { id: 'vault-1', organizationId: 'org-1' },
      membership: { role: 'MEMBER' },
    })

    const res = await postEntry(
      mockPostRequest(
        '/api/vault/vault-1/entries',
        JSON.stringify({
          name: 'Tentative',
          type: 'EMAIL',
          value: 'x@y.z',
        }),
      ),
      { params: Promise.resolve({ vaultId: 'vault-1' }) },
    )

    expect(res.status).toBe(403)
    expect(prismaMock.trustVaultEntry.create).not.toHaveBeenCalled()
  })
})

describe('Vault — check-match', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMock.mockResolvedValue({ user: { id: 'user-1' } })
  })

  it('email connu → match', async () => {
    prismaMock.organizationMember.findMany.mockResolvedValue([
      {
        organization: {
          vaults: [
            {
              entries: [{ type: 'EMAIL', value: 'partner@corp.com' }],
            },
          ],
        },
      },
    ])

    const result = await checkVaultMatchForUserContacts({
      userId: 'user-1',
      emails: ['partner@corp.com'],
      domains: [],
    })

    expect(result).toEqual({ inOrganization: true, match: true })
  })

  it('email inconnu → no match', async () => {
    prismaMock.organizationMember.findMany.mockResolvedValue([
      {
        organization: {
          vaults: [
            {
              entries: [{ type: 'EMAIL', value: 'other@corp.com' }],
            },
          ],
        },
      },
    ])

    const result = await checkVaultMatchForUserContacts({
      userId: 'user-1',
      emails: ['unknown@corp.com'],
      domains: [],
    })

    expect(result).toEqual({ inOrganization: true, match: false })
  })

  it('route check-match renvoie match pour email connu', async () => {
    prismaMock.organizationMember.findMany.mockResolvedValue([
      {
        organization: {
          vaults: [
            {
              entries: [{ type: 'EMAIL', value: 'partner@corp.com' }],
            },
          ],
        },
      },
    ])

    const res = await postCheckMatch(
      mockPostRequest(
        '/api/vault/check-match',
        JSON.stringify({ emails: ['partner@corp.com'], domains: [] }),
      ),
    )

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.match).toBe(true)
    expect(data.inOrganization).toBe(true)
  })

  it('route check-match renvoie no match pour email inconnu', async () => {
    prismaMock.organizationMember.findMany.mockResolvedValue([
      {
        organization: {
          vaults: [
            {
              entries: [{ type: 'EMAIL', value: 'other@corp.com' }],
            },
          ],
        },
      },
    ])

    const res = await postCheckMatch(
      mockPostRequest(
        '/api/vault/check-match',
        JSON.stringify({ emails: ['unknown@corp.com'], domains: [] }),
      ),
    )

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.match).toBe(false)
    expect(data.inOrganization).toBe(true)
  })
})
