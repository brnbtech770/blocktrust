# BlockTrust — Knowledge Base v3

> **Date de mise à jour** : 22 avril 2026
> **État** : 92 % — MVP en production sur [blocktrust.tech](https://blocktrust.tech)
> **Stack** : Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Prisma 6 · PostgreSQL · NextAuth v5 · Stripe · Resend · Vercel

---

## 1. Vue d'ensemble produit

BlockTrust est une plateforme SaaS qui émet, signe, ancre et vérifie des **certificats d'authenticité numériques** (B2B et B2C). Chaque certificat est :
- associé à une **entité** (individuelle ou entreprise) validée par KYC,
- signé cryptographiquement puis ancré en blockchain,
- vérifiable publiquement via une URL ou un QR code,
- adossé à un **TrustScore (0-100)** calculé en continu pour refléter la fiabilité de l'émetteur.

### Cibles
- **B2C** : particuliers souhaitant certifier l'authenticité de biens (œuvres, artisanat, produits rares).
- **B2B** : entreprises (luxe, immobilier, automobile, art) pour certification produit à l'échelle.

---

## 2. Architecture technique

### Stack

| Couche | Technologie |
|---|---|
| Framework | Next.js 16.2.4 (App Router, Turbopack) |
| UI | React 19.2 + Tailwind CSS 4 + lucide-react |
| Auth | NextAuth v5 (beta.31) + Prisma Adapter + bcrypt |
| DB | PostgreSQL (via Prisma 6.19) |
| Paiement | Stripe (subscriptions + Stripe Identity KYC) |
| Email | Resend + React Email |
| Storage | Vercel Blob (token à activer) |
| Hosting | Vercel (plan Hobby actuellement) |
| Cron | Vercel Cron Jobs |

### Arborescence clé

```
blocktrust-mvp/
├── app/
│   ├── admin/                  # Dashboard admin (protégé par middleware + helper)
│   │   ├── certificates/
│   │   ├── kyc/
│   │   ├── demandes/
│   │   ├── users/
│   │   ├── alerts/ + ai-alerts/
│   │   └── layout.tsx
│   ├── dashboard/              # Dashboard client
│   ├── api/
│   │   ├── admin/*             # Double check : middleware + isAdmin()
│   │   ├── cron/               # anomaly-detection + trustscore-update
│   │   ├── stripe/             # webhooks (checkout, identity)
│   │   ├── trust-circle/
│   │   ├── v2/                 # issue / sign / verify (API publique)
│   │   └── user/trust-score
│   ├── verify/[id]/            # Page publique de vérification
│   ├── components/
│   │   ├── admin/              # StatusBadge, TypeBadge, TrustScoreCell, IdCell, ActionButton
│   │   └── dashboard/
│   └── lib/
│       ├── admin.ts            # ADMIN_EMAILS + isAdmin()
│       ├── require-admin-page.ts
│       ├── auth.ts + auth.edge.config.ts
│       └── db.ts
├── lib/
│   ├── trustscore.ts           # computeTrustScore + persistUserTrustScore
│   ├── agents/trustscore-updater.ts
│   ├── verify-fraud.ts
│   └── register-anti-bot.ts    # Honeypot + heuristiques anti-bot
├── prisma/schema.prisma
├── middleware.ts               # Guard /admin + /api/admin
├── vercel.json                 # Crons quotidiens 03:00 UTC
├── next.config.ts              # Headers HSTS, CSP-ish
└── SECURITY.md
```

### Modèles Prisma principaux
`Account`, `Session`, `User`, `Organization`, `OrganizationMember`, `Plan`, `Subscription`, `Entity`, `Certificate`, `Signature`, `Verification`, `TrustRelation`, `UserTrustRelation`, `ManualTrustEntry`, `UserManualTrustEntry`, `KYCVerification`, `TrustScore`, `BadgeInteraction`, `AIAlert`, `AdminAlert`, `AuditLog`, `UserDevice`, `PasswordReset`.

---

## 3. Sécurité — état au 22/04/2026

### P0 (critique) — tout traité

| # | Faille / mesure | Statut |
|---|---|---|
| 1 | Auth bypass `/api/v2/issue` | ✅ Fixé |
| 2 | JWT fail-closed | ✅ Fixé |
| 3 | Activation certificat côté admin uniquement | ✅ Fixé |
| 4 | Email linking (évite vol de compte via OAuth) | ✅ Fixé |
| 5 | `AUTH_DEBUG` désactivable en prod | ✅ |
| 6 | **Accès admin** : routes `/admin/*` + `/api/admin/*` verrouillées | ✅ Middleware + `requireAdminPage()` + `isAdmin()` sur chaque route |
| 7 | **Isolation données** : tous les `findMany` filtrés par `session.user.id`, `findFirst` pour ownership | ✅ Migration complète de `email` → `id` |

### P2 (hardening)

- Headers HTTP : `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security` (HSTS 2 ans + preload) → `next.config.ts`.
- `ADMIN_EMAILS` exposé en variable d'environnement Vercel (fallback codé : `brnbtech@gmail.com,laurianne@blocktrust.tech`).
- Logs prod nettoyés.
- `SECURITY.md` à la racine.
- `npm audit` : **0 vulnérabilité**.

### Anti-fraude & anti-bot

- **Inscription** : honeypot + délai minimum formulaire + regex email strict + cleanup comptes suspects via `scripts/cleanup-bots.ts`.
- **`/verify`** : détection d'anomalies (volume suspect, IP répétées) → `AdminAlert` + `AIAlert`.
- **Suppression masse admin** (`/api/admin/users/bulk-delete`) avec transaction cascade complète.
- **Agent IA** : 3 règles de détection actives, cron quotidien `/api/cron/anomaly-detection`, dashboard `/admin/surveillance`.

---

## 4. Authentification & autorisation

- NextAuth v5 + Prisma Adapter + credentials (bcrypt) + OAuth (Google).
- JWT signé, strict, fail-closed.
- Password reset via token horodaté (`PasswordReset`).
- Device tracking (`UserDevice`).
- Middleware edge (`middleware.ts`) :
  - `/admin/*` non-admin → redirect `/dashboard`.
  - `/api/admin/*` non-admin → `403 Forbidden`.
- Helper serveur `requireAdminPage()` pour les pages RSC admin.
- Double protection : chaque route `/api/admin/*` revalide `auth()` + `isAdmin()`.

---

## 5. Paiement & abonnements

- **Stripe Checkout** (`/api/stripe/checkout`) pour créer une subscription.
- **Webhooks** (`/api/stripe/webhook`) :
  - `checkout.session.completed` → création User Plan + TrustScore recalculé.
  - `identity.verification_session.verified` → KYC validé + TrustScore recalculé.
  - `invoice.paid` → renouvellement.
  - `customer.subscription.deleted` → désactivation.
- **Email confirmation** : déclenché uniquement par `subscription.created` (plus de double email).
- **Portail client** (`/api/stripe/portal`) pour gérer l'abonnement.

### Plans & quotas
- Certificats par mois (quota par plan).
- Vérifications par mois (quota par plan, sinon `/verify` privée avec upgrade prompt élégant).
- `UpgradePrompt` design doux (plus de rouge agressif).

---

## 6. KYC

### Particulier (B2C)
Stripe Identity → `identity.verification_session.verified` → `User.kycStatus = VERIFIED`.

### Entreprise (B2B)
- API INSEE (SIRET) — **token à configurer** (`api.insee.fr`).
- Fallback manuel via `/onboarding/pending` → demande validée par admin (`/admin/demandes`).

---

## 7. TrustScore (0-100)

### Source
- Librairie dédiée : `lib/trustscore.ts` (pur) + `lib/agents/trustscore-updater.ts` (batch).
- Persisté sur `User.trustScore` (`Int @default(0)`) + `User.trustScoreAt` (`DateTime?`).

### Règles de calcul
- KYC validé : +X points
- Abonnement actif : +X points
- Relations Trust Circle mutuelles confirmées : +X par lien (comptées une seule fois, via `fromUserId`)
- Certificats actifs : +X
- Alertes fraude récentes : **pénalités**

### Déclencheurs de recalcul
- KYC approuvé (`/api/admin/kyc/[userId]/approve` + webhook Stripe Identity)
- Trust Circle mutuel confirmé (`/api/trust-circle/add` + `/api/trust-circle/confirm/[token]`)
- Activation/réactivation de certificat (`/api/admin/certificates/[id]`)
- Événements Stripe (checkout, subscription verified)
- Alertes fraude (`verify-fraud.ts`)

### Cron
- `/api/cron/trustscore-update` — **tous les jours à 03:00 UTC** (Vercel Hobby compatible) — met à jour les users actifs.

### API publique
- `GET /api/user/trust-score` — renvoie le score stocké de l'utilisateur authentifié.
- `POST /api/user/trust-score` — force le recalcul + persistance.

### UI
- Affiché sur `/dashboard` (score + label + couleur + progress bar + nudge KYC si bas).
- Affiché sur `/verify/[id]` pour le titulaire du certificat.

---

## 8. Design system

### Typographie
- **Syne** : titres (`font-syne`).
- **Inter** : corps (`font-sans`).
- **Mono (JetBrains ou similaire)** : IDs, codes, badges techniques (`font-mono`).

### Couleurs clés
- `bt-cyan` : accent principal.
- `gold` : accent premium B2B.
- `navy` : fond général.
- `white/40` → `white/90` : gris typographique.

### Utilities custom (`tailwind.config.ts`)
- `shadow-glow-cyan`, `shadow-glow-gold`
- `drop-shadow-glow-cyan`, `drop-shadow-glow-gold`

### Sidebars
- Icônes `lucide-react` 18px, glow cyan au hover (`drop-shadow-[0_0_6px_rgba(0,212,255,0.8)]`).
- Active state : `bg-white/10 text-white`.
- Logo admin + badge `ADMIN` empilés verticalement (pas d'écrasement).

### Composants admin réutilisables (`app/components/admin/`)
- `StatusBadge` — prop `type: 'certificate' | 'kyc' | 'trust' | 'user'` + `status: string`.
- `TypeBadge` — B2B (gold) / B2C (white/60).
- `TrustScoreCell` — score coloré dynamiquement (`<25` white/40, `25-49` amber, `50-79` gold, `≥80` cyan) + label sous-ligne.
- `IdCell` — `max-w-[120px] truncate font-mono text-xs text-bt-cyan/70` + `title={id}`.
- `ActionButton` — variantes `validate`/`reject`/`suspend`/`reactivate`/`revoke` avec icônes lucide. Exporte aussi `DetailsLink` + `NoActionText`.

### Dashboard client
- Sidebar : padding/hover/active unifiés, icônes lucide avec glow.
- `SignOutButton` : icône `LogOut`, `text-bt-cyan` → `hover:text-white`.
- `CertificateTable` : onglets filtres (All / Active / Pending / Revoked), opacité 60 % sur révoqués, bouton "Révoquer" masqué si déjà révoqué.
- `ActivityFeed` : dédoublonnage strict par `certificateId` (une entrée par certificat, la plus récente), max 5, `formatDistanceToNow` maison (pas de dépendance).
- `VerifyBadgeCard` : texte conditionnel selon `hasActiveSub` (lien `/pricing` si pas d'abo, sinon quota).
- `UpgradePrompt` : palette douce orientée conversion.

### Cookie banner RGPD
- `app/components/ui/CookieBanner.tsx` — bannière conforme.
- Consentement horodaté en DB via `/api/user/cookie-consent`.
- CGU horodatée à l'inscription.

---

## 9. Routes & endpoints clés

### Pages
- `/` — landing (à animer ⚠️)
- `/pricing` — plans
- `/verify` + `/verify/[id]` + `/verify/qr/[token]` — vérification publique
- `/dashboard/*` — espace client
- `/admin/*` — backoffice (dashboard, certificates, kyc, demandes, users, alerts, ai-alerts, surveillance)
- `/onboarding/verify`, `/onboarding/pending`, `/onboarding/rejected`
- `/trust/confirm/[token]`, `/invite/[token]`
- `/cgu`, `/privacy`

### API
- `/api/auth/*` — NextAuth + register + forgot/reset password
- `/api/certificates`, `/api/certificates/[id]` (+ `/revoke`, `/status`)
- `/api/entities`, `/api/entities/[id]/trust-score`
- `/api/verify/[id]`, `/api/badge/[id]`
- `/api/qr/[id]`, `/api/qr/generate/[certId]`, `/api/qr/settings/[certId]`
- `/api/trust-circle/*`
- `/api/stripe/*` (checkout, webhook, portal, identity-webhook)
- `/api/kyc/*` (start, status, siret)
- `/api/admin/*` — protégé
- `/api/cron/trustscore-update`, `/api/cron/anomaly-detection`
- `/api/v2/*` — API publique (issue, sign, verify)
- `/api/stats`, `/api/activity`, `/api/health`, `/api/quota/certificates`, `/api/pricing`

---

## 10. Variables d'environnement

| Variable | Usage | Statut |
|---|---|---|
| `DATABASE_URL` | PostgreSQL | ✅ |
| `NEXTAUTH_SECRET` | Signature JWT | ✅ |
| `NEXTAUTH_URL` | Callback OAuth | ✅ |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth Google | ✅ |
| `ADMIN_EMAILS` | `brnbtech@gmail.com,laurianne@blocktrust.tech` | ✅ |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Paiement | ✅ |
| `STRIPE_IDENTITY_WEBHOOK_SECRET` | KYC | ✅ |
| `RESEND_API_KEY` | Emails | ✅ |
| `CRON_SECRET` | Protection `/api/cron/*` | ✅ |
| `AUTH_DEBUG` | Désactivé en prod | ✅ |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob | ⚠️ À créer |
| `INSEE_API_TOKEN` | SIRET B2B | ⚠️ À créer sur `api.insee.fr` |

---

## 11. Historique des commits récents

```
a5b8eb8 design: admin tableau premium — badges, boutons, statuts cohérents
83be433 design: boutons cohérents + logo admin + icônes glow high-tech
7da7fa5 design: déconnexion cyan + activité feed déduplication stricte
de55916 design: cohérence sidebar + dashboard — déconnexion, filtres, activité
1317721 fix: vercel.json crons compatibles plan Hobby
1cbbbe8 security: isolation données — fix fuite certificats inter-utilisateurs
c8ace3a security: CRITICAL fix accès admin non autorisé — isolation routes /admin
4119ebd feat: TrustScore dynamique — calcul réel + cron quotidien
17d199e fix: supprimer double email confirmation paiement checkout
90a1655 feat: /verify privée + quotas vérification par plan + bouton dashboard
70e33cf chore: npm audit fix vulnérabilités
39d7042 feat: cookie banner RGPD + CGU horodatée inscription
8152738 fix: redirect admin dashboard
9415273 feat: email confirmation paiement Stripe
bd3a4c2 security: anti-bot inscription + cleanup comptes suspects + suppression masse
6429c03 fix: responsive mobile toutes pages + hero title + double logo
3c36c87 feat: agent IA surveillance anomalies + Vercel Cron + dashboard surveillance
8882124 feat: système alertes admin + suppression profils utilisateurs
5c56b94 security: /verify anti-fraude + détection anomalies + AdminAlert
```

---

## 12. État d'avancement

```
Janvier 2026   ████████████░░░░░░░░  65%
Mars 2026      █████████████████░░░  88%
22 avril 2026  ██████████████████░░  92%
```

### Les 8 % restants

| Catégorie | Poids |
|---|---|
| Landing page animée | ~3 % |
| Tests E2E (KYC → certif → QR) + smoke test prod | ~2 % |
| INSEE token + Vercel Blob token + ancrage Polygon | ~2 % |
| DPIA avocat + SOPs incident response + RGPD breach | ~1 % |

---

## 13. Ce qui reste à faire

### 🔴 Urgent (cette semaine)

| # | Tâche | Impact |
|---|---|---|
| 1 | **Landing page animée** | Conversion commerciale |
| 2 | **Test E2E complet** : inscription → KYC → création certif → QR scan → `/verify` | Validation prod |
| 3 | Smoke test visuel sur `blocktrust.tech` : sidebar glow, logo admin, tableaux premium, ShieldCheck | QA |

### 🟡 Moyen terme

- **INSEE API token** → créer compte `api.insee.fr` et renseigner `INSEE_API_TOKEN`.
- **Vercel Blob token** → Vercel dashboard → Storage → créer et renseigner `BLOB_READ_WRITE_TOKEN`.
- **Ancrage Polygon blockchain** : remplacer le mock par un call réel (contrat déployé ?).
- **Badge embed** : intégration URL / email / site web tiers (iframe + OG tags).
- **DPIA** : finaliser avec avocat.
- **SOPs** : incident response + RGPD breach.
- **Migration Next.js 16** : `middleware` est deprecated → migrer vers **`proxy`** (warning build).
- **Migration Prisma 7** : `package.json#prisma` deprecated → créer `prisma.config.ts`.
- **Cleanup** : 8 `catch (e: any)` pré-existants dans les fichiers admin (passage à `unknown` + narrowing).

### 🔵 Long terme

- Extension Chrome **TrustScan** (scan badge sur n'importe quel site).
- App mobile + tag NFC.
- API publique B2B (Trust-as-a-Service).
- Migration JWT → AWS KMS.
- SSO / SAML Enterprise.
- Plugin email Outlook / Gmail.
- Upstash Redis (rate limiting distribué).
- Tests automatisés Jest sur auth + Stripe + KYC.

---

## 14. Comptes & accès

### Admins

- `brnbtech@gmail.com`
- `laurianne@blocktrust.tech`

### Plateformes tierces

- GitHub : `brnbtech770/blocktrust`
- Vercel : `olivier-brnbs-projects/blocktrust-mvp` (alias `blocktrust.tech`)
- Stripe, Resend, Google OAuth : dashboards correspondants.

---

## 15. Commandes utiles

```bash
npm run dev              # Dev local sur :3004
npm run build            # Build prod
npx prisma studio        # Inspection DB
npx prisma migrate dev   # Migration DB
npx vercel --prod        # Deploy prod manuel
git push origin main     # Push (déclenche Vercel webhook)
npx tsc --noEmit         # Vérif TS sans build
npm run cleanup-bots     # Purge comptes suspects
```

---

## 16. Contacts projet

- **Tech lead & fondateur** : Olivier
- **Co-fondatrice** : Laurianne
- **Support admin** : `brnbtech@gmail.com`

---

_Document généré automatiquement à partir de l'état du repo au 22 avril 2026 — commit `a5b8eb8`._
