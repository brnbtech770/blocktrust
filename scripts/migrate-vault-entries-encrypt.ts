#!/usr/bin/env npx tsx
/**
 * Migration : chiffre les entrées coffre en clair (value) → valueEnc AES-256-GCM,
 * puis vide la colonne value.
 *
 * Usage :
 *   npx tsx scripts/migrate-vault-entries-encrypt.ts --dry-run
 *   npx tsx scripts/migrate-vault-entries-encrypt.ts
 */
import { PrismaClient } from '@prisma/client'
import {
  buildVaultEntryWriteData,
  canEncryptVaultEntries,
  readVaultEntryPlaintext,
} from '../lib/vault-entry-value'

const prisma = new PrismaClient()
const dryRun = process.argv.includes('--dry-run')

async function main() {
  if (!canEncryptVaultEntries()) {
    throw new Error('NEXTAUTH_SECRET requis pour chiffrer les entrées coffre.')
  }

  const entries = await prisma.trustVaultEntry.findMany({
    where: {
      OR: [{ valueEnc: null }, { value: { not: '' } }],
    },
    select: { id: true, value: true, valueEnc: true, vaultId: true },
  })

  let migrated = 0
  let skipped = 0

  for (const entry of entries) {
    const plain = readVaultEntryPlaintext(entry)
    if (!plain.trim()) {
      skipped++
      continue
    }

    if (entry.valueEnc && !entry.value) {
      skipped++
      continue
    }

    const enc = buildVaultEntryWriteData(plain)
    if (dryRun) {
      console.log(`[dry-run] ${entry.id} vault=${entry.vaultId} → chiffrer (${plain.length} chars)`)
    } else {
      await prisma.trustVaultEntry.update({
        where: { id: entry.id },
        data: { value: enc.value, valueEnc: enc.valueEnc },
      })
    }
    migrated++
  }

  console.log(
    dryRun
      ? `[dry-run] ${migrated} entrée(s) à migrer, ${skipped} ignorée(s).`
      : `Migration terminée : ${migrated} entrée(s) chiffrée(s), ${skipped} ignorée(s).`,
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
