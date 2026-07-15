# Audit sécurité (BLOCKTRUST)

Résumé des mesures en place, variables d'environnement et chantiers ouverts.

*Dernière mise à jour : juillet 2026*

---

## Socle en place

### Proxy Edge (`proxy.ts`)

- Redirection `www` → apex
- Garde JWT Edge : `/dashboard`, `/admin`, `/api/admin/*`, sous-ensemble d'API
- **Invalidation session** : JWT avec `sessionInvalid` (reset MDP, compte suspendu/supprimé) → refusé au proxy
- Pages protégées complétées par `auth()` côté layouts/handlers (défense en profondeur)

### NextAuth

- `allowDangerousEmailAccountLinking` : **opt-in** (`ALLOW_DANGEROUS_EMAIL_LINKING=true`)
- Comptes Google : `emailVerified` à chaque connexion — pas besoin de liaison dangereuse en prod
- `sessionVersion` : invalidation globale après changement MDP
- Cookies `SameSite=lax`

### Rate limiting (Upstash Redis + fallback in-memory)

| Préfixe | Usage |
|---------|--------|
| `bt:verify:*` | Vérification publique |
| `bt:register:*` | Inscription |
| `bt:login-check:*` | Pré-check credentials |
| `bt:kyc` | Stripe Identity (3/h) |
| `bt:extension:*` | Extension Chrome |
| `bt:upload:h` | Upload documents (10/h/user) |
| `bt:password-change:h` | Échecs MDP actuel (5/h/user) |
| `bt:whitelabel:test` | Test webhook (5/min/user) |
| `bt:verify-link:h` | Liens verify rotatifs (20/h/user) |

Politique générale : **fail-soft** (sauf verify public fail-closed si Redis absent).

### CSRF / mutations

- Auth.js CSRF sur callback credentials
- `/api/auth/login-check` : validation token CSRF obligatoire
- Mutations sensibles : contrôle `Origin`/`Referer` (`lib/csrf-origin-guard.ts`) sur upload, MDP, suppression compte, webhooks test, generate-link

### Upload

- Blob **privé**, chemin `kyc|trust-manual/{userId}/…`
- Whitelist MIME + **magic bytes** (`lib/upload-file-validation.ts`)
- Rate limit 10/h/user
- Réponse API : `pathname` uniquement (pas d'URL blob)

### IDOR / ownership

Contrôle systématique sur certificats, entités, contacts, vault, trust circle, tokens verify, org.

### Webhooks entrants

- Stripe billing + Identity : `constructEvent` + secrets obligatoires
- QStash : signature vérifiée
- Crons Vercel : `CRON_SECRET`

### Headers HTTP (`next.config.ts`)

- HSTS preload, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`
- **CSP** enforcement (Stripe, Google OAuth, Turnstile, Sentry)
- **CSP Report-Only** stricte (sans `unsafe-inline`) sur **previews Vercel** (`VERCEL_ENV=preview`)

### Admin

- Prod : `DASHBOARD_ADMIN_EMAILS` requis — **fail-closed** si absent (plus de fallback hardcodé)
- Legacy `ADMIN_EMAILS` accepté avec warning
- Double garde proxy + handler

### Logs production

- `lib/prodLog.ts` — pas d'emails/IDs sensibles dans les agrégats prod

---

## Variables d'environnement critiques

| Variable | Rôle |
|----------|------|
| `DASHBOARD_ADMIN_EMAILS` | **Obligatoire prod** — admins dashboard |
| `ADMIN_EMAILS` | Fallback déprécié |
| `ALLOW_DANGEROUS_EMAIL_LINKING` | `true` uniquement si liaison Google/credentials requise |
| `STRIPE_WEBHOOK_SECRET` | Webhooks billing |
| `STRIPE_IDENTITY_WEBHOOK_SECRET` | Webhook KYC |
| `UPSTASH_REDIS_REST_*` | Rate limits distribués |
| `IP_HASH_SALT` | Hash IP RGPD (recommandé prod) |

---

## Chantiers ouverts

1. **CSP nonces** — retirer `unsafe-inline` (Report-Only preview en place pour mesurer)
2. **Pentest externe** avant grands comptes — voir `docs/PENTEST_CHECKLIST.md`
3. **Audit trail** — étendre `SecurityAuditLog` à toutes les actions admin sensibles

---

## Opérations

- `npm audit` en CI (niveau critical)
- Rotation secrets : `NEXTAUTH_SECRET`, clés JWT, Stripe, Polygon
- Vérifier `DASHBOARD_ADMIN_EMAILS` sur Vercel production
