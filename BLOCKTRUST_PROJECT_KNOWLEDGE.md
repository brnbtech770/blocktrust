# BlockTrust — Document de Référence Projet

**Version:** 6.0  
**Date:** 28 avril 2026  
**Auteur:** Olivier Bernabé (BRNB TECH SAS)  
**Statut:** Production live — 99% d'avancement — Score 8/10

---

## 1. VISION & POSITIONNEMENT

### Message central (nouveau — 28/04/2026)
> "La carte d'identité numérique de tout ce que vous envoyez."

### Positionnement
BlockTrust n'est PAS un antivirus. C'est la **4ème couche de sécurité** que personne d'autre ne couvre :
- Antivirus → protège la machine
- France Identité → prouve qui vous êtes à l'État
- **BLOCKTRUST → prouve qui vous êtes AUX AUTRES et certifie vos documents**

### Équipe (BRNB TECH SAS en cours de transformation)
| Nom | Rôle | Capital |
|-----|------|---------|
| Olivier Bernabé | CEO / Fondateur | 50% |
| Shaï Bernabé | Data / IA | 20% |
| Déborah Bernabé épouse Slama | Marketing | 15% |
| Laurianne Winter | DAF & Chef de projet | 15% |

Capital : 1 000€ — Juriste en charge de la transformation SASU → SAS

---

## 2. STACK TECHNIQUE

```
Framework   : Next.js 16.1.6 (App Router)
Language    : TypeScript
Style       : TailwindCSS
Auth        : NextAuth v5
ORM         : Prisma 5 (v6.19.2)
DB          : PostgreSQL via Neon
Paiements   : Stripe (subscriptions + Stripe Identity KYC)
Emails      : Resend (domaine blocktrust.tech vérifié)
Storage     : Vercel Blob (blocktrust-blob, IAD1, Private)
JWT         : jose (ES256 / RS256)
Blockchain  : Polygon Mainnet (Chain ID 137) via Alchemy
Déploiement : Vercel (plan Hobby)
Repo        : github.com/brnbtech770/blocktrust
```

### Polices
```
Inter          → corps de texte (font-sans)
Space Grotesk  → titres (alias font-syne dans Tailwind)
IBM Plex Mono  → données techniques (font-mono)
```

### Charte
```
#0a1628 navy | #00d4ff cyan | #BDA76B gold
BLOCKTRUST = toujours en majuscules, couleur cyan #00d4ff
```

### Imports critiques
```typescript
import { prisma } from '@/app/lib/db'
import { auth } from '@/app/lib/auth-server'
// AccountType : PERSONAL / BUSINESS
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
| Plan | Prix/mois | Users | Vérifs/mois | White Label |
|------|-----------|-------|-------------|-------------|
| Starter | 29€ | 3 | 200 | ✅ |
| Team | 79€ | 10 | 500 | ✅ |
| Business | 199€ | 50 | Illimité | ✅ |
| Enterprise | Sur devis | Illimité | Illimité | ✅ |

---

## 4. FONCTIONNALITÉS EN PRODUCTION

### Auth & Sécurité
- Google OAuth, Email/Password, Magic Link
- ADMIN_EMAILS via env var
- Middleware fail-closed, JWT RS256
- Anti-bot inscription (honeypot, délai, regex)
- Headers sécurité (X-Frame-Options, HSTS)

### Paiement & KYC
- Stripe checkout B2C + B2B (14 Price IDs)
- Toggle mensuel/annuel, upgrade banner à 80%
- User.planId synchronisé sur 3 événements Stripe
- KYC Stripe Identity (1,50€/vérif)
- INSEE API Sirene 3.11 (SIRET B2B)

### Certificats & Cryptographie
- Signatures ES256 + SHA-256
- QR code rotatif dynamique (invalide après scan)
- /verify PRIVÉE — abonnement requis + quotas
- TrustScore dynamique (KYC, abonnement, ancienneté)
- Cron quotidien 3h recalcul TrustScore

### 🎉 Blockchain Polygon Mainnet RÉEL
- Premier ancrage réel effectué — TX visible PolygonScan ✅
- Burn address `0x000000000000000000000000000000000000dEaD`
- RPC Alchemy Polygon Mainnet (clé personnelle)
- Wallet dédié `BlockTrust Anchor` (~122 POL)
- Ancrage auto à l'activation certificat
- Bouton "⛓️ Ancrer" retry manuel dans admin
- Cron retry 4h (fusionné anomaly-detection)
- **Email confirmation ancrage** envoyé automatiquement avec lien PolygonScan

### Variables Polygon Vercel
```
POLYGON_RPC_URL          = https://polygon-mainnet.g.alchemy.com/v2/[CLÉ]
POLYGON_CHAIN_ID         = 137
POLYGON_PRIVATE_KEY      = 0x... (Sensitive)
POLYGON_CONTRACT_ADDRESS = 0x000000000000000000000000000000000000dEaD
```

### Badge SVG BlockTrust (BlockTrustBadge)
- Hexagone flat-top, gold border gradient
- Circuits data-flow animés (8 traces + 8 nodes)
- Double anneau contra-rotatif gold/cyan
- Bouclier cyan + checkmark gold
- Film lumineux "VERIFIED·SECURE·ON-CHAIN"
- Déployé partout : Hero, Navbar, Footer, Dashboard, /verify, Integration, FinalCTA
- Props : size, className, label, instanceId (SSR-safe)
- prefers-reduced-motion respecté

### Landing Page (refonte 28/04/2026)
- **Pill eyebrow** : "✦ Certifié · Ancré · Infalsifiable"
- **H1** : "La carte d'identité numérique de tout ce que vous envoyez."
- **Sous-titre** : "CV, devis, contrat, document important. BLOCKTRUST prouve que c'est bien vous..."
- **CTA primaire** : "Certifier mon identité" → /auth/register
- **CTA secondaire** : "Voir comment ça marche" → /how-to
- **Micro-copy** : "Inscription en 30 secondes — certification après abonnement"
- **Stats** : Infalsifiable / Anti-usurpation / On-chain (remplacent ES256/256-bit/Polygon)
- **Section Categories** (entre Problem et Solution) :
  - 3 cartes : Antivirus (sourdine) / France Identité (sourdine) / BlockTrust (glow cyan+gold)
  - Eyebrow : "Pourquoi BLOCKTRUST n'a pas de concurrent"
  - Punchline : "La 4ᵉ couche que personne d'autre ne couvre"
- Problem, Solution, Particuliers, Entreprises, Integration, PricingTeaser, FinalCTA, Footer

### OG Image
- Statique 1200×630 (abandon Satori — trop limité)
- Validée sur opengraph.xyz ✅
- Cohérente avec landing : navy, cyan, gold, badge hexagonal

### Navbar
- Bug drawer mobile corrigé (overflow-x-clip)
- CTA unifié "Certifier mon identité" desktop + mobile
- Lien "Comment ça marche" → /how-to

### Page /how-to
- Hero + tabs Particuliers/Entreprises
- Schéma vérification 8 étapes animé
- 3 démos BrowserFrame CSS
- Guide Entreprises (API terminal, marque blanche, SDK)
- FAQ accordion 6 questions

### White Label & API Publique
- Modèle WhiteLabelConfig en DB
- GET /api/public/verify/:id (X-API-Key)
- GET /api/public/widget/:id (SVG personnalisable)
- Webhooks sortants HMAC-SHA256
- Dashboard /dashboard/white-label

### Dashboard & Admin
- KPIs, KYC, Certificats, Demandes, Users
- Alertes temps réel + Surveillance IA
- Colonne Blockchain avec lien PolygonScan
- Bouton "⛓️ Ancrer" retry manuel

### Trust Circle
- 4 niveaux : MUTUAL/UNILATERAL/MANUAL/UNVERIFIED
- Upload documents via Vercel Blob
- Invitations virales /invite/[token]

### Emails (9 templates Resend)
- CertificateAnchoredEmail — confirmation ancrage Polygon + lien PolygonScan
- PaymentConfirmationEmail, KYC, Trust Circle...

### Conformité RGPD
- Cookie banner, CGU horodatée, /privacy + /cgu
- Registre des traitements 5 traitements

### Tests
- E2E 8/8 validé (scripts/test-e2e-flow.ts)

---

## 5. SÉCURITÉ

### Commits critiques
| Fix | Impact |
|-----|--------|
| Auth bypass /api/v2/issue | Critique |
| Isolation données inter-users | Critique |
| User.planId non synchronisé | Important |
| Ancrage from===to rejection | Important |
| Drawer mobile overflow-x-clip | UX |

### Règles absolues
- Burn address comme destination ancrage (jamais wallet.address)
- apiKeyHash jamais retourné dans réponses
- POLYGON_PRIVATE_KEY jamais loggée
- timingSafeEqual pour comparaison hash

### Roadmap sécurité
- WAF Cloudflare, Upstash Redis, Migration JWT → AWS KMS
- Pentest externe, CSP headers, Sentry, Bug bounty

---

## 6. VARIABLES VERCEL

| Variable | Statut |
|----------|--------|
| BLOB_READ_WRITE_TOKEN | ✅ |
| INSEE_CONSUMER_KEY | ✅ Sensitive |
| INSEE_CONSUMER_SECRET | ✅ Sensitive |
| RESEND_API_KEY | ✅ Sensitive |
| STRIPE_SECRET_KEY | ✅ Sensitive |
| STRIPE_WEBHOOK_SECRET | ✅ Sensitive |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | ✅ |
| BLOCKTRUST_JWT_PRIVATE_KEY | ✅ Sensitive |
| BLOCKTRUST_JWT_PUBLIC_KEY | ✅ |
| NEXTAUTH_SECRET | ✅ Sensitive |
| GOOGLE_CLIENT_SECRET | ✅ Sensitive |
| CRON_SECRET | ✅ |
| ADMIN_EMAILS | ✅ |
| DATABASE_URL | ✅ |
| POLYGON_RPC_URL | ✅ Alchemy Mainnet |
| POLYGON_CHAIN_ID | ✅ 137 |
| POLYGON_PRIVATE_KEY | ✅ Sensitive |
| POLYGON_CONTRACT_ADDRESS | ✅ burn address |

---

## 7. PIPELINE DE DÉPLOIEMENT

```bash
cd /Users/olivierbernabe/Projects/blocktrust-mvp
git push origin main          # webhook auto → Vercel
git commit --allow-empty -m "chore: force redeploy"
git push origin main          # si variables changées

git config user.email "brnbtech770@gmail.com"
git config --global credential.helper osxkeychain
```

**Vercel Hobby → 2 crons max (0 3 * * * + 0 4 * * *)**

---

## 8. STRATÉGIE COMMERCIALE

### Positionnement
- Produit **horizontal multi-secteurs** — opportuniste
- PAS de verticalisation forcée
- On traite les clients au fur et à mesure, peu importe le secteur

### Leviers commerciaux
| Levier | Description |
|--------|-------------|
| Agence immo | Dogfood — Olivier l'utilise dans son agence |
| 50+ contacts immo | Notaires, diagnostiqueurs, agents, banques |
| Koray | Connecteur banques/crypto/IA |
| Deborah/UMG | Background Universal Music — opportuniste |
| Chining direct | Réseau pro LinkedIn |

### Profil CEO
- 25 ans expérience immobilier, ancien Nexity
- Agence immobilière principale (rentable, pas de pression cash)
- À l'aise commercial mais pas encore sur BlockTrust
- BlockTrust = projet parallèle, pas activité de survie

---

## 9. CHANTIERS RESTANTS

### 🔴 Immédiat
- [ ] **1er client B2B signé** (priorité absolue)
- [ ] Livrables commerciaux : plan 4 semaines + brief Deborah
- [ ] Fix UpgradePrompt UX (bannière rouge → élégant)
- [ ] DPIA + SOPs (Laurianne)
- [ ] Dépôt INPI BLOCKTRUST + BLOCKTRUST CIRCLE (620€)

### 🟡 Moyen terme
- [ ] Migration middleware → proxy (Next.js 16)
- [ ] Migration prisma.config.ts (avant Prisma 7)
- [ ] Upstash Redis rate limiting
- [ ] Monitoring Sentry
- [ ] Témoignages + chiffres réels landing
- [ ] Dépôt EUIPO Europe (2 400€)
- [ ] Page /auth/register — vérifier cohérence wording CTA

### 🔵 Long terme
- Extension Chrome TrustScan
- App mobile + NFC
- SSO / SAML Enterprise
- WAF Cloudflare + pentest externe
- Migration JWT → AWS KMS
- ISO 27001
- Partenariats SeLoger/Malt/LeBonCoin

---

## 10. OBJECTIFS 9-10/10

Score actuel : **8/10**

| Action | Impact |
|--------|--------|
| 1 client B2B signé | +++++ |
| Témoignages + chiffres réels | +++ |
| DPIA + SOPs | ++ |
| Extension Chrome + plugin email | ++ |
| Partenariats prescripteurs | +++++ |

**La priorité n°1 est commerciale, pas technique.**

---

## 11. RÈGLES DE TRAVAIL

### Workflow Cursor
1. Un prompt à la fois — audit step obligatoire
2. Build vert entre chaque prompt
3. Reporter résultats à Claude avant le suivant
4. Push + déploiement après validation
5. **Knowledge base mis à jour après chaque session**

### Ne jamais faire
- PrismaClient ad hoc (→ @/app/lib/db)
- userId du body/query (→ session.user.id)
- wallet.address comme destinataire ancrage
- POLYGON_PRIVATE_KEY dans les logs
- apiKeyHash dans les réponses API
- Stats non vérifiables sur la landing (ex: 99,9% uptime sans monitoring)

---

## 12. DOCUMENTS PRODUITS

| Document | Statut |
|----------|--------|
| BLOCKTRUST_PROJECT_KNOWLEDGE_v6.md | ✅ Ce fichier |
| BLOCKTRUST_Plan_Juridique_Laurianne.docx | ✅ DPIA + ISO + CGU |
| BLOCKTRUST_Depot_Marque_INPI.docx | ✅ 2 marques, 4 classes |

---

## 13. ACCÈS & CONTACTS

| Ressource | Info |
|-----------|------|
| Production | https://blocktrust.tech |
| How-to | https://blocktrust.tech/how-to |
| GitHub | github.com/brnbtech770/blocktrust |
| Vercel | vercel.com → blocktrust-mvp |
| Alchemy | dashboard.alchemy.com |
| PolygonScan | polygonscan.com |
| MetaMask | Compte "BlockTrust Anchor" dédié |
| Admin | blocktrust.tech/admin/dashboard |
| Support | support@blocktrust.tech |
| Sécurité | security@blocktrust.tech |
| Commercial | commercial@blocktrust.tech |

---

*Mis à jour le 28 avril 2026 — Session Claude*
*🎉 Milestones : Ancrage Polygon réel + Refonte positionnement landing*
*Règle : ce fichier est mis à jour après chaque session*
*→ Uploader dans Project Knowledge Claude + commit GitHub*
