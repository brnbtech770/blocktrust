# BlockTrust — Document de Référence Projet

**Version:** 4.0  
**Date:** 26 avril 2026  
**Auteur:** Olivier Bernabé (BRNB TECH SASU)  
**Statut:** Production live — 96% d'avancement

---

## 1. VISION & POSITIONNEMENT

### Message central
> "Protégez chaque interaction de votre écosystème digital"

BlockTrust est une plateforme SaaS de certification d'identité numérique anti-fraude combinant signatures cryptographiques (ES256, SHA-256), ancrage blockchain (Polygon) et vérification par QR code rotatif.

### Équipe
| Nom | Rôle |
|-----|------|
| Olivier Bernabé | CEO / Fondateur / CTO |
| Laurianne Winter | DAF & Chef de projet |
| Deborah Slama | Directrice Marketing |
| Shaï Bernabé | Data / IA (Bachelor PSTB) |

### Propriété intellectuelle
- Domaine `blocktrust.tech` ✅
- Dépôt INPI "Block Trust" ✅
- Code source GitHub privé `brnbtech770/blocktrust` ✅

---

## 2. STACK TECHNIQUE

```
Framework : Next.js 16.1.6 (App Router)
Language  : TypeScript
Style     : TailwindCSS
Auth      : NextAuth v5 (Google OAuth + Credentials + Magic Link)
ORM       : Prisma 5 (v6.19.2)
DB        : PostgreSQL via Neon
Paiements : Stripe (subscriptions + Stripe Identity KYC)
Emails    : Resend (domaine blocktrust.tech vérifié)
Storage   : Vercel Blob (store: blocktrust-blob, région IAD1, Private)
JWT       : jose (ES256 / RS256)
QR        : qrcode
Déploiement : Vercel (plan Hobby)
Repo      : github.com/brnbtech770/blocktrust
```

### Polices
```
Inter          → corps de texte (font-sans)
Space Grotesk  → titres (font-syne — alias conservé dans Tailwind)
IBM Plex Mono  → données techniques (font-mono)
```

### Charte graphique
```
#0a1628 navy | #00d4ff cyan | #BDA76B gold
```

### Imports critiques
```typescript
import { prisma } from '@/app/lib/db'
import { auth } from '@/app/lib/auth-server'
// AccountType : PERSONAL / BUSINESS
// JWT : BLOCKTRUST_JWT_PRIVATE_KEY / BLOCKTRUST_JWT_PUBLIC_KEY
```

---

## 3. PRICING

### B2C
| Plan | Prix/mois | Profils | Entités | Vérifs/mois |
|------|-----------|---------|---------|-------------|
| Essentiel | 4,99€ | 1 | 20 | 10 |
| Premium | 9,99€ | 1 | 100 | 50 |
| Famille | 14,99€ | 5 | 100 | 100 |
| Famille+ | 24,99€ | 10 | 300 | 300 |

### B2B
| Plan | Prix/mois | Users | Vérifs/mois |
|------|-----------|-------|-------------|
| Starter | 29€ | 3 | 200 |
| Team | 79€ | 10 | 500 |
| Business | 199€ | 50 | Illimité |
| Enterprise | Sur devis | Illimité | Illimité |

**Toggle annuel : -20% | 14 Price IDs Stripe | Upgrade banner à 80%**

---

## 4. FONCTIONNALITÉS EN PRODUCTION

### Auth
- Google OAuth, Email/Password, Magic Link
- ADMIN_EMAILS via env var
- Middleware fail-closed, JWT RS256

### Paiement & KYC
- Stripe checkout B2C + B2B, webhooks validés
- KYC Stripe Identity (1,50€/vérif)
- **INSEE API Sirene 3.11** — vérification SIRET B2B
  - OAuth2 Client Credentials
  - Badge "INSEE ✓" dans admin/kyc
  - Variables : INSEE_CONSUMER_KEY + INSEE_CONSUMER_SECRET

### Certificats & Badge
- ES256 + SHA-256
- Badge SVG inline animé (BlockTrustBadge component)
- QR dynamique rotatif (invalide après scan)
- /verify PRIVÉE — abonnement requis + quotas par plan
- Quotas : Essentiel 10/mois → Business illimité

### Trust Circle
- 4 niveaux : MUTUAL/UNILATERAL/MANUAL/UNVERIFIED
- Upload documents via **Vercel Blob** (store blocktrust-blob)
- Invitations virales /invite/[token]

### TrustScore dynamique
- KYC (+30) | abonnement (+15) | cert actif (+20)
- Ancienneté (+10 max) | CGU (+5) | MUTUAL (+1/rel, max 15)
- Pénalité FRAUD_ALERT (-10/alerte)
- Cron quotidien 3h : /api/cron/trustscore-update
- Labels : TRUSTED/VERIFIED/LOW/UNVERIFIED

### Emails (Resend)
- PaymentConfirmationEmail (1 seul email par souscription)
- KYC, Trust Circle, Manuel — 9 templates total

### Dashboard Admin
- KPIs, KYC, Certificats, Demandes, Users
- Alertes temps réel (6 types) + pastille rouge
- Surveillance IA (3 règles + Cron + Recharts)
- Suppression profils en cascade ($transaction)
- Composants réutilisables : StatusBadge, TypeBadge,
  TrustScoreCell, IdCell, ActionButton

### Conformité RGPD
- Cookie banner (localStorage + DB)
- CGU horodatée (cguAcceptedAt, cguVersion)
- /privacy + /cgu
- Registre des traitements ✅

---

## 5. LANDING PAGE (26/04/2026)

### Composants créés
```
Hero.tsx          — Badge SVG animé + headline + CTA + stats
Problem.tsx       — 3 cards problème (lucide icons)
Solution.tsx      — Timeline 3 étapes
Particuliers.tsx  — 3 use cases B2C + CTA 4,99€
Entreprises.tsx   — 4 use cases B2B + CTA
Integration.tsx   — 4 tabs (Site web/Email/Visio/API B2B)
PricingTeaser.tsx — 2 cards + "À partir de 29€/mois" B2B
FinalCTA.tsx      — CTA gradient + boutons
Footer.tsx        — Liens + LinkedIn + Polygon mention
Reveal.tsx        — IntersectionObserver wrapper
StatCounter.tsx   — Compteurs animés requestAnimationFrame
```

### Badge SVG BlockTrust (app/components/ui/BlockTrustBadge.tsx)
- Hexagone flat-top, gold border gradient
- Circuits data-flow animés (8 traces + 8 nodes pulsants)
- Double anneau contra-rotatif gold/cyan
- Bouclier central : gradient cyan profond + checkmark gold
- Scanline, QR pattern, "BLOCKTRUST" IBM Plex Mono gold
- "VERIFIED · SECURE · ON-CHAIN" cyan
- Props : size, className, label
- CSS animations dans globals.css (prefixe bt-)
- prefers-reduced-motion respecté
- **⚠️ À appliquer partout : dashboard, badge embed, /verify, OG image**

---

## 6. SÉCURITÉ

### Commits de sécurité
| Fix | Commit |
|-----|--------|
| Auth bypass /api/v2/issue | 6427938 |
| Isolation données inter-users | 1cbbbe8 |
| Accès admin non autorisé | c8ace3a |
| Headers HTTP sécurité | P2 |
| Anti-bot inscription | bd3a4c2 |
| npm audit 0 vulnérabilités | 70e33cf |

### Règles absolues
- Ne jamais faire confiance à userId du body → session.user.id
- timingSafeEqual pour hash comparison
- Pas de PrismaClient ad hoc → @/app/lib/db
- Fail-closed sur clé JWT absente en prod

---

## 7. VARIABLES D'ENVIRONNEMENT VERCEL

| Variable | Statut |
|----------|--------|
| BLOB_READ_WRITE_TOKEN | ✅ Auto-ajouté |
| INSEE_CONSUMER_KEY | ✅ Sensitive |
| INSEE_CONSUMER_SECRET | ✅ Sensitive |
| RESEND_API_KEY | ✅ |
| STRIPE_SECRET_KEY | ✅ (Needs Attention → marquer Sensitive) |
| STRIPE_WEBHOOK_SECRET | ✅ (Needs Attention → marquer Sensitive) |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | ✅ |
| BLOCKTRUST_JWT_PRIVATE_KEY | ✅ (Needs Attention → marquer Sensitive) |
| BLOCKTRUST_JWT_PUBLIC_KEY | ✅ |
| NEXTAUTH_SECRET | ✅ (Needs Attention → marquer Sensitive) |
| CRON_SECRET | ✅ |
| ADMIN_EMAILS | ✅ brnbtech@gmail.com,laurianne@blocktrust.tech |
| DATABASE_URL | ✅ |

---

## 8. PIPELINE DE DÉPLOIEMENT

```bash
# Depuis Terminal Mac
cd /Users/olivierbernabe/Projects/blocktrust-mvp
git push origin main          # webhook auto → Vercel déploie
npx vercel --prod             # si webhook KO

# Config git
git config user.email "brnbtech770@gmail.com"
git config user.name "brnbtech770"
git config --global credential.helper osxkeychain
```

**Vercel Hobby → Crons quotidiens uniquement (0 3 * * *)**

---

## 9. CHANTIERS RESTANTS

### 🔴 Priorité immédiate
- [ ] **Appliquer BlockTrustBadge partout** (dashboard, /verify, badge embed, OG image)
- [ ] **Test E2E complet** KYC → certificat → QR scan sur prod
- [ ] **Marquer Sensitive** les variables Vercel "Needs Attention"

### 🟡 Moyen terme
- [ ] **Ancrage Polygon** blockchain réel
- [ ] **Intégration appels** : Twilio (tel) + API B2B + plugin Teams/Zoom
- [ ] **Migration middleware → proxy** Next.js 16
- [ ] **Migration prisma.config.ts** avant Prisma 7
- [ ] **DPIA** finaliser pour avocat
- [ ] **SOPs** incident response + RGPD breach
- [ ] **npm audit** 3 vulnérabilités modérées (tar@7.5.7)
- [ ] **Upstash Redis** rate limiting distribué (avant 100 users)

### 🔵 Long terme
- Extension Chrome TrustScan
- App mobile + NFC
- API publique B2B (TaaS)
- Migration JWT → AWS KMS
- SSO / SAML Enterprise
- Tests automatisés Jest
- BlockTrust GPT

---

## 10. RÈGLES DE TRAVAIL

### Workflow Cursor
1. Un prompt à la fois — audit step obligatoire
2. Build vert entre chaque prompt
3. Reporter résultats à Claude avant le suivant
4. Push + déploiement après validation

### Principes
- Turbopack désactivé (stale Prisma cache)
- Google OAuth : fallbacks token.sub ?? token.id ?? ''
- QR verify : double lookup jti → Certificate.id
- Domain consistency www vs non-www → NextAuth
- `__Host-` cookie incompatible avec domain spec

### Ne jamais faire
- PrismaClient ad hoc (→ @/app/lib/db)
- userId du body/query (→ session.user.id)
- Erreur rouge sur page de conversion (→ UpgradePrompt)
- Déployer avec variables manquantes

---

## 11. ACCÈS & CONTACTS

| Ressource | Info |
|-----------|------|
| Production | https://blocktrust.tech |
| GitHub | github.com/brnbtech770/blocktrust |
| Vercel | vercel.com → blocktrust-mvp |
| Stripe | dashboard.stripe.com |
| Resend | resend.com |
| Neon DB | neon.tech |
| INSEE API | portail-api.insee.fr |
| Vercel Blob | vercel.com → Storage → blocktrust-blob |
| Admin | blocktrust.tech/admin/dashboard |
| Support | support@blocktrust.tech |
| Sécurité | security@blocktrust.tech |
| Commercial | commercial@blocktrust.tech |

---

*Mis à jour le 26 avril 2026 — Session Claude*
*Règle : ce fichier est mis à jour après chaque session*
*→ Uploader dans Project Knowledge Claude + commit GitHub*
