# BlockTrust — Document de Référence Projet

**Version:** 6.1
**Date:** 28 avril 2026
**Auteur:** Olivier Bernabé (BRNB TECH SAS)
**Statut:** Production live — 100% technique — Score 8.5/10

---

## 1. VISION & POSITIONNEMENT

### Message central
> "La carte d'identité numérique de tout ce que vous envoyez."

### Positionnement — La 4ème couche
| Solution | Ce qu'elle fait | Ce qu'elle ne fait PAS |
|----------|----------------|----------------------|
| Antivirus | Protège la machine | Ne prouve pas qui vous êtes |
| France Identité | Prouve votre identité à l'État | Ne prouve pas aux autres |
| 2FA / MDP | Sécurise vos accès | Ne certifie pas vos documents |
| **BLOCKTRUST** | **Prouve que c'est bien VOUS aux autres + certifie vos documents** | Complémentaire aux autres |

### Équipe (BRNB TECH SAS — transformation en cours)
| Nom | Rôle | Capital |
|-----|------|---------|
| Olivier Bernabé | CEO / Fondateur | 50% |
| Shaï Bernabé | Data / IA | 20% |
| Déborah Bernabé épouse Slama | Marketing | 15% |
| Laurianne Winter | DAF & Chef de projet | 15% |

Capital : 1 000€ — Juriste en charge transformation SASU → SAS

---

## 2. STACK TECHNIQUE

```
Framework    : Next.js 16.1.6 (App Router)
Language     : TypeScript (strict)
Style        : TailwindCSS
Auth         : NextAuth v5
ORM          : Prisma 5 (v6.19.3) + prisma.config.ts
DB           : PostgreSQL via Neon
Paiements    : Stripe (subscriptions + Stripe Identity KYC)
Emails       : Resend (domaine blocktrust.tech vérifié)
Storage      : Vercel Blob (blocktrust-blob, IAD1, Private)
JWT          : jose (ES256 / RS256)
Blockchain   : Polygon Mainnet (Chain ID 137) via Alchemy
Rate Limiting: Upstash Redis (distribué) + in-memory fallback
Monitoring   : Sentry (@sentry/nextjs — production uniquement)
Déploiement  : Vercel (plan Hobby)
Repo         : github.com/brnbtech770/blocktrust
```

### Polices
```
Inter          → corps de texte (font-sans)
Space Grotesk  → titres (alias font-syne dans Tailwind)
IBM Plex Mono  → données techniques (font-mono)
```

### Charte graphique
```
#0a1628 navy | #00d4ff cyan | #BDA76B gold
BLOCKTRUST = toujours en majuscules, couleur cyan #00d4ff
KYC = jargon interne uniquement (jamais visible utilisateur)
```

### Imports critiques
```typescript
import { prisma } from '@/app/lib/db'
import { auth } from '@/app/lib/auth-server'
// AccountType : PERSONAL / BUSINESS
// Proxy (middleware.ts renommé proxy.ts — Next.js 16)
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

**Toggle annuel : -20% engagement annuel**
**14 Price IDs Stripe | Upgrade banner à 80% quota**
**Point 9 Laurianne : pricing dégressif B2B → call Deborah/Laurianne à venir**

---

## 4. FONCTIONNALITÉS EN PRODUCTION

### Auth & Sécurité
- Google OAuth, Email/Password, Magic Link
- ADMIN_EMAILS via env var
- Proxy Edge (proxy.ts — migré depuis middleware.ts Next.js 16)
- JWT RS256, fail-closed
- Anti-bot inscription (honeypot, délai, regex)
- Headers sécurité (X-Frame-Options, HSTS)
- Upstash Redis rate limiting distribué (fail-soft vers in-memory)

### Paiement & KYC
- Stripe checkout B2C + B2B (14 Price IDs)
- User.planId synchronisé sur 3 événements Stripe
- Stripe Identity (1,50€/vérif) — "Vérification d'identité" côté utilisateur
- INSEE API Sirene 3.11 (SIRET B2B)

### Certificats & Cryptographie
- Signatures ES256 + SHA-256
- QR code rotatif dynamique (invalide après scan)
- /verify PRIVÉE — abonnement requis + quotas
- TrustScore dynamique
- Cron quotidien 3h recalcul

### Blockchain Polygon Mainnet RÉEL
- Premier ancrage réel effectué — TX visible PolygonScan ✅
- Burn address `0x000000000000000000000000000000000000dEaD`
- RPC Alchemy Polygon Mainnet (clé personnelle)
- Wallet dédié `BlockTrust Anchor` (~122 POL)
- Ancrage auto à l'activation certificat (fire-and-forget)
- Bouton "⛓️ Ancrer" retry manuel dans /admin/certificates
- Cron retry 4h (fusionné anomaly-detection)
- Email confirmation ancrage → utilisateur reçoit lien PolygonScan

### Variables Polygon Vercel
```
POLYGON_RPC_URL          = https://polygon-mainnet.g.alchemy.com/v2/[CLÉ]
POLYGON_CHAIN_ID         = 137
POLYGON_PRIVATE_KEY      = 0x... (Sensitive)
POLYGON_CONTRACT_ADDRESS = 0x000000000000000000000000000000000000dEaD
```

### Badge SVG BlockTrust (BlockTrustBadge)
- Hexagone flat-top, gold border gradient
- Circuits data-flow animés (8 traces + 8 nodes pulsants)
- Double anneau contra-rotatif gold/cyan
- Bouclier cyan + checkmark gold
- Film lumineux "VERIFIED·SECURE·ON-CHAIN"
- Props : size, className, label, instanceId (useId SSR-safe)
- Déployé : Hero, Navbar (size=44), Footer, Dashboard, /verify, Integration, FinalCTA
- prefers-reduced-motion respecté

### Landing Page (refonte 28/04/2026)
- Pill : "✦ Certifié · Ancré · Infalsifiable"
- H1 : "La carte d'identité numérique de tout ce que vous envoyez."
- CTA : "Certifier mon identité" + micro-copy "Inscription en 30 secondes"
- Stats : Infalsifiable / Anti-usurpation / On-chain
- Section Categories (anti-objection antivirus)
- Exemples concrets B2C dans Particuliers
- "-20% engagement annuel" (plus "offre de lancement")
- Silver/bronze/gold supprimés des plans

### OG Image & Favicon
- OG statique 1200×630 validée opengraph.xyz ✅
- Favicon SVG + apple-touch-icon + icon-512
- Ancien logo Bitcoin 100% supprimé

### Page /how-to
- Hero + tabs Particuliers/Entreprises
- Schéma 8 étapes animé
- 3 démos BrowserFrame CSS
- FAQ 6 questions (sans jargon KYC)

### White Label & API Publique
- GET /api/public/verify/:id + GET /api/public/widget/:id
- Webhooks HMAC-SHA256
- Dashboard /dashboard/white-label
- Rate limit 30 req/min

### Dashboard & Admin
- UpgradePrompt élégant gold/navy (plus de bannière rouge)
- Colonne Blockchain + bouton "⛓️ Ancrer"
- Alertes temps réel + Surveillance IA

### Emails (9 templates Resend)
| Template | Déclencheur |
|----------|-------------|
| CertificateAnchoredEmail | Ancrage Polygon — lien PolygonScan |
| PaymentConfirmationEmail | Souscription Stripe |
| KYCApprovedEmail | Vérification d'identité approuvée |
| KYCRejectedEmail | Vérification d'identité rejetée |
| TrustCircleInviteEmail | Invitation Trust Circle |
| TrustCircleConfirmedEmail | Confirmation Trust Circle |
| ManualTrustRequestEmail | Demande trust manuel |
| MagicLinkEmail | Connexion magic link |
| PasswordResetEmail | Réinitialisation mot de passe |

### Tests
- E2E 8/8 validé (scripts/test-e2e-flow.ts)

---

## 5. SÉCURITÉ

### Architecture en couches
```
Couche 1 : Proxy Edge (proxy.ts) — rejet avant NextAuth
Couche 2 : Upstash Redis rate limiting distribué
Couche 3 : NextAuth + JWT RS256 fail-closed
Couche 4 : Server Components auth() + redirect()
Couche 5 : Prisma ownership checks
Couche 6 : timingSafeEqual hash comparison
Couche 7 : Sentry monitoring production
```

### Règles absolues
- Burn address comme destination ancrage (jamais wallet.address)
- apiKeyHash jamais retourné dans réponses
- POLYGON_PRIVATE_KEY jamais loggée
- KYC = jargon interne uniquement

### Roadmap sécurité
- WAF Cloudflare, Migration JWT → AWS KMS
- Pentest externe, CSP headers, Bug bounty, ISO 27001

---

## 6. TOUS LES SUPPORTS & OUTILS

### Développement
| Outil | Usage |
|-------|-------|
| **Cursor (Composer)** | IDE principal — workflow audit-then-modify |
| **GitHub** `brnbtech770/blocktrust` | Versioning — branch main |
| **Vercel** | Déploiement auto webhook GitHub |
| **Terminal Mac** | Push git, commits vides force-redeploy |

### Base de données & Storage
| Outil | Usage |
|-------|-------|
| **Neon PostgreSQL** | Base de données principale |
| **Prisma 5** (v6.19.3) | ORM — prisma.config.ts configuré |
| **Vercel Blob** (blocktrust-blob, IAD1) | Documents Trust manuel (Private) |

### Paiement & Identité
| Outil | Usage |
|-------|-------|
| **Stripe** | Abonnements B2C + B2B (14 Price IDs) |
| **Stripe Identity** | Vérification d'identité biométrique |
| **INSEE API Sirene 3.11** | Vérification SIRET B2B |

### Auth & Sécurité
| Outil | Usage |
|-------|-------|
| **NextAuth v5** | Auth multi-provider |
| **jose** | JWT ES256/RS256 |
| **Upstash Redis** | Rate limiting distribué (Free tier) |
| **Sentry** | Monitoring erreurs production |

### Blockchain
| Outil | Usage |
|-------|-------|
| **Polygon Mainnet** (Chain ID 137) | Ancrage certificats |
| **Alchemy** | RPC Polygon (clé personnelle) |
| **MetaMask** | Wallet "BlockTrust Anchor" (~122 POL) |
| **PolygonScan** | Vérification transactions publiques |
| **ethers v6** | Lib blockchain dans le code |

### Emails & Communication
| Outil | Usage |
|-------|-------|
| **Resend** | Emails transactionnels |
| **React Email** | Templates emails |

### Design & Prototype
| Outil | Usage |
|-------|-------|
| **Lovable** | Prototype référence + badge SVG |
| **Figma/Canva** | Assets visuels équipe |
| **ChatGPT** | Génération images (base logo hexagonal) |

### Conformité & Juridique
| Outil | Usage |
|-------|-------|
| **INPI** (depot.inpi.fr) | Dépôt marques (à faire) |
| **EUIPO** | Dépôt marque UE (à faire) |
| **CNIL** | Conformité RGPD |

### Collaboration équipe
| Outil | Usage |
|-------|-------|
| **Google Drive** | Documents partagés équipe |
| **Project Knowledge Claude** | Knowledge base + docs projet |
| **Claude (cette conversation)** | CTO/architecte senior — direction technique |

---

## 7. VARIABLES VERCEL (toutes configurées)

| Variable | Statut | Scope |
|----------|--------|-------|
| BLOB_READ_WRITE_TOKEN | ✅ Auto | All |
| INSEE_CONSUMER_KEY | ✅ Sensitive | Prod+Preview |
| INSEE_CONSUMER_SECRET | ✅ Sensitive | Prod+Preview |
| RESEND_API_KEY | ✅ Sensitive | All |
| STRIPE_SECRET_KEY | ✅ Sensitive | Prod+Preview |
| STRIPE_WEBHOOK_SECRET | ✅ Sensitive | All |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | ✅ | All |
| BLOCKTRUST_JWT_PRIVATE_KEY | ✅ Sensitive | Prod+Preview |
| BLOCKTRUST_JWT_PUBLIC_KEY | ✅ | All |
| NEXTAUTH_SECRET | ✅ Sensitive | Prod+Preview |
| GOOGLE_CLIENT_ID | ✅ | All |
| GOOGLE_CLIENT_SECRET | ✅ Sensitive | Prod+Preview |
| CRON_SECRET | ✅ | All |
| ADMIN_EMAILS | ✅ | All |
| DATABASE_URL | ✅ | All |
| POLYGON_RPC_URL | ✅ Sensitive | Prod+Preview |
| POLYGON_CHAIN_ID | ✅ | All |
| POLYGON_PRIVATE_KEY | ✅ Sensitive | Prod+Preview |
| POLYGON_CONTRACT_ADDRESS | ✅ | All |
| UPSTASH_REDIS_REST_URL | ✅ Sensitive | Prod+Preview |
| UPSTASH_REDIS_REST_TOKEN | ✅ Sensitive | Prod+Preview |
| NEXT_PUBLIC_SENTRY_DSN | ✅ | Prod+Preview |
| SENTRY_AUTH_TOKEN | ✅ Sensitive | Prod+Preview |

---

## 8. PIPELINE DE DÉPLOIEMENT

```bash
# Déploiement normal
cd /Users/olivierbernabe/Projects/blocktrust-mvp
git push origin main

# Forcer redéploiement après variables Vercel
git commit --allow-empty -m "chore: force redeploy"
git push origin main

# Config git
git config user.email "brnbtech770@gmail.com"
git config --global credential.helper osxkeychain
```

**Vercel Hobby → 2 crons max :**
- `0 3 * * *` → trustscore-update
- `0 4 * * *` → anomaly-detection + polygon-retry

---

## 9. STRATÉGIE COMMERCIALE

### Principes
- Produit horizontal multi-secteurs — opportuniste
- PAS de verticalisation forcée
- Pricing maintenu — valeur > prix (1 fraude évitée > 12 mois d'abo)

### Niches & Leviers
| Niche | Levier | Plan cible |
|-------|--------|------------|
| Immobilier | Réseau Olivier (50+ contacts) | Starter/Team |
| Freelances | Persona Jessica validée | Essentiel |
| Finance/Crypto | Koray (connecteur) | Business/Enterprise |
| Professions libérales | Approche directe | Starter |
| E-commerce | Partenariats futurs | Essentiel/Premium |

### Actions immédiates
- Appel Koray (script fourni dans plan commercial)
- Dogfood agence immo Olivier
- Réseaux sociaux → après INPI + SAS officielle

---

## 10. DOCUMENTS PRODUITS

| Document | Localisation | Contenu |
|----------|-------------|---------|
| BLOCKTRUST_PROJECT_KNOWLEDGE_v6.md | Project Knowledge + GitHub | Ce fichier |
| BLOCKTRUST_Plan_Juridique_Laurianne.docx | Drive + Project Knowledge | DPIA + ISO + CGU |
| BLOCKTRUST_Depot_Marque_INPI.docx | Drive + Project Knowledge | 2 marques, 4 classes |
| BLOCKTRUST_Plan_Commercial_Deborah_Laurianne.docx | Drive + Project Knowledge | Plan 4 semaines + scripts |
| FEEDBACKS_BOARD | Google Drive équipe | Feedbacks Laurianne + Jessica |

---

## 11. CHANTIERS RESTANTS

### 🔴 Commercial
- [ ] 1er client B2B signé (priorité absolue)
- [ ] Appel Koray
- [ ] Dogfood agence immo
- [ ] Démo vidéo 2 min (Deborah)

### 🔴 Juridique (Laurianne)
- [ ] Dépôt INPI BLOCKTRUST + BLOCKTRUST CIRCLE (620€)
- [ ] Recherche antériorités avant dépôt
- [ ] DPIA + avocat
- [ ] CGU/CGV corrections + avocat
- [ ] SOPs incident response + RGPD breach
- [ ] EUIPO Europe (2 400€) — après INPI

### 🟡 Produit
- [ ] Témoignages + chiffres réels landing
- [ ] Call Deborah/Laurianne — pricing B2B dégressif
- [ ] Accordion détail par plan /pricing
- [ ] Page /auth/register wording cohérence

### 🔵 Long terme
- Extension Chrome TrustScan
- App mobile + NFC
- SSO / SAML Enterprise
- WAF Cloudflare + pentest
- Migration JWT → AWS KMS
- ISO 27001
- Partenariats SeLoger/Malt/LeBonCoin

---

## 12. OBJECTIFS 9-10/10

Score actuel : **8.5/10**

| Action | Impact | Score estimé |
|--------|--------|-------------|
| 1 client B2B signé | +++++ | → 9/10 |
| Témoignages + chiffres réels | +++ | → 9.2/10 |
| DPIA + SOPs + INPI | ++ | → 9.5/10 |
| Extension Chrome | ++ | → 9.7/10 |
| Partenariats prescripteurs | +++++ | → 10/10 |

---

## 13. RÈGLES DE TRAVAIL

### Workflow Cursor
1. Un prompt à la fois — audit step obligatoire
2. Build vert entre chaque prompt
3. Reporter résultats à Claude avant le suivant
4. Push + déploiement après validation
5. **Knowledge base mis à jour après chaque session**

### Ne jamais faire
- PrismaClient ad hoc (→ `@/app/lib/db`)
- userId du body/query (→ `session.user.id`)
- wallet.address comme destinataire ancrage
- POLYGON_PRIVATE_KEY dans les logs
- apiKeyHash dans les réponses API
- "KYC" visible utilisateur (→ "vérification d'identité")
- Silver/bronze/gold comme niveaux de certification

---

## 14. ACCÈS & CONTACTS

| Ressource | URL / Info |
|-----------|-----------|
| Production | https://blocktrust.tech |
| How-to | https://blocktrust.tech/how-to |
| Admin | https://blocktrust.tech/admin/dashboard |
| GitHub | github.com/brnbtech770/blocktrust |
| Vercel | vercel.com → blocktrust-mvp |
| Neon DB | neon.tech |
| Stripe | dashboard.stripe.com |
| Resend | resend.com |
| Alchemy | dashboard.alchemy.com |
| Upstash | console.upstash.com |
| Sentry | sentry.io → brnb-tech/javascript-nextjs |
| PolygonScan | polygonscan.com |
| MetaMask | Compte "BlockTrust Anchor" dédié |
| INSEE API | portail-api.insee.fr |
| Vercel Blob | vercel.com → Storage → blocktrust-blob |
| INPI | depot.inpi.fr (dépôt à faire) |
| Support | support@blocktrust.tech |
| Sécurité | security@blocktrust.tech |
| Commercial | commercial@blocktrust.tech |

---

*Mis à jour le 28 avril 2026 — Session Claude*
*Milestones : Technique 100% + Ancrage Polygon réel + Refonte positionnement landing*
*Règle absolue : ce fichier est mis à jour après chaque session*
*→ Uploader dans Project Knowledge Claude + commit GitHub*
