# BlockTrust — Document de Référence Projet

**Version:** 8.0 final  
**Date:** 4 mai 2026  
**Auteur:** Olivier Bernabé (BRNB TECH SAS)  
**Statut:** Production live — 100% technique — Score 9/10  

---

## 1. VISION & POSITIONNEMENT

### Headlines validées (Deborah + Laurianne)
> "L'identité numérique qui protège vos échanges." ✅ (H1)
> "La preuve que c'est vous. La certitude que c'est eux." ✅ (sous-titre cyan/gold)

### Double dimension — Règle absolue
- **Émission :** prouver que c'est bien VOUS qui envoyez
- **Réception :** détecter que l'autre est bien qui il prétend être

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

**Structure juridique :**
- BERNABÉ HOLDING SASU (100€) + BRNB TECH SAS (1 000€) — simultanément
- Juriste en charge | Banque : Qonto | APE : 6201Z

---

## 2. PROPRIÉTÉ INTELLECTUELLE

- **Marque BLOCKTRUST** — n°5253718 — 30/04/2026 — INPI France
- **Déposant :** Olivier Bernabé (nom propre)
- **Classes :** 35, 38, 42, 45
- **Symbole :** BLOCKTRUST™ (navbar + footer)
- **EUIPO Europe :** à déposer dans 6 mois max
- **Contrat de licence** Olivier → BRNB TECH SAS à rédiger

---

## 3. STACK TECHNIQUE

```
Framework    : Next.js 16.2.4 (App Router) — package.json ^16.2.4
Language     : TypeScript (strict)
Style        : TailwindCSS 4
Auth         : NextAuth v5 (beta)
ORM          : Prisma 6 (6.19.3) — schema prisma/ + prisma.config.ts
DB           : PostgreSQL via Neon
Paiements    : Stripe (subscriptions + Stripe Identity)
Emails       : Resend (domaine blocktrust.tech vérifié)
Storage      : Vercel Blob (blocktrust-blob, IAD1, Private)
JWT          : jose + clés PEM (algo selon déploiement : RS256 / ES256 selon paire)
Blockchain   : Polygon Mainnet (Chain ID 137) via Alchemy
Rate Limiting: Upstash Redis (distribué) + in-memory fallback
Surveillance : @upstash/qstash — analyse globale auto-chaînée ~5 min + détection événementielle après chaque vérif (/api/verify)
Monitoring   : Sentry (@sentry/nextjs — production uniquement)
Proxy        : proxy.ts (Next.js 16)
IA Veille    : Claude Haiku 4.5 (Anthropic API) — ingest menaces RSS
Déploiement  : Vercel (plan Hobby)
Repo         : github.com/brnbtech770/blocktrust
```

### Charte graphique
```
#0a1628 navy | #00d4ff cyan | #BDA76B gold | #E05252 rouge
BLOCKTRUST™ = toujours majuscules — marque visuelle badge SVG (BlockTrustBadge) en UI
KYC = jargon interne uniquement
"contact/contacts" = remplace "entité/entités" côté utilisateur
```

---

## 4. PRICING

### B2C
| Plan | Prix/mois | Profils | Contacts | Vérifs/mois |
|------|-----------|---------|----------|-------------|
| Essentiel | 4,99€ | 1 | 20 | 10 |
| Premium | 9,99€ | 1 | 100 | 50 |
| Famille | 14,99€ | 5 | 100 | 100 |
| Famille+ | 24,99€ | 10 | 300 | 300 |

### B2B (pricing dégressif par user — à implémenter Stripe)
| Plan | Prix/mois | Users | Vérifs/mois | White Label |
|------|-----------|-------|-------------|-------------|
| Starter | 29€ | 3 | 200 | ✅ |
| Team | 79€ | 10 | 500 | ✅ |
| Business | 199€ | 50 | Illimité | ✅ |
| Enterprise | Sur devis | Illimité | Illimité | ✅ |

**Pricing dégressif validé Deborah/Laurianne :**
- 1-3 users : 9,99€/user | 4-10 : 7,99€/user | 11-50 : 5,99€/user

---

## 5. FONCTIONNALITÉS EN PRODUCTION

### Landing Page (ordre des sections)
1. Navbar (BLOCKTRUST™, Comment ça marche, Vérifier, Tarifs, Actualités → `/menaces`, FAQ, Connexion, CTA)
2. Hero (H1 identité protégée + sous-titre cyan/gold + stats)
3. Problem (4 cards dont "Un faux vous circule déjà")
4. QuickUnderstand (3 cas concrets : RIB / Email frauduleux / Fournisseur)
5. Categories (anti-objection antivirus)
6. **ThreatAlert** (menaces permanentes + stats ×2/20+/90%)
7. Solution (3 étapes + alerte usurpation)
8. Particuliers (4 cards dont protection menaces entrantes)
9. Entreprises (5 cards dont Trust Circle B2B + FOVI)
10. Integration (4 tabs)
11. PricingTeaser
12. FinalCTA
13. Footer (BLOCKTRUST™, CGU ✅, Privacy ✅)

### Onboarding (4 interventions)
- QuickUnderstand : 3 cas concrets icônes Lucide
- /pricing : badge inclus sans frais cachés
- /auth/register : 3 étapes avant formulaire
- Dashboard : guide PAR OÙ COMMENCER (si 0 certificat)

### Page /verify — Architecture 3 niveaux
| Niveau | Page | Accès | Données |
|--------|------|-------|---------|
| Public | `/verify` | Tout le monde | Verdict + nom + date |
| Abonné | `/verify/[id]` | Compte + abonnement | Trust Score + Polygon + Hash |
| Admin | `/admin/certificates/[id]` | Admin | Tout + logs + actions |

**Verdicts /verify :**
- ✅ Vert → VALIDE
- 🟡 Orange → EXPIRÉ  
- 🔴 Rouge → RÉVOQUÉ / INVALIDE
- 🚨 Rouge vif animé → FALSIFIÉ

**Trust Circle Cas 1/Cas 2 :**
- Cas 1 (partenaire sans badge) → bannière orange ⚠️
- Cas 2 (partenaire avec badge mais mismatch) → 🚨 FRAUDE CERTAINE
- Partenaire certifié confirmé → pastille verte ✅

### Agent de Surveillance — Architecture réelle
```
Option C (immédiat) : chaque vérif persistée (/api/verify/[id])
  → after(runEventualAnomalyCheck) — non bloquant
  → AdminAlert temps réel (volume / IPs / agrégation fraude — dédup ~45 min)

Option A (~5 min) : POST /api/cron/qstash-surveillance — signature Upstash (Receiver)
  → runAnomalyDetection() + retry Polygon optionnel
  → scheduleNextSurveillanceRun() (delay 300 s)

Cron quotidien Vercel 03h00 UTC (/api/cron/anomaly-detection, Bearer CRON_SECRET)
  → même analyse globale + retry Polygon — amorce Option A si QSTASH_TOKEN défini (fire-and-forget)
```

**Règles de détection (vue synthétique) :**

| Vue | Exemples de seuils / règles |
|-----|-------------------------------|
| Temps réel (par cert., 1h) | Volume scan >20 \| IPs distinctes >10 \| cumul `FRAUD_ALERT` ; dédoublonnage ~45 min |
| Globale (cron / QStash) | Volume/cert >50 en 1h \| taux global `FRAUD_ALERT` >10 % /24h \| certificat `REVOKED` encore vu |

### Veille Cyber — Agent IA
- **Sources :** CERT-FR, Cybermalveillance.gouv.fr, ZATAZ
- **Fréquence :** cron quotidien 5h UTC (`/api/cron/threat-articles`)
- **IA :** Claude Haiku 4.5 (Anthropic API) — résumés FR (`ANTHROPIC_MODEL` surchargeable)
- **Table :** ThreatArticle (Prisma)
- **Page :** /menaces (publique, SSR)
- **Navbar :** lien "Actualités" → /menaces
- **Coût :** ~1€/mois (ordre de grandeur selon volumes)

### Blockchain Polygon Mainnet RÉEL ✅
- Burn address `0x000000000000000000000000000000000000dEaD`
- Wallet `BlockTrust Anchor` (~122 POL)
- Ancrage auto + retry + email confirmation PolygonScan

### Emails (9 templates Resend — principaux métier transactionnel)
| Template | Déclencheur |
|----------|-------------|
| CertificateAnchoredEmail | Ancrage Polygon — lien PolygonScan |
| PaymentConfirmationEmail | Souscription Stripe |
| KYCApprovedEmail | Vérification d'identité approuvée |
| KYCRejectedEmail | Vérification rejetée |
| TrustCircleInviteEmail | Invitation Trust Circle |
| TrustCircleConfirmedEmail | Confirmation |
| ManualTrustRequestEmail | Demande manuelle |
| MagicLinkEmail | Connexion magic link |
| PasswordResetEmail | Réinitialisation |

*(Dossier `emails/` : templates additionnels hors cette liste courte.)*

---

## 6. SÉCURITÉ

### Architecture en couches
```
Couche 1 : Proxy Edge (proxy.ts)
Couche 2 : Upstash Redis rate limiting distribué
Couche 3 : NextAuth + JWT fail-closed
Couche 4 : Server Components auth() + redirect()
Couche 5 : Prisma ownership checks
Couche 6 : timingSafeEqual hash comparison
Couche 7 : Sentry monitoring production
Couche 8 : Agent surveillance événementiel + QStash + cron quotidien
```

### BLOCKTRUST vs Phishing-as-a-Service
| Vecteur d'attaque | Aujourd'hui | Extension Chrome (futur) |
|---|---|---|
| Email typosquatté | ⚠️ Partiel | ✅ Automatique |
| Faux document/RIB | ✅ Complet | ✅ |
| Faux site web | ✅ QR invalide | ✅ |
| Usurpation partenaire certifié | ✅ Cas 1/2 | ✅ |
| SMS phishing | ❌ | ❌ |
| Contournement 2FA (AiTM) | ❌ | ❌ |

---

## 7. VARIABLES VERCEL (toutes configurées)

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
| CRON_SECRET | ✅ |
| ADMIN_EMAILS | ✅ |
| DATABASE_URL | ✅ |
| POLYGON_RPC_URL | ✅ Alchemy |
| POLYGON_CHAIN_ID | ✅ 137 |
| POLYGON_PRIVATE_KEY | ✅ Sensitive |
| POLYGON_CONTRACT_ADDRESS | ✅ burn address |
| UPSTASH_REDIS_REST_URL/TOKEN | ✅ Sensitive |
| NEXT_PUBLIC_APP_URL | ✅ URL publique (QStash, webhooks, OpenGraph) |
| NEXT_PUBLIC_SENTRY_DSN | ✅ |
| SENTRY_AUTH_TOKEN | ✅ Sensitive |
| ANTHROPIC_API_KEY | ✅ Sensitive |
| QSTASH_TOKEN | ✅ Sensitive |
| QSTASH_CURRENT_SIGNING_KEY | ✅ Sensitive |
| QSTASH_NEXT_SIGNING_KEY | ✅ Sensitive |

---

## 8. SUPPORTS & OUTILS

| Outil | Usage |
|-------|-------|
| Cursor (Composer) | IDE principal |
| GitHub brnbtech770/blocktrust | Versioning |
| Vercel | Déploiement auto |
| Neon PostgreSQL | Base de données |
| Prisma 6 | ORM |
| Vercel Blob | Storage documents |
| Stripe + Stripe Identity | Paiements + KYC |
| INSEE API Sirene 3.11 | Vérification SIRET |
| NextAuth v5 | Auth multi-provider |
| Upstash Redis | Rate limiting |
| Upstash QStash | Surveillance périodique chainée (~5 min) |
| Sentry | Monitoring prod |
| Polygon + Alchemy | Blockchain |
| MetaMask | Wallet anchor |
| Resend + React Email | Emails transactionnels |
| Anthropic API (Claude Haiku 4.5) | Veille cyber IA |
| Lovable | Prototype référence |
| Google Drive | Docs équipe |
| INPI | Marque n°5253718 ✅ |
| Qonto | Banque (à ouvrir) |

---

## 9. CHANTIERS RESTANTS

### 🔴 Commercial (priorité absolue)
- [ ] 1er client B2B signé
- [ ] Appel Koray
- [ ] Revue Jérôme Benbihi (Adenis) — gratuit
- [ ] Plaquette B2B (Deborah)
- [ ] Réseaux sociaux → après SAS officielle

### 🔴 Juridique (Laurianne)
- [ ] Création BERNABÉ HOLDING SASU + BRNB TECH SAS
- [ ] Ouverture Qonto (2 comptes)
- [ ] Contrat licence marque Olivier → SAS
- [ ] EUIPO Europe (6 mois max)
- [ ] DPIA + avocat
- [ ] CGU/CGV — encadrer "certifié" et "alerte immédiate"
- [ ] SOPs incident response + RGPD

### 🟡 Produit
- [ ] Pricing B2B dégressif par user (Stripe)
- [ ] Accordion détail par plan /pricing
- [ ] Témoignages + chiffres réels landing
- [ ] SASU → SAS dans le code (après immatriculation)
- [ ] Boutons admin AIAlert (Investiguer/Résoudre/Ignorer)

### 🔵 Long terme
- Extension Chrome TrustScan (3-4 mois)
- Plugin email Outlook/Gmail (4-6 mois)
- App mobile + NFC (6-12 mois)
- SSO / SAML + SCIM Enterprise
- WAF Cloudflare + pentest
- ISO 27001

---

## 10. OBJECTIFS 9-10/10

Score actuel : **9/10**

| Action | Impact |
|--------|--------|
| 1 client B2B signé | +++++ |
| Témoignages réels | +++ |
| EUIPO + DPIA + SOPs | ++ |
| Extension Chrome | ++ |
| Partenariats prescripteurs | +++++ |

---

## 11. RÈGLES ABSOLUES

- PrismaClient → `@/app/lib/db`
- userId → `session.user.id` uniquement
- Burn address pour ancrage Polygon
- POLYGON_PRIVATE_KEY jamais loggée
- "KYC" jamais visible utilisateur
- "entité" → "contact" côté utilisateur
- BLOCKTRUST™ = majuscules toujours
- Stats non vérifiables interdites sur landing

---

## 12. DOCUMENTS PRODUITS

| Document | Contenu |
|----------|---------|
| BLOCKTRUST_PROJECT_KNOWLEDGE.md | **Ce fichier** (référence projet v8) |
| BLOCKTRUST_Plan_Juridique_Laurianne.docx | DPIA + ISO + CGU |
| BLOCKTRUST_Depot_Marque_INPI.docx | Dossier dépôt INPI |
| BLOCKTRUST_Plan_Commercial_Deborah_Laurianne.docx | Plan 4 semaines |
| BLOCKTRUST_Messaging_Domaines_Intervention.docx | Messaging B2C/B2B |
| BLOCKTRUST_Roadmap_TrustCircle_Alertes.md | Feature Cas 1/Cas 2 |

---

## 13. ACCÈS

| Ressource | Info |
|-----------|------|
| Production | https://blocktrust.tech |
| Admin | https://blocktrust.tech/admin/dashboard |
| Menaces | https://blocktrust.tech/menaces |
| GitHub | github.com/brnbtech770/blocktrust |
| Vercel | vercel.com → blocktrust-mvp |
| Alchemy | dashboard.alchemy.com |
| Upstash | console.upstash.com (Redis + QStash) |
| Sentry | sentry.io → brnb-tech/javascript-nextjs |
| Anthropic | console.anthropic.com |
| PolygonScan | polygonscan.com |
| INPI | depot.inpi.fr (marque n°5253718) |
| Support | support@blocktrust.tech |
| Commercial | commercial@blocktrust.tech |

---

*Mis à jour le 4 mai 2026 — Session Cursor · aligné codebase `main`*
*Milestones : Agent surveillance événementiel + QStash + Veille cyber IA + Trust Circle Cas 1/2 + Page /verify + Logo badge officiel défaut UI + INPI ✅*
*Règle absolue : ce fichier est mis à jour après chaque session*
*→ Uploader dans Project Knowledge Claude + commit GitHub*
