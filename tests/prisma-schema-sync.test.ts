import { describe, expect, it } from 'vitest'
import { parsePrismaSchemaColumns, resolveDirectDatabaseUrl } from '@/lib/prisma-schema-sync'

const MINI_SCHEMA = `
enum AccountType {
  PERSONAL
  BUSINESS
}

model User {
  id        String   @id @default(cuid())
  email     String?  @unique
  cgvAcceptedAt DateTime?
  cgvVersion    String?
  accountType AccountType @default(PERSONAL)
  plan        Plan?    @relation(fields: [planId], references: [id])
  planId      String?
  entities    Entity[]
}

model Plan {
  id String @id
}

model Subscription {
  id            String @id
  seats         Int?
  extraProfiles Int?
  plan          String @default("DISCOVERY")
}
`

describe('parsePrismaSchemaColumns', () => {
  it('extracts scalar columns and skips relations', () => {
    const cols = parsePrismaSchemaColumns(MINI_SCHEMA)
    const keys = cols.map((c) => `${c.table}.${c.column}`)

    expect(keys).toContain('User.email')
    expect(keys).toContain('User.cgvAcceptedAt')
    expect(keys).toContain('User.cgvVersion')
    expect(keys).toContain('User.accountType')
    expect(keys).toContain('User.planId')
    expect(keys).toContain('Subscription.seats')
    expect(keys).toContain('Subscription.extraProfiles')

    expect(keys).not.toContain('User.plan')
    expect(keys).not.toContain('User.entities')
  })

  it('generates ADD COLUMN IF NOT EXISTS DDL', () => {
    const cols = parsePrismaSchemaColumns(MINI_SCHEMA)
    const cgv = cols.find((c) => c.table === 'User' && c.column === 'cgvAcceptedAt')
    expect(cgv?.ddl).toContain('ADD COLUMN IF NOT EXISTS')
    expect(cgv?.ddl).toContain('TIMESTAMP(3)')
  })
})

describe('resolveDirectDatabaseUrl', () => {
  it('strips Neon pooler hostname', () => {
    const url = resolveDirectDatabaseUrl(
      'postgresql://u:p@ep-foo-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require',
    )
    expect(url).toContain('ep-foo.eu-central-1.aws.neon.tech')
    expect(url).not.toContain('-pooler')
  })
})
