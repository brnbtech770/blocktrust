# Audit sécurité (BlockTrust MVP)

Résumé des risques, mesures en place et variables d’environnement.

## État actuel (réalité du code)

### Middleware (`middleware.ts`)

- **Actif** : redirection canonique `www` → apex ; garde d’accès par JWT Edge (`getToken`) pour un sous-ensemble d’API (`/api/certificates`, `/api/entities`, `/api/stats`, `/api/activity`, `/api/stripe/*` hors webhook).
- Les pages `/dashboard` et `/admin` s’appuient surtout sur **`auth()`** côté layouts / route handlers pour éviter les écarts Edge vs Node.
- Chaque route sensible doit **aussi** vérifier `auth()` / `isAdmin()` dans le handler.

### NextAuth

- **`allowDangerousEmailAccountLinking`** : **désactivé par défaut** dans `app/lib/auth.edge.config.ts` ; activer uniquement avec `ALLOW_DANGEROUS_EMAIL_LINKING=true` si le métier l’exige.
- **`debug`** : `false` en production (`NODE_ENV === "production"` dans `app/lib/auth.ts`) — pas de `AUTH_DEBUG` verbeux en prod.

### API V2

- **`POST /api/v2/issue`** : authentification **obligatoire** ; contrôle que le certificat appartient à l’utilisateur (`entity.userId` vs session) ; Prisma via `@/app/lib/db`.

### Administrateurs

- Liste des emails admin : variable **`ADMIN_EMAILS`** (séparateur virgule), ex. `brnbtech@gmail.com,laurianne@blocktrust.tech`.
- Fichier : `app/lib/admin.ts` (utilisé depuis des **Server Components** et routes API ; pas besoin de `NEXT_PUBLIC_*` pour `isAdmin`).

### Rate limiting (`lib/rate-limit-verify.ts`)

- Implémentation **en mémoire**, par instance (ex. Vercel) — **contournable** si plusieurs instances ou forte charge.
- **TODO** : migrer vers **Upstash Redis** avant ~100 utilisateurs actifs sur la vérif publique.  
  Doc : https://docs.upstash.com/redis/sdks/ratelimit

### Headers HTTP (`next.config.ts`)

- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, **HSTS** (preload).
- **Pas de CSP** pour l’instant (Stripe, Google OAuth).

### Logs production

- Webhooks Stripe / Identity et routes V2 sensibles : helpers **`lib/prodLog.ts`** (`btLog`, `btError`, `btErrorDevDetails`) — détails complets en dev, messages **épurés** en prod (pas d’emails, IDs utilisateur ou customer dans les logs agrégés).

## Corrections historiques (référence)

| Risque | Mesure |
|--------|--------|
| Fallback header/cookie dans `getAuthUser` | Supprimé — session NextAuth uniquement |
| Open redirect callback | Origine identique ou chemin relatif |
| Webhook Stripe sans secret | 500 si `STRIPE_WEBHOOK_SECRET` absent |
| Upload | Sanitisation des noms de fichiers (Blob) |
| Reset password | Pas de log du lien ; erreur générique si Resend absent |

## Variables d’environnement

| Variable | Rôle |
|----------|------|
| `ADMIN_EMAILS` | Admins, liste séparée par virgules |
| `ALLOW_DANGEROUS_EMAIL_LINKING` | `true` seulement si liaison Google/email acceptée |
| `IP_HASH_SALT` | Recommandé en prod pour hash IP (RGPD) |
| `STRIPE_WEBHOOK_SECRET` | Obligatoire pour webhooks billing |
| `STRIPE_IDENTITY_WEBHOOK_SECRET` | Webhook Identity (KYC) |
| `NEXTAUTH_SECRET` / secrets Stripe | Uniquement via secrets hébergeur |

Voir aussi `ENV_CHECKLIST.md` si présent.

## Opérations

- Vérifier périodiquement **`npm audit`** et monter de version **Next.js** selon les avis de sécurité.
