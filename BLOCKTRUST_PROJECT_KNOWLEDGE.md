# BlockTrust — Document de Référence Projet

**Version:** 8.1 final  
**Date:** 6 mai 2026  
**Auteur:** Olivier Bernabé (BRNB TECH SAS)  
**Statut:** Production live — Technique 100% — Sécurité 95% — Score 9.5/10

---

## 1. VISION & POSITIONNEMENT

### Headlines validées
> "L'identité numérique qui protège vos échanges." ✅ (H1)
> "La preuve que c'est vous. La certitude que c'est eux." ✅ (sous-titre cyan/gold)

### Positionnement — La 4ème couche
| Solution | Ce qu'elle fait | Ce qu'elle NE fait PAS |
|----------|----------------|----------------------|
| Antivirus | Protège la machine | Ne prouve pas qui vous êtes |
| France Identité | Prouve votre identité à l'État | Ne prouve pas aux autres |
| Équipe IT interne | Sécurise le SI entreprise | Ne certifie pas l'identité externe |
| **BLOCKTRUST** | **Certifie votre identité + protège les menaces entrantes** | Complémentaire |

### Équipe (BRNB TECH SAS — transformation en cours)
| Nom | Rôle | Capital |
|-----|------|---------|
| Olivier Bernabé | CEO / Fondateur | 50% (via BERNABÉ HOLDING SASU) |
| Shaï Bernabé | Data / IA | 20% (nom propre) |
| Déborah Bernabé épouse Slama | Marketing | 15% (nom propre) |
| Laurianne Winter | DAF & Chef de projet | 15% (nom propre) |

---

## 2. PROPRIÉTÉ INTELLECTUELLE

- **Marque BLOCKTRUST** — n°5253718 — 30/04/2026 — INPI France
- **Déposant :** Olivier Bernabé (nom propre)
- **Classes :** 35, 38, 42, 45 | **Symbole :** BLOCKTRUST™
- **EUIPO Europe :** à déposer avant octobre 2026 (6 mois max)
- **Contrat de licence** Olivier → BRNB TECH SAS à rédiger

---

## 3. STACK TECHNIQUE

```
Framework    : Next.js 16.2.4 (App Router + Webpack)
Language     : TypeScript (strict)
Style        : TailwindCSS
Auth         : NextAuth v5
ORM          : Prisma 6.19.3 + prisma.config.ts
DB           : PostgreSQL via Neon (plan Free)
Paiements    : Stripe (subscriptions + Stripe Identity)
Emails       : Resend (domaine vérifié SPF/DKIM/DMARC)
Storage      : Vercel Blob (blocktrust-blob, IAD1, Private)
JWT          : jose (ES256 / RS256)
Blockchain   : Polygon Mainnet (Chain ID 137) via Alchemy
Rate Limit   : Upstash Redis (distribué) + in-memory fallback
Surveillance : QStash (5 min) + événementiel temps réel
Monitoring   : Sentry (@sentry/nextjs — production uniquement)
Proxy        : proxy.ts (Next.js 16)
WAF          : Cloudflare (Free — Bot Fight + SSL Full Strict)
IA Veille    : Claude Haiku 4.5 (Anthropic API)
CI/CD        : GitHub Actions (npm audit + Dependabot)
Déploiement  : Vercel (plan Hobby)
Repo         : github.com/brnbtech770/blocktrust
```

---

## 4. OUTILS & SERVICES — ÉTAT ET UPGRADES

### Développement
| Outil | Plan actuel | Upgrade quand | Coût upgrade |
|-------|------------|---------------|--------------|
| **Cursor** | Pro | - | - |
| **GitHub** | Free | Si équipe > 3 | 4$/user/mois |
| **Vercel** | Hobby | Dès premiers clients | 20$/mois |

### Base de données & Storage
| Outil | Plan actuel | Upgrade quand | Coût upgrade |
|-------|------------|---------------|--------------|
| **Neon PostgreSQL** | Free | Dès premiers revenus | ~10-20$/mois (Launch) |
| **Vercel Blob** | Free | Si > 500MB | Pay as you go |

> ⚠️ **Neon IP Allowlist** — nécessite plan Launch. À activer dès premiers revenus.

### Paiement & Identité
| Outil | Plan actuel | Notes |
|-------|------------|-------|
| **Stripe** | Pay as you go | 1,4% + 0,25€/transaction |
| **Stripe Identity** | Pay as you go | 1,50€/vérification |
| **INSEE API Sirene** | Free | Pas de limite connue |

### Auth & Sécurité
| Outil | Plan actuel | Upgrade quand | Coût upgrade |
|-------|------------|---------------|--------------|
| **Upstash Redis** | Free (10k req/jour) | Dès > 1000 users | ~10$/mois |
| **Upstash QStash** | Free (500 msg/jour) | Dès volume > 500/jour | ~10$/mois |
| **Sentry** | Free (5k errors/mois) | Dès production critique | 26$/mois |
| **Cloudflare** | Free | Dès premiers clients B2B | 20$/mois (Pro) |

> ⚠️ **Cloudflare Pro** — WAF avancé avec rate limiting. Priorité avant grands comptes.

### Blockchain
| Outil | Plan actuel | Notes |
|-------|------------|-------|
| **Alchemy** | Free (300M compute units/mois) | Suffisant pour l'instant |
| **Polygon** | Mainnet | ~122 POL dans le wallet |

> ⚠️ **Wallet** — garder minimum 10-15 POL, recharger manuellement.

### Emails
| Outil | Plan actuel | Upgrade quand | Coût upgrade |
|-------|------------|---------------|--------------|
| **Resend** | Free (100 emails/jour) | Dès > 100 emails/jour | 20$/mois |

> ⚠️ **Resend** — 100 emails/jour max sur Free. À upgrader dès les premiers abonnés actifs.

### IA Veille
| Outil | Plan actuel | Coût actuel |
|-------|------------|-------------|
| **Anthropic API** | Pay as you go | ~1€/mois (Claude Haiku 4.5) |

### Conformité & Juridique
| Outil | Statut | Notes |
|-------|--------|-------|
| **INPI** | ✅ Déposé n°5253718 | Renouvellement tous les 10 ans |
| **EUIPO** | 🔴 À faire avant oct. 2026 | 1 200€ pour 4 classes |
| **Qonto** | 🔴 À ouvrir | 2 comptes (Holding + SAS) |

---

## 5. PRICING

### B2C
| Plan | Prix/mois | Profils | Contacts | Vérifs/mois |
|------|-----------|---------|----------|-------------|
| Essentiel | 4,99€ | 1 | 20 | 10 |
| Premium | 9,99€ | 1 | 100 | 50 |
| Famille | 14,99€ | 5 | 100 | 100 |
| Famille+ | 24,99€ | 10 | 300 | 300 |

### B2B (pricing dégressif par user — à implémenter)
| Plan | Prix/mois | Users | Vérifs/mois |
|------|-----------|-------|-------------|
| Starter | 29€ | 3 | 200 |
| Team | 79€ | 10 | 500 |
| Business | 199€ | 50 | Illimité |
| Enterprise | Sur devis | Illimité | Illimité |

**Toggle annuel : -20% engagement annuel**
**Mention obligatoire partout : "Sans engagement · Résiliable à tout moment"**

---

## 6. FONCTIONNALITÉS EN PRODUCTION

### Landing Page (ordre des sections)
1. Navbar (BLOCKTRUST™, Vérifier, Actualités)
2. Hero (H1 + sous-titre cyan/gold)
3. Problem (4 cards)
4. QuickUnderstand (3 cas concrets)
5. Categories (anti-objection antivirus)
6. ThreatAlert (menaces permanentes)
7. Solution (3 étapes)
8. Particuliers (4 cards)
9. Entreprises (5 cards Trust Circle B2B)
10. Integration (4 tabs)
11. PricingTeaser
12. FinalCTA
13. Footer (BLOCKTRUST™, CGU ✅, Privacy ✅)

### Page /verify — Architecture 3 niveaux
| Niveau | Accès | Données |
|--------|-------|---------|
| `/verify` public | Tout le monde | Verdict + nom + date |
| `/verify/[id]` | Abonné + quota | Trust Score + Polygon + Hash |
| `/admin/certificates/[id]` | Admin | Tout + logs |

**Trust Circle Cas 1/Cas 2 opérationnel ✅**

### Agent Surveillance
```
Option C (immédiat) : chaque scan QR → runEventualAnomalyCheck()
Option A (5 min)    : QStash auto-chaîné → runAnomalyDetection()
Cron quotidien      : 3h UTC → anomaly-detection + retry Polygon
```

### Veille Cyber IA
- Sources : CERT-FR, Cybermalveillance, ZATAZ
- Cron : 5h UTC quotidien
- Modèle : Claude Haiku 4.5
- Page : /menaces (publique)

---

## 7. SÉCURITÉ — ÉTAT COMPLET

### Skills implémentés ✅
| Phase | Skill | Statut |
|-------|-------|--------|
| 1 | OWASP IDOR (14 routes auditées) | ✅ |
| 1 | Mass Assignment whitelist (32 routes Zod) | ✅ |
| 1 | Input Validation Zod strict | ✅ |
| 1 | JWT/Crypto timingSafeEqual | ✅ |
| 1 | Rate Limiting avancé (magic link, KYC) | ✅ |
| 1 | Stripe webhook idempotence Redis | ✅ |
| 1 | Secrets Management Vercel Sensitive | ✅ |
| 1 | Next.js Security Headers CSP+HSTS | ✅ |
| 1 | Logs sanitisés (sans données sensibles) | ✅ |
| 1 | NextAuth open redirect prevention | ✅ |
| 2 | WAF Cloudflare (Bot Fight + SSL Strict) | ✅ |
| 2 | SPF/DKIM/DMARC sur blocktrust.tech | ✅ |
| 2 | Dependabot + npm audit CI | ✅ |
| 2 | QR Token entropy 256 bits | ✅ |
| 2 | Distributed Lock Redis quotas | ✅ |
| 2 | RGPD cascade delete + data minimization | ✅ |
| 2 | Stripe lazy init (build sans secrets) | ✅ |
| 2 | Rate limit magic link (3/h/IP) | ✅ 🚨 |

### Incidents traités
- **06/05/2026** — Spam magic link détecté (korper.nl, databreaches.net) → rate limit déployé en urgence → 3 comptes suspects supprimés

### Reste à faire — Sécurité
| Phase | Action | Priorité |
|-------|--------|----------|
| 2 | Cloudflare Pro (WAF rate limiting avancé) | 🔴 Avant grands comptes |
| 2 | Neon IP Allowlist | 🟡 Dès premiers revenus |
| 2 | AWS KMS pour JWT + Polygon keys | 🟡 Avant banques |
| 3 | Pentest externe (Synacktiv/Quarkslab) | 🔴 Avant grands comptes |
| 3 | SOPs incident response | 🔴 Laurianne |
| 3 | ISO 27001 | 🔵 Avant levée de fonds |
| 3 | Bug bounty (YesWeHack) | 🔵 Long terme |

---

## 8. VARIABLES VERCEL (toutes configurées)

| Variable | Statut | Scope |
|----------|--------|-------|
| BLOB_READ_WRITE_TOKEN | ✅ | All |
| INSEE_CONSUMER_KEY/SECRET | ✅ Sensitive | Prod+Preview |
| RESEND_API_KEY | ✅ Sensitive | All |
| STRIPE_SECRET_KEY | ✅ Sensitive | Prod+Preview |
| STRIPE_WEBHOOK_SECRET | ✅ Sensitive | All |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | ✅ | All |
| BLOCKTRUST_JWT_PRIVATE/PUBLIC_KEY | ✅ Sensitive | Prod+Preview |
| NEXTAUTH_SECRET | ✅ Sensitive | Prod+Preview |
| GOOGLE_CLIENT_ID/SECRET | ✅ | All |
| CRON_SECRET | ✅ | All |
| ADMIN_EMAILS | ✅ | All |
| DATABASE_URL | ✅ | All |
| POLYGON_RPC_URL | ✅ Sensitive | Prod+Preview |
| POLYGON_CHAIN_ID | ✅ 137 | All |
| POLYGON_PRIVATE_KEY | ✅ Sensitive | Prod+Preview |
| POLYGON_CONTRACT_ADDRESS | ✅ burn address | All |
| UPSTASH_REDIS_REST_URL/TOKEN | ✅ Sensitive | Prod+Preview |
| QSTASH_TOKEN | ✅ Sensitive | Prod+Preview |
| QSTASH_CURRENT/NEXT_SIGNING_KEY | ✅ Sensitive | Prod+Preview |
| NEXT_PUBLIC_SENTRY_DSN | ✅ | Prod+Preview |
| SENTRY_AUTH_TOKEN | ✅ Sensitive | Prod+Preview |
| ANTHROPIC_API_KEY | ✅ Sensitive | Prod+Preview |

---

## 9. AVANCEMENT GLOBAL — 6 MAI 2026

```
Technique        ████████████████████  100% ✅
Sécurité         ███████████████████░   95%
Produit/UX       █████████████████████   96%
Marketing        ████████████████░░░░   80%
Juridique        ████████████░░░░░░░░   62%
Commercial       ████░░░░░░░░░░░░░░░░   20%

GLOBAL           █████████████████░░░   86%
```

**Score qualitatif : 9.5/10**

---

## 10. CHANTIERS RESTANTS PAR STRATE

### 🔴 COMMERCIAL (priorité absolue)
- [ ] **1er client B2B signé**
- [ ] Appel Koray (FNC-RF = timing parfait)
- [ ] Revue Jérôme Benbihi (Adenis) — gratuit
- [ ] Plaquette B2B TPE/PME/ETI (Deborah)
- [ ] Réseaux sociaux → après SAS officielle

### 🔴 TECHNIQUE — Features restantes
- [ ] Feature wallet crypto (walletAddress + walletNetwork dans Entity/User)
- [ ] "Résiliable à tout moment" visible sur pricing/register/landing
- [ ] SEO meta description FR (contrer sites anglais "blocktrust" sur Google)
- [ ] Accordion /pricing détail par plan
- [ ] Pricing B2B dégressif par user (Stripe)
- [ ] Boutons admin AIAlert (Investiguer/Résoudre/Ignorer)
- [ ] SASU → SAS dans le code (après immatriculation)

### 🔴 JURIDIQUE (Laurianne)
- [ ] Création BERNABÉ HOLDING SASU + BRNB TECH SAS (juriste en charge)
- [ ] Ouverture Qonto (2 comptes)
- [ ] Contrat licence marque Olivier → SAS
- [ ] EUIPO Europe avant octobre 2026 (1 200€)
- [ ] DPIA + avocat
- [ ] CGU/CGV — encadrer "certifié" et "alerte immédiate"
- [ ] SOPs incident response + RGPD breach (72h CNIL)

### 🔴 SÉCURITÉ — Avant grands comptes
- [ ] Cloudflare Pro (20$/mois) — WAF rate limiting avancé
- [ ] Pentest externe 3 000-8 000€ (Synacktiv/Quarkslab)
- [ ] AWS KMS pour JWT + Polygon keys
- [ ] Neon IP Allowlist (plan Launch)

### 🟡 PRODUIT
- [ ] Témoignages + chiffres réels landing
- [ ] Démo vidéo 2 min (Deborah)
- [ ] Trust Circle Cas 1/2 enrichissement /verify

### 🔵 LONG TERME
- Extension Chrome TrustScan (3-4 mois)
- Plugin email Outlook/Gmail (4-6 mois)
- App mobile + NFC (6-12 mois)
- SSO / SAML + SCIM Enterprise
- ISO 27001 (avant levée de fonds)
- Bug bounty YesWeHack

---

## 11. SKILLS UPLOADÉS DANS PROJECT KNOWLEDGE

| Fichier | Contenu |
|---------|---------|
| BLOCKTRUST_Security_Skills_Phase1.md | OWASP, RGPD, JWT, Rate Limiting, Stripe, Secrets, Headers |
| BLOCKTRUST_Security_Skills_Phase2.md | WAF, DNS, Supply Chain, Blockchain, Redis Locks, Cloud |
| BLOCKTRUST_Security_Skills_Phase3_Vulnerabilities.md | Pentest, SOC, ISO 27001, vulnérabilités externes |
| .cursorrules (dans le repo) | Contexte complet BLOCKTRUST pour Cursor |

---

## 12. OBJECTIFS 10/10

Score actuel : **9.5/10**

| Action | Impact |
|--------|--------|
| 1 client B2B signé | +++++ |
| Témoignages réels | +++ |
| Pentest + Cloudflare Pro | ++ |
| Extension Chrome | ++ |
| Partenariats prescripteurs | +++++ |

---

## 13. RÈGLES ABSOLUES

- PrismaClient → `@/app/lib/db`
- userId → `session.user.id` uniquement
- Burn address pour ancrage Polygon
- POLYGON_PRIVATE_KEY jamais loggée
- "KYC" jamais visible utilisateur → "vérification d'identité"
- "entité" → "contact" côté utilisateur
- BLOCKTRUST™ = majuscules toujours
- Turbopack = DÉSACTIVÉ (--webpack)
- timingSafeEqual pour toute comparaison de secrets

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
| Upstash | console.upstash.com (Redis + QStash) |
| Sentry | sentry.io → brnb-tech/javascript-nextjs |
| Anthropic | console.anthropic.com |
| Resend | resend.com |
| PolygonScan | polygonscan.com |
| INPI | depot.inpi.fr (marque n°5253718) |
| Support | support@blocktrust.tech |
| Commercial | commercial@blocktrust.tech |
| Sécurité | security@blocktrust.tech |

---

*Mis à jour le 6 mai 2026 — Session Claude*
*Milestones : Sécurité Phase 1+2 complète + Cloudflare WAF + SPF/DKIM/DMARC + Incident magic link traité*
*Règle absolue : ce fichier est mis à jour après chaque session*
*→ Uploader dans Project Knowledge Claude + commit GitHub*
