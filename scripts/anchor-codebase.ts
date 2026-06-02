/**
 * © 2026 BRNB TECH — BLOCKTRUST™ (marque déposée INPI n°5253718).
 * Tous droits réservés. Code propriétaire — reproduction interdite.
 */
// scripts/anchor-codebase.ts
// Ancre sur Polygon le SHA-256 déterministe de l'état du code (preuve d'antériorité).
// Réutilise le mécanisme d'ancrage EXISTANT (lib/polygon.ts → anchorToPolygon).
//
// SÉCURITÉ : DRY-RUN par défaut. Aucune transaction n'est envoyée tant que
// la variable d'environnement ANCHOR_CONFIRM=1 n'est PAS fournie.
//
// Hash déterministe : `git archive --format=tar HEAD | sha256sum`.
//
// Usage :
//   npx tsx scripts/anchor-codebase.ts                 # estimation seule (dry-run)
//   ANCHOR_CONFIRM=1 npx tsx scripts/anchor-codebase.ts # envoie réellement la tx
// ============================================================

import * as dotenv from 'dotenv'
import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Charger l'environnement AVANT d'importer lib/polygon (qui lit RPC/clé au chargement).
// .env.local prioritaire, .env en repli — sans écraser les variables déjà définies.
dotenv.config({ path: '.env.local' })
dotenv.config()

const BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD'

async function main() {
  const commit = execSync('git rev-parse HEAD').toString().trim()
  const committedAt = execSync('git show -s --format=%cI HEAD').toString().trim()
  const tree = execSync("git rev-parse HEAD^{tree}").toString().trim()

  // SHA-256 déterministe de l'archive du commit (fichiers suivis uniquement).
  const archive = execSync('git archive --format=tar HEAD', {
    maxBuffer: 1024 * 1024 * 512,
  })
  const hash = createHash('sha256').update(archive).digest('hex')

  const certificateId = `CODEBASE-${commit}`
  const payload = `BLOCKTRUST:${certificateId}:${hash}`

  console.log('────────────────────────────────────────')
  console.log('Preuve d\'antériorité — code BLOCKTRUST')
  console.log('────────────────────────────────────────')
  console.log('Commit      :', commit)
  console.log('Date commit :', committedAt)
  console.log('Tree        :', tree)
  console.log('SHA-256     :', hash)
  console.log('Payload     :', payload)
  console.log('Octets data :', Buffer.byteLength(payload, 'utf8'))
  console.log('────────────────────────────────────────')

  const { isPolygonConfigured, anchorToPolygon } = await import('../lib/polygon')

  if (!isPolygonConfigured()) {
    console.error(
      '\n❌ Polygon non configuré (POLYGON_RPC_URL et/ou POLYGON_PRIVATE_KEY absents).',
    )
    console.error(
      '   Exécute ce script dans un environnement où ces variables existent.',
    )
    process.exit(1)
  }

  // Estimation read-only (aucune transaction émise).
  const { ethers } = await import('ethers')
  const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL!.trim())
  const recipient =
    process.env.POLYGON_CONTRACT_ADDRESS?.trim() || BURN_ADDRESS
  const data = ethers.hexlify(ethers.toUtf8Bytes(payload))

  let gasLimit = BigInt(25000)
  try {
    gasLimit = await provider.estimateGas({ to: recipient, value: BigInt(0), data })
  } catch (err) {
    console.warn(
      '⚠️  estimateGas indisponible, fallback 25000 gas :',
      (err as Error).message,
    )
  }
  const fee = await provider.getFeeData()
  const gasPrice = fee.maxFeePerGas ?? fee.gasPrice ?? BigInt(0)
  const costWei = gasLimit * gasPrice
  const costPol = Number(ethers.formatEther(costWei))

  console.log('Estimation coût')
  console.log('  gasLimit   :', gasLimit.toString())
  console.log('  gasPrice   :', ethers.formatUnits(gasPrice, 'gwei'), 'gwei')
  console.log('  coût estimé:', costPol.toFixed(8), 'POL')
  console.log('────────────────────────────────────────')

  if (process.env.ANCHOR_CONFIRM !== '1') {
    console.log(
      '\nDRY-RUN — aucune transaction envoyée.\n' +
        'Relance avec  ANCHOR_CONFIRM=1 npx tsx scripts/anchor-codebase.ts  pour ancrer.',
    )
    return
  }

  console.log('\n🚀 Envoi de la transaction d\'ancrage…')
  const anchor = await anchorToPolygon(certificateId, hash)
  console.log('✅ Ancré on-chain')
  console.log('  txHash :', anchor.txHash)
  console.log('  bloc   :', anchor.blockNumber)
  console.log('  explorer:', anchor.explorerUrl)

  // Enregistrement de la preuve dans docs/
  const docsDir = join(process.cwd(), 'docs')
  mkdirSync(docsDir, { recursive: true })
  const docPath = join(docsDir, 'CODE_ANCHOR_PROOF.md')
  const doc = `# Preuve d'antériorité — code BLOCKTRUST™

© 2026 BRNB TECH — BLOCKTRUST™ (marque déposée INPI n°5253718).

Ancrage du SHA-256 déterministe de l'état du code source sur **Polygon Mainnet**
(transaction \`value=0\` vers la burn address, payload dans le champ \`data\`).

| Élément | Valeur |
|---|---|
| Commit | \`${commit}\` |
| Date du commit | ${committedAt} |
| Tree git | \`${tree}\` |
| SHA-256 (\`git archive --format=tar HEAD\`) | \`${hash}\` |
| Payload on-chain | \`${payload}\` |
| Réseau | Polygon Mainnet (chainId ${process.env.POLYGON_CHAIN_ID?.trim() || '137'}) |
| txHash | \`${anchor.txHash}\` |
| Bloc | ${anchor.blockNumber} |
| Explorer | ${anchor.explorerUrl} |
| Ancré le | ${new Date().toISOString()} |

## Reproduire le hash

\`\`\`bash
git archive --format=tar ${commit} | sha256sum
# => ${hash}
\`\`\`
`
  writeFileSync(docPath, doc, 'utf8')
  console.log('\n📄 Preuve écrite dans docs/CODE_ANCHOR_PROOF.md')
}

main().catch((e) => {
  console.error('❌ Erreur:', e)
  process.exit(1)
})
