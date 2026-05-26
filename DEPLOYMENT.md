# BLOCKTRUST — Déploiement & base de données

## Neon — une seule base pour tout

Le projet Vercel **vercel-dev** utilise la branche Neon **bold-frost**.

| Variable | Type Neon | Exemple host |
|----------|-----------|--------------|
| `DATABASE_URL` | **Pooled** (runtime app, OAuth, API) | `ep-bold-frost-…-pooler.…neon.tech` |
| `DIRECT_URL` | **Direct** (migrations Prisma CLI) | `ep-bold-frost-….…neon.tech` |
| `DATABASE_URL_UNPOOLED` | **Direct** (alias Vercel/Neon) | même host que `DIRECT_URL` |

**Ne pas utiliser** l’ancienne base **odd-resonance** pour la prod Vercel.

Si `DATABASE_URL` et `DIRECT_URL` pointent vers des hosts différents, `prisma.config.ts` affiche un warning au démarrage CLI.

## `.env.local` (développement)

Synchroniser avec Neon Console → projet **vercel-dev** → Connect :

```bash
DATABASE_URL=postgresql://…@ep-bold-frost-…-pooler.…/neondb?sslmode=require
DIRECT_URL=postgresql://…@ep-bold-frost-….…/neondb?sslmode=require
```

Vérifier qu’il n’y a **qu’un seul** préfixe `postgresql://` (pas `postgresql://postgresql://…`).

## Migrations automatiques (Vercel)

À chaque `npm install` / déploiement Vercel :

```json
"postinstall": "prisma generate && prisma migrate deploy"
```

## Vérification schema avant CI / manuel

```bash
DATABASE_URL="postgresql://…" npx tsx scripts/check-prod-db.ts
```

Colonnes critiques vérifiées (création auto si absentes) :

- `User.biometricConsentAt`, `User.biometricConsentVersion`
- `User.trustScore`, `User.extensionApiKey`
- `Certificate.blockchainStatus`

## Scripts utilitaires

| Script | Rôle |
|--------|------|
| `scripts/check-prod-db.ts` | Audit + repair colonnes critiques |
| `scripts/fix-prod-migration.ts` | Repair one-shot consentement biométrique |

## Checklist déploiement

1. Neon Console : URLs **bold-frost** copiées dans Vercel (Production + Preview)
2. `npx prisma migrate deploy` avec `DATABASE_URL` prod (ou laisser le postinstall Vercel)
3. `npx tsx scripts/check-prod-db.ts` — toutes les colonnes ✓
4. `/api/health` → `database.connected: true`
5. Test OAuth Google en navigation privée
