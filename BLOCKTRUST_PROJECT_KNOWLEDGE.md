# BLOCKTRUST — Knowledge Base v11

**Date:** 13 mai 2026 | **Score:** 9.7/10 | **Global:** 91%

---

## STACK

Next.js 16.2.4 (webpack) · TypeScript · TailwindCSS · NextAuth v5 · Prisma 5 · Neon PostgreSQL · Stripe · Resend · Vercel Blob · jose · Polygon Mainnet · Upstash Redis+QStash · Sentry · Cloudflare · Claude Haiku 4.5

---

## ÉQUIPE & ADMINS

**BRNB TECH SAS** | Capital 1000€ | APE 6201Z

| Nom | Rôle | Email admin | Capital |
|-----|------|-------------|---------|
| Olivier Bernabé | CEO | brnbtech@gmail.com | 50% |
| Laurianne Winter | DAF | laurianne@winter-keys.com | 15% |
| Déborah Slama | Marketing | deborahbernabe@gmail.com | 15% |
| Shaï Bernabé | Data/IA | shai270202@gmail.com | 20% |

```
ADMIN_EMAILS=brnbtech@gmail.com,laurianne@winter-keys.com,deborahbernabe@gmail.com,shai270202@gmail.com
```

**Johanna Bernabé** (VIP) : johannabernabe3@gmail.com + johannafartoukh@yahoo.fr → Enterprise, pas admin

**Tous les admins :** Enterprise + TrustScore 100 + MUTUAL auto (bootstrap via `scripts/bootstrap-all-admins.ts`)

---

## PROPRIÉTÉ INTELLECTUELLE

BLOCKTRUST™ n°5253718 — 30/04/2026 — INPI | EUIPO avant oct. 2026

---

## PRICING (EN RÉVISION)

### B2C (TTC)

| Plan | Prix/mois | Profils | Contacts |
|------|-----------|---------|----------|
| Essentiel | 3,99€ | 1 | 20 |
| Premium | 9,99€ | 1 | 100 |
| Famille | 14,99€ | 5 | 100 |
| Famille+ | 24,99€ | 10 | 300 |

### B2B (HT + TVA 20%)

| Plan | Prix/user/mois | Users | Contacts/user | White Label |
|------|---------------|-------|---------------|-------------|
| Solo Pro | 9,99€ | 1 | 100 | ❌ |
| Starter | 8,99€ | 2-5 | 100/user | ❌ |
| Team | 7,99€ | 6-15 | 200/user | ❌ |
| Business | 5,99€ | 16-50 | 500/user | ✅ |
| Enterprise | Sur devis | 51+ | Illimité | ✅ |

Toggle annuel -20% | Vérifications illimitées 6 mois lancement

**Note : pricing en cours de révision**

---

## WORDING PAR PLAN

| Plan | Dashboard | Contacts | Coordonnées certifiées |
|------|-----------|----------|----------------------|
| B2C Essentiel/Premium | Mon espace | Mes contacts | 1 email + 1 tel |
| B2C Famille/Famille+ | Espace famille | Contacts de la famille | 1 email + 1 tel/profil |
| B2B Solo Pro | Mon espace pro | Mes contacts pro | Multi emails+tel+domaines |
| B2B Starter/Team | Espace équipe | Contacts de l'équipe | Multi emails+tel+domaines |
| B2B Business/Enterprise | Espace entreprise | Contacts entreprise | Illimité |

---

## FEATURES EN PRODUCTION — MAI 2026

### Produit core

- ✅ Badge SVG animé (gold/cyan pivotants + bouclier flottant)
- ✅ QR code rotatif → `/verify?certId=` public
- ✅ Lien sécurisé rotatif 24h (Redis `vt:`)
- ✅ `/verify` extraction URL complète collée
- ✅ Bouton "Copier lien" (pas "Vérifier")
- ✅ Alerte fraude dashboard client
- ✅ FRAUD_ALERT complet (email + admin + TrustScore)

### Identité certifiée

- ✅ certifiedEmails + Phones + Domains sur Entity
- ✅ certifiedEmails + Phones + Domains sur User
- ✅ Wallet crypto (walletAddress + walletNetwork)
- ✅ Section paramètres simple (B2C) vs pro (B2B)
- ✅ API PATCH `/user/certified-contacts`
- ✅ Fusion User + Entity dans `/verify`
- ✅ Restreint par plan (`lib/plan-wording.ts`)

### Dashboard B2B

- ✅ Migration Prisma Organization + TrustVault + OrgMember
- ✅ API organization (6 routes)
- ✅ API vault + entries + bulk (5 routes)
- ✅ Dashboard `/organization` (membres + invitations)
- ✅ Dashboard `/vault` (entrées + import CSV)
- ✅ BlockTrust Vault intégré dans `/verify`
- ✅ Page admin `/admin/organizations`

### Dashboard Admin — restructuré

Sidebar en 5 sections :

- **Vue d'ensemble** → Tableau de bord (KPIs + MRR + ARR)
- **Clients** → Vue clients | Utilisateurs | Organisations B2B
- **Certification** → Certificats | KYC | Demandes Trust
- **Sécurité** → Surveillance IA | Alertes (fusionnées)
- **Administration** → Équipe BLOCKTRUST

Actions rapides par ligne :

- **Vue clients** : Badge (modal) | Plan (modal PATCH) | Email | Détail
- **Certificats** : Ancrer manuellement | Révoquer
- **KYC** : Approuver / Rejeter inline

### Dashboard Client — sidebar restructurée

- *(sans label)* : Tableau de bord | Mon badge
- **Mon réseau** : Mes contacts | Trust Circle | Vault (B2B) | Mon équipe (B2B)
- **Paramètres** : Facturation | Paramètres | API & Marque blanche (Business+)

### Emails

- ✅ EmailSignatureBadge (badge image sm + bouton Vérifier)
- ✅ Signature certifiée sur tous les templates users
- ✅ verifyUrl → `/verify?certId=` public partout
- ✅ buildPublicVerifyUrl lib centralisée

### Sécurité Phase 1+2 complètes

- ✅ SPF/DKIM/DMARC
- ✅ Cloudflare WAF + Bot Fight + SSL Full Strict
- ✅ Rate limit magic link 3/h
- ✅ Zod strict 32 routes
- ✅ RGPD cascade delete
- ✅ Stripe webhook idempotence
- ✅ CORS extension Chrome dynamique

### Extension Chrome TrustScan

- ✅ Manifest V3 + content script Gmail
- ✅ Sélecteurs Gmail 2026
- ✅ API 4 endpoints
- ✅ Clé API dans dashboard settings
- 🔴 Test sur Gmail (Chrome Mac à installer)
- 🔴 Icônes PNG réelles
- 🔴 Publication Chrome Web Store (5$)

---

## SCRIPTS UTILES

```bash
npx tsx scripts/create-plans.ts          # Créer les plans en DB
npx tsx scripts/bootstrap-admin.ts      # Bootstrapper Olivier
npx tsx scripts/bootstrap-all-admins.ts # Bootstrapper les 4 admins
npx tsx scripts/bootstrap-johanna.ts    # Bootstrapper Johanna
npx tsx scripts/cleanup-admins.ts       # Voir profils Laurianne + Déborah
npx prisma migrate deploy               # Appliquer migrations
```

---

## VARIABLES VERCEL

| Variable | Statut |
|----------|--------|
| ADMIN_EMAILS | ✅ 4 adresses |
| STRIPE_SECRET_KEY | ✅ Sensitive |
| RESEND_API_KEY | ✅ Sensitive |
| DATABASE_URL | ✅ |
| NEXTAUTH_SECRET | ✅ Sensitive |
| POLYGON_PRIVATE_KEY | ✅ Sensitive |
| UPSTASH_REDIS_REST_URL/TOKEN | ✅ Sensitive |
| ANTHROPIC_API_KEY | ✅ Sensitive |
| STRIPE_PRICE_SOLO_PRO_* | 🔴 À créer (pricing en révision) |
| STRIPE_PRICE_STARTER_* | 🔴 À créer (pricing en révision) |

---

## OUTILS & UPGRADES

| Outil | Plan | Upgrade quand | Coût |
|-------|------|---------------|------|
| Vercel | Hobby | Dès premiers clients | 20$/mois |
| Cloudflare | Free | Avant grands comptes | 20$/mois |
| Resend | Free (100/jour) | Dès > 100 emails/jour | 20$/mois |
| Neon | Free | Dès premiers revenus | ~15$/mois |
| Upstash | Free | Dès > 1000 users | ~10$/mois |
| Sentry | Free | Production critique | 26$/mois |
| Chrome Web Store | - | Publication extension | 5$ unique |

---

## AVANCEMENT

```
Technique        ████████████████████  100% ✅
Sécurité         ███████████████████░   95%
Produit/UX       ████████████████████   99%
Dashboard B2B    ████████████████░░░░   80%
Extension Chrome ████████░░░░░░░░░░░   40%
Marketing        ████████████████░░░░   80%
Juridique        ████████████░░░░░░░░   62%
Commercial       ████░░░░░░░░░░░░░░░░   20%
GLOBAL           ██████████████████░░   91%
Score            9.7/10
```

---

## CHANTIERS RESTANTS

### 🔴 IMMÉDIAT

- [ ] Audit visuel complet page par page
- [ ] Coordonnées certifiées dans paramètres (fix Enterprise)
- [ ] Synchronisation auto certificats admins bootstrappés
- [ ] Stripe pricing (en révision)
- [ ] Extension Chrome test Gmail

### 🔴 TECHNIQUE

- [ ] Admin AIAlert boutons actions serveur
- [ ] PasswordResetEmail template React Email
- [ ] TrustScore sur tous les chemins FRAUD_ALERT
- [x] SASU → SAS dans le code
- [ ] CI complète (lint + build + prisma validate)
- [ ] Supprimer jsonwebtoken mort

### 🔴 JURIDIQUE (Laurianne)

- [ ] CGU corrections (tribunal, médiateur, rétractation)
- [ ] DPIA avec avocat
- [ ] SOPs incident response + RGPD breach
- [ ] EUIPO avant oct. 2026 (1 200€)
- [ ] HOLDING + SAS + Qonto

### 🟡 APRÈS STABILISATION

- [ ] Tests ciblés /verify + webhooks Stripe
- [ ] Performance DB (index Prisma + Neon)
- [ ] Bundle analyzer
- [ ] Icônes PNG extension Chrome
- [ ] Publication Chrome Web Store
- [ ] Témoignages + chiffres landing (Deborah)
- [ ] Plaquette B2B (Deborah)

### 🔵 LONG TERME

- App mobile + NFC (6-12 mois)
- SSO/SAML Enterprise
- ISO 27001
- Cloudflare Pro
- Pentest externe
- AWS KMS
- Bug bounty

---

## RÈGLES ABSOLUES

```
PrismaClient  → @/app/lib/db
Auth          → @/app/lib/auth-server
AccountType   → PERSONAL / BUSINESS
Burn address  → 0x000000000000000000000000000000000000dEaD
KYC           → jamais visible utilisateur
entité        → contact côté utilisateur
BLOCKTRUST™   → majuscules + trademark
Turbopack     → DÉSACTIVÉ (--webpack)
timingSafeEqual → toute comparaison secrets
Icônes        → lucide-react uniquement
Badge         → uniquement app/api/badge/[id]/route.ts
jsonwebtoken  → À supprimer (mort)
```

---

## ACCÈS

| Ressource | Info |
|-----------|------|
| Production | https://blocktrust.tech |
| Admin | https://blocktrust.tech/admin/dashboard |
| GitHub | github.com/brnbtech770/blocktrust |
| Vercel | vercel.com → blocktrust-mvp |
| Cloudflare | dash.cloudflare.com |
| Neon | console.neon.tech |
| Stripe | dashboard.stripe.com |
| Resend | resend.com |
| Upstash | console.upstash.com |
| Sentry | sentry.io → brnb-tech |
| Anthropic | console.anthropic.com |
| INPI | n°5253718 |

---

## SKILLS PROJECT KNOWLEDGE

| Fichier | Contenu |
|---------|---------|
| Security Phase 1+2+3 | OWASP, WAF, Pentest |
| UI/UX Audit | Checklist complète |
| Stripe Skill | Lazy init, Price IDs, Tax |
| Chrome Extension | MV3, Gmail, CORS |
| React Email | Templates, verifyUrl |
| Design System | Couleurs, typo, badge SVG |
| Process Audit | Flux complet 10 sections |

---

*Mis à jour le 13 mai 2026*  
*Règle absolue : uploader dans Project Knowledge + commit docs/ après chaque session*
