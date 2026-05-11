# BLOCKTRUST — Document de Référence Projet
**Version:** 10.0 final  
**Date:** 11 mai 2026  
**Score:** 9.5/10 — Global 89%  
**RDV Koray :** Jeudi 15 mai 2026 — 11h30

---

## 1. VISION & POSITIONNEMENT

### Logique produit — Règle d'or
> "BLOCKTRUST prouve que tu es bien toi quand tu envoies quelque chose, et vérifie que l'autre est bien lui quand tu reçois quelque chose."

### Les 4 situations de vérification
| Situation | Condition | Résultat |
|-----------|-----------|---------|
| **A** | Badge reçu — inconnu non dans contacts | ℹ️ Identité vérifiée — inconnu certifié |
| **B** | Contact enregistré SANS badge — discordance domaine | ⚠️ Suspicion orange |
| **C** | Contact enregistré AVEC badge — match parfait | ✅ Confiance totale |
| **D** | Contact enregistré AVEC badge — mismatch | 🚨 FRAUDE CERTAINE |

### Limites documentées (CGU)
1. Boîte mail piratée → badge valide mais pas l'émetteur → révoquer immédiatement
2. Badge apposé sur mail non officiel → détectable si contact enregistré avec domaine certifié
3. Faux badge similaire → TrustScore bas, KYC tracé, responsabilité pénale
4. BLOCKTRUST ne lit pas les emails → protection manuelle / automatique avec extension Chrome
5. Lien certId exposé → permanent mais affiche toujours le vrai propriétaire

---

## 2. ÉQUIPE & SOCIÉTÉ

**BRNB TECH SAS** (transformation SASU en cours)

| Nom | Rôle | Capital |
|-----|------|---------|
| Olivier Bernabé | CEO / Fondateur | 50% (via BERNABÉ HOLDING SASU) |
| Shaï Bernabé | Data / IA | 20% |
| Déborah Bernabé épouse Slama | Marketing | 15% |
| Laurianne Winter | DAF & Chef de projet | 15% |

**Capital :** 1 000€ | **APE :** 6201Z | **Banque :** Qonto (à ouvrir)

**INPI :** BLOCKTRUST™ n°5253718 — 30/04/2026 | **EUIPO :** à déposer avant oct. 2026

---

## 3. STACK TECHNIQUE

```
Framework    : Next.js 16.2.4 (App Router + Webpack — Turbopack DÉSACTIVÉ)
Language     : TypeScript (strict)
Style        : TailwindCSS
Auth         : NextAuth v5 (beta — surveiller migration stable)
ORM          : Prisma 5 (v6.19.3) + prisma.config.ts
DB           : PostgreSQL via Neon (Free)
Paiements    : Stripe (subscriptions + Stripe Identity KYC)
Emails       : Resend (SPF/DKIM/DMARC ✅)
Storage      : Vercel Blob (Private, IAD1)
JWT          : jose (ES256/RS256) — jsonwebtoken à supprimer (mort)
Blockchain   : Polygon Mainnet (Chain ID 137) via Alchemy
Rate Limit   : Upstash Redis + in-memory fallback (fail-soft)
Surveillance : QStash (5 min) + événementiel temps réel
Monitoring   : Sentry (production uniquement)
Proxy        : proxy.ts (Next.js 16 Edge)
WAF          : Cloudflare (Free — Bot Fight + SSL Full Strict)
IA Veille    : Claude Haiku 4.5 (Anthropic API)
CI/CD        : GitHub Actions (npm audit + Dependabot hebdo)
Déploiement  : Vercel (Hobby)
Repo         : github.com/brnbtech770/blocktrust
```

---

## 4. OUTILS & SERVICES

### Développement
| Outil | Plan | Upgrade quand | Coût |
|-------|------|---------------|------|
| Cursor | Pro | - | - |
| GitHub | Free | Équipe > 3 | 4$/user/mois |
| Vercel | Hobby | Dès premiers clients | 20$/mois |

### Base de données & Storage
| Outil | Plan | Upgrade quand | Coût |
|-------|------|---------------|------|
| Neon PostgreSQL | Free | Dès premiers revenus (IP Allowlist) | ~15$/mois |
| Vercel Blob | Free | Si > 500MB | Pay as you go |

### Paiement & Identité
| Outil | Notes |
|-------|-------|
| Stripe | 1,4% + 0,25€/transaction |
| Stripe Identity | 1,50€/vérification KYC |
| Stripe Tax | À activer dans Dashboard Stripe (automatic_tax activé dans le code ✅) |
| INSEE API Sirene | Vérification SIRET B2B |

### Sécurité & Monitoring
| Outil | Plan | Upgrade quand | Coût |
|-------|------|---------------|------|
| Upstash Redis | Free (10k req/jour) | Dès > 1000 users | ~10$/mois |
| Upstash QStash | Free (500 msg/jour) | Dès > 500/jour | ~10$/mois |
| Sentry | Free (5k errors/mois) | Production critique | 26$/mois |
| Cloudflare | Free | Avant grands comptes | 20$/mois (Pro) |

### Blockchain & Emails
| Outil | Plan | Notes |
|-------|------|-------|
| Alchemy | Free (300M CU/mois) | Suffisant |
| Polygon Mainnet | - | ~122 POL — recharger si < 10 POL |
| Resend | Free (100/jour) | Upgrade dès > 100 emails/jour |
| Anthropic API | Pay as you go | ~1€/mois (Haiku 4.5) |

### Budget mensuel estimé au lancement
```
Vercel Pro      20$
Cloudflare Pro  20$
Resend Pro      20$
Neon Launch     ~15$
Upstash         ~20$
Sentry Team     26$
─────────────────
Total           ~121$/mois
```

---

## 5. PRICING FINAL VALIDÉ

### B2C (TTC) — Vérifications illimitées 6 mois*
| Plan | Prix/mois | Profils | Contacts |
|------|-----------|---------|----------|
| Essentiel | 3,99€ | 1 | 20 |
| Premium | 9,99€ | 1 | 100 |
| Famille | 14,99€ | 5 | 100 |
| Famille+ | 24,99€ | 10 | 300 |

### B2B (HT + TVA 20%) — Vérifications illimitées 6 mois*
| Plan | Prix/user/mois HT | Users | Contacts/user |
|------|------------------|-------|---------------|
| Solo Pro | 9,99€ | 1 | 100 |
| Starter | 8,99€ | 2-5 | 100/user |
| Team | 7,99€ | 6-15 | 200/user |
| Business | 5,99€ | 16-50 | 500/user |
| Enterprise | Sur devis | 51+ | Illimité |

Toggle annuel : -20% | Mention : "Sans engagement · Résiliable à tout moment"

*Vérifications illimitées pendant la période de lancement (6 mois).

### Price IDs Stripe à créer (🔴 DEMAIN)
```
STRIPE_PRICE_SOLO_PRO_MONTHLY     9,99€/mois
STRIPE_PRICE_SOLO_PRO_YEARLY      95,90€/an
STRIPE_PRICE_STARTER_MONTHLY      8,99€/mois
STRIPE_PRICE_STARTER_YEARLY       86,30€/an
STRIPE_PRICE_TEAM_MONTHLY         7,99€/mois
STRIPE_PRICE_TEAM_YEARLY          76,70€/an
STRIPE_PRICE_BUSINESS_MONTHLY     5,99€/mois
STRIPE_PRICE_BUSINESS_YEARLY      57,50€/an
```

---

## 6. FONCTIONNALITÉS EN PRODUCTION

### Features produit livrées (sessions avril-mai 2026)
- ✅ Wallet crypto (walletAddress + walletNetwork dans Entity)
- ✅ Domaines certifiés (certifiedDomains)
- ✅ Emails certifiés (certifiedEmails)
- ✅ Téléphones certifiés (certifiedPhones)
- ✅ TagInput composant réutilisable
- ✅ Alerte site miroir /verify/[id]
- ✅ Lien sécurisé rotatif 24h (Redis vt:)
- ✅ QR codes → /verify?certId= public
- ✅ /verify/qr/* route publique (proxy)
- ✅ Bouton "Copier lien" dashboard (pas "Vérifier")
- ✅ Alerte fraude bannière dashboard client
- ✅ Email FRAUD_ALERT au propriétaire
- ✅ FRAUD_ALERT complet (email + admin + TrustScore)
- ✅ Articles épinglés /menaces (Kratos + FNC-RF + Clonage vocal)
- ✅ Onboarding étape 3 + téléphone certifié
- ✅ FAQ /how-to prospect/fournisseur inconnu
- ✅ /verify extraction URL complète collée
- ✅ /verify timeout 8s + token vide fix
- ✅ buildPublicVerifyUrl lib centralisée
- ✅ verifyUrl → /verify?certId= public sur tous les emails
- ✅ Solo Pro dans validPriceIds checkout
- ✅ Stripe Tax (automatic_tax) dans checkout

### Sécurité Phase 1 + 2 ✅ COMPLÈTES
- ✅ /api/debug-auth supprimé
- ✅ Mass Assignment whitelist 32 routes Zod
- ✅ Input validation Zod strict
- ✅ JWT timingSafeEqual partout
- ✅ Rate limit magic link 3/h (incident spam 06/05)
- ✅ Stripe webhook idempotence Redis
- ✅ Distributed lock quotas certificats
- ✅ Security Headers CSP + HSTS
- ✅ NextAuth open redirect prevention
- ✅ SPF/DKIM/DMARC OVH + Resend
- ✅ Cloudflare WAF + Bot Fight + SSL Full Strict
- ✅ Dependabot + npm audit CI
- ✅ RGPD cascade delete + data minimization
- ✅ Stripe lazy init (build sans secrets)
- ✅ CORS extension Chrome dynamique

### Extension Chrome TrustScan
```
Dossier : extension/ (racine projet)
Manifest V3 | Content script Gmail | Popup | Service Worker

API endpoints :
  GET /api/extension/verify-sender
  POST /api/extension/add-contact
  GET /api/extension/me
  GET /api/extension/api-key

Clé API : bt_ext_ + 64 hex (hashée en DB)
CORS : chrome-extension://* dynamique ✅
Sélecteurs Gmail 2026 : .gD[email], [email].go, .yP[email], .zF[email]

À faire :
  - Installer Chrome Mac + tester sur Gmail
  - Icônes PNG réelles (16/48/128px)
  - Compte Chrome Web Store (5$)
  - Publication (review 1-3 semaines)
```

---

## 7. RAPPORT AUDIT CURSOR — 11 MAI 2026

### P1 — Résolus ce soir ✅
- Solo Pro exclu de validPriceIds → corrigé ✅
- FRAUD_ALERT sans email/admin sur route publique → corrigé ✅
- Stripe Tax absent du code checkout → corrigé ✅

### P2 — À corriger cette semaine
```
1. CI complète : ajouter dans .github/workflows/ci.yml :
   - npm run lint
   - npm run build
   - npx prisma validate
   → Bloque les régressions avant merge

2. Supprimer jsonwebtoken (dépendance morte) :
   npm uninstall jsonwebtoken @types/jsonwebtoken
   → jose déjà en place

3. PasswordResetEmail : créer template React Email dédié
   → reset password utilise HTML inline sans charte BLOCKTRUST™

4. TrustScore non rafraîchi sur certains chemins FRAUD_ALERT :
   → Cas 2 Trust Circle (/verify/[id])
   → v2/verify (TAMPERED)
   → verify/qr/[token]
   Ajouter persistUserTrustScore() sur ces chemins

5. Emojis restants sur /verify/[id]/page.tsx :
   → ⚠️ 🔒 → AlertTriangle, Lock (lucide-react)

6. Rate limit bt:auth / bt:kyc documentés dans .cursorrules
   mais non implémentés dans le code → clarifier

7. Stripe Tax : activé dans le code ✅
   Mais nécessite activation manuelle dans Stripe Dashboard

8. NextAuth v5 beta → surveiller release stable
```

### P3 — Performance (après Koray)
```
- Index Prisma : Certificate.userId, 
  Verification.certificateId, Entity.userId
- Monitoring requêtes lentes Neon
- Bundle analyzer (@next/bundle-analyzer)
- Lazy load recharts dashboard
- Couche services/use-cases (testabilité)
- Tests ciblés /verify + webhooks Stripe (Playwright/Jest)
```

---

## 8. AVANCEMENT — 11 MAI 2026

```
Technique        ████████████████████  100% ✅
Sécurité         ███████████████████░   95%
Produit/UX       ████████████████████   98%
Extension Chrome ████████░░░░░░░░░░░   40%
Marketing        ████████████████░░░░   80%
Juridique        ████████████░░░░░░░░   62%
Commercial       ████░░░░░░░░░░░░░░░░   20%

GLOBAL           █████████████████░░░   89%
Score            9.5/10
```

---

## 9. CHANTIERS RESTANTS

### 🔴 DEMAIN MATIN — Bloquant
| Tâche | Qui |
|-------|-----|
| Créer Price IDs Stripe Solo Pro + B2B | Olivier |
| Activer Stripe Tax dans Dashboard Stripe | Olivier |
| Ajouter variables Vercel STRIPE_PRICE_* | Olivier |
| Installer Chrome Mac + tester extension Gmail | Olivier |

### 🔴 TECHNIQUE — Avant jeudi Koray
| Tâche | Effort |
|-------|--------|
| Admin AIAlert boutons fonctionnels | 1h |
| CI complète (lint + build + prisma validate) | 2h |
| Supprimer jsonwebtoken mort | 30min |
| User certifie email/domaine/tel depuis ses paramètres | 2h |
| Badge SVG dashboard — refonte visuelle Lovable | 2h |
| TrustScore sur tous les chemins FRAUD_ALERT | 1h |
| Emojis /verify/[id] → Lucide | 30min |

### 🔴 COMMERCIAL — Priorité absolue
| Tâche | Qui |
|-------|-----|
| 1er client B2B signé | Olivier |
| RDV Koray jeudi 15 mai 11h30 | Olivier |
| Préparer pitch Koray (mercredi) | Olivier + Claude |
| RDV Adenis en attente | Olivier |
| Plaquette B2B 1 page | Deborah |

### 🔴 JURIDIQUE (Laurianne)
| Tâche | Priorité |
|-------|----------|
| CGU corrections (tribunal, médiateur, rétractation) | 🔴 Critique |
| DPIA avec avocat | 🔴 |
| SOPs incident response + RGPD breach 72h CNIL | 🔴 |
| EUIPO avant octobre 2026 (1 200€) | 🟡 |
| Création HOLDING + SAS + Qonto | 🔴 |
| Contrat licence marque Olivier → SAS | 🔴 |

### 🟡 APRÈS KORAY
| Tâche | Effort |
|-------|--------|
| BlockTrust Vault (feature B2B — voir §10) | 7 jours |
| Tests ciblés /verify + webhooks Stripe | 3 jours |
| Performance DB (index Prisma + Neon) | 1 jour |
| PasswordResetEmail template React Email | 1h |
| Icônes réelles extension Chrome (PNG) | 30min |
| Publication Chrome Web Store (5$) | 1h |
| SASU → SAS dans le code | 30min |
| Témoignages + chiffres réels landing | Deborah |

### 🔵 LONG TERME
- App mobile + NFC (6-12 mois)
- SSO/SAML + SCIM Enterprise
- ISO 27001 (avant levée de fonds)
- Cloudflare Pro (avant banques)
- Pentest externe 3-8k€
- AWS KMS JWT + Polygon
- Bug bounty YesWeHack
- Plugin email Outlook (4-6 mois)

---

## 10. BLOCKTRUST VAULT — Feature B2B (Laurianne)

```
Concept : coffre de confiance partagé entreprise

Types de contacts :
A. Contacts personnels → visibles par l'utilisateur uniquement
B. Trust Vault partagé → géré par l'admin, partagé avec l'équipe

Rôles :
  Admin   : ajoute / modifie / supprime / partage
  Manager : ajoute / modifie selon permissions
  Member  : consulte uniquement

Contenu du Vault :
  - Contacts certifiés (avec ou sans badge BLOCKTRUST)
  - Domaines officiels
  - Emails officiels
  - Téléphones officiels
  - URLs reconnues fiables
  - Wallets crypto certifiés

Import : CSV / Excel (template fourni)
  → Champs : nom, type, valeur, description

Partage : toute l'entreprise / équipe / utilisateurs spécifiques

Quotas :
  Starter  : 1 vault, 200 entrées
  Team     : 3 vaults, 500 entrées
  Business : illimité
  Enterprise : illimité + API import

Intégration /verify :
  → Vérifie d'abord dans le Vault partagé
  → "✅ Dans le Vault de votre organisation"
  → "🚨 FRAUDE — badge ne correspond pas au Vault"

Effort : ~7 jours développement
```

---

## 11. VARIABLES VERCEL (état)

| Variable | Statut |
|----------|--------|
| BLOB_READ_WRITE_TOKEN | ✅ |
| INSEE_CONSUMER_KEY/SECRET | ✅ Sensitive |
| RESEND_API_KEY | ✅ Sensitive |
| STRIPE_SECRET_KEY | ✅ Sensitive |
| STRIPE_WEBHOOK_SECRET | ✅ Sensitive |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | ✅ |
| BLOCKTRUST_JWT_PRIVATE/PUBLIC_KEY | ✅ Sensitive |
| NEXTAUTH_SECRET | ✅ Sensitive |
| GOOGLE_CLIENT_ID/SECRET | ✅ |
| DATABASE_URL | ✅ |
| POLYGON_RPC_URL / CHAIN_ID / PRIVATE_KEY | ✅ Sensitive |
| POLYGON_CONTRACT_ADDRESS | ✅ burn address |
| UPSTASH_REDIS_REST_URL/TOKEN | ✅ Sensitive |
| QSTASH_TOKEN / SIGNING_KEYS | ✅ Sensitive |
| NEXT_PUBLIC_SENTRY_DSN | ✅ |
| SENTRY_AUTH_TOKEN | ✅ Sensitive |
| ANTHROPIC_API_KEY | ✅ Sensitive |
| STRIPE_PRICE_SOLO_PRO_MONTHLY/YEARLY | 🔴 À ajouter demain |
| STRIPE_PRICE_STARTER_MONTHLY/YEARLY | 🔴 À ajouter demain |
| STRIPE_PRICE_TEAM_MONTHLY/YEARLY | 🔴 À ajouter demain |
| STRIPE_PRICE_BUSINESS_MONTHLY/YEARLY | 🔴 À ajouter demain |

---

## 12. RÈGLES ABSOLUES

```
PrismaClient     → import { prisma } from '@/app/lib/db'
Auth             → import { auth } from '@/app/lib/auth-server'
userId           → session.user.id (jamais body/query)
AccountType      → PERSONAL / BUSINESS (pas INDIVIDUAL)
Burn address     → 0x000000000000000000000000000000000000dEaD
POLYGON_KEY      → jamais loggée ni exposée
"KYC"            → jamais visible utilisateur
"entité"         → "contact" côté utilisateur
BLOCKTRUST™      → majuscules + trademark toujours
Turbopack        → DÉSACTIVÉ (--webpack)
timingSafeEqual  → toute comparaison de secrets
Icônes           → lucide-react uniquement (jamais emojis UI)
Emails verifyUrl → /verify?certId= (public, jamais /verify/[id])
Badge dashboard  → uniquement app/api/badge/[id]/route.ts (SVG serveur)
                   JAMAIS toucher BlockTrustBadge.tsx ni le logo landing
jsonwebtoken     → À supprimer (mort — jose déjà en place)
```

---

## 13. SKILLS PROJECT KNOWLEDGE

| Fichier | Contenu |
|---------|---------|
| BLOCKTRUST_Security_Skills_Phase1.md | OWASP, RGPD, JWT, Rate Limiting |
| BLOCKTRUST_Security_Skills_Phase2.md | WAF, DNS, Blockchain, Cloud |
| BLOCKTRUST_Security_Skills_Phase3_Vulnerabilities.md | Pentest, SOC, ISO 27001 |
| BLOCKTRUST_UI_UX_Audit_Skill.md | Checklist UI/UX complète |
| BLOCKTRUST_Stripe_Skill.md | Lazy init, Price IDs, Tax, Webhooks |
| BLOCKTRUST_Chrome_Extension_Skill.md | MV3, Gmail, Storage, CORS, Publication |
| BLOCKTRUST_React_Email_Skill.md | Templates, verifyUrl public, styles |
| BLOCKTRUST_Design_System_Skill.md | Couleurs, typo, cards, badge SVG |
| BLOCKTRUST_Process_Audit_Skill.md | Audit flux complet 10 sections |
| .cursorrules | Contexte complet Cursor (538 lignes) |

---

## 14. ACCÈS

| Ressource | Info |
|-----------|------|
| Production | https://blocktrust.tech |
| Admin | https://blocktrust.tech/admin/dashboard |
| Menaces | https://blocktrust.tech/menaces |
| GitHub | github.com/brnbtech770/blocktrust |
| Vercel | vercel.com → blocktrust-mvp |
| Cloudflare | dash.cloudflare.com → blocktrust.tech |
| Neon | console.neon.tech |
| Alchemy | dashboard.alchemy.com |
| Upstash | console.upstash.com |
| Sentry | sentry.io → brnb-tech |
| Anthropic | console.anthropic.com |
| Resend | resend.com |
| Stripe | dashboard.stripe.com |
| Chrome Web Store | chrome.google.com/webstore/devconsole |
| INPI | depot.inpi.fr (n°5253718) |
| Support | support@blocktrust.tech |
| Commercial | commercial@blocktrust.tech |
| Sécurité | security@blocktrust.tech |

---

*Mis à jour le 11 mai 2026 — Session Claude*  
*RDV Koray jeudi 15 mai 11h30 — Préparer pitch mercredi*  
*Règle absolue : uploader dans Project Knowledge + commit GitHub docs/ après chaque session*
