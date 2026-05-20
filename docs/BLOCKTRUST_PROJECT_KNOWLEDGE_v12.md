# BLOCKTRUST — Knowledge Base v12
**Date:** 20 mai 2026 | **Score:** 9.8/10 | **Global:** 94%

---

## 1. VISION — TRUST LAYER UNIVERSEL

> "BLOCKTRUST n'est pas un badge. C'est le Trust Layer universel — la couche de confiance contextuelle qui manque à Internet."

```
Identité + Réputation + Historique + Contexte + Preuve + Réseau
= Graphe de confiance contextualisé
```

**Le Moat :** Personne ne fait l'agrégation de ces 6 dimensions. C'est le vrai avantage compétitif.

**Le Flywheel :**
```
Plus de vérifications → Plus de données → Meilleur scoring
→ Plus de confiance → Plus d'utilisateurs → Plus de vérifications
```

---

## 2. ÉQUIPE & SOCIÉTÉ

**BRNB TECH SAS** | Capital 1000€ | APE 6201Z

| Nom | Rôle | Email admin | Capital |
|-----|------|-------------|---------|
| Olivier Bernabé | CEO | brnbtech@gmail.com | 50% |
| Laurianne Winter | DAF / DPO | laurianne@winter-keys.com | 15% |
| Déborah Slama | Marketing | deborahbernabe@gmail.com | 15% |
| Shaï Bernabé | Data/IA | shai270202@gmail.com | 20% |

**ADMIN_EMAILS :** brnbtech@gmail.com,laurianne@winter-keys.com,deborahbernabe@gmail.com,shai270202@gmail.com

**Comptes VIP :**
- Johanna Bernabé : johannabernabe3@gmail.com + johannafartoukh@yahoo.fr → Enterprise, pas admin
- Olivier pro immo : brnbimmo@gmail.com + contact@brnb.fr → Enterprise, pas admin

**INPI :** BLOCKTRUST™ n°5253718 — 30/04/2026 | **EUIPO :** avant oct. 2026

---

## 3. STACK TECHNIQUE

```
Framework    : Next.js 16.2.4 (webpack — Turbopack DÉSACTIVÉ)
Language     : TypeScript (strict — ESLint 0 erreurs)
Style        : TailwindCSS
Auth         : NextAuth v5 beta (trustHost: true)
ORM          : Prisma 5 (v6.19.3)
DB           : PostgreSQL via Neon (11 index performance ajoutés)
Paiements    : Stripe (subscriptions + Identity KYC + Tax)
Emails       : Resend (SPF/DKIM/DMARC ✅)
Storage      : Vercel Blob (Private, IAD1)
JWT          : jose (ES256) — jsonwebtoken supprimé ✅
Blockchain   : Polygon Mainnet (Chain ID 137) via Alchemy
Rate Limit   : Upstash Redis + in-memory fallback
Surveillance : QStash (5 min) + événementiel
Monitoring   : Sentry (production uniquement)
Proxy        : proxy.ts (Next.js Edge)
WAF          : Cloudflare (Free — Bot Fight + SSL Full Strict)
IA Veille    : Claude Haiku 4.5
CI/CD        : GitHub Actions (CI complète ✅)
Déploiement  : Vercel (Hobby)
```

---

## 4. FEATURES EN PRODUCTION — 20 MAI 2026

### Authentification (réparé 19 mai)
- ✅ Google OAuth fonctionnel (fix dépendance circulaire + CORS)
- ✅ Connexion admin rapide (fire-and-forget bootstrap)
- ✅ Cache JWT plan (pas de re-fetch DB à chaque requête)
- ✅ Admins → accès dashboard personnel ET admin

### Admins bootstrappés
- ✅ 4 admins Enterprise + TrustScore 100 + KYC VERIFIED
- ✅ Certificats + signatures badge créés automatiquement
- ✅ Relations MUTUAL entre les 4 admins
- ✅ Scripts : bootstrap-admin, bootstrap-all-admins, bootstrap-johanna, bootstrap-olivier-pro

### Dashboard Admin
- ✅ Sidebar 5 sections (Vue d'ensemble / Clients / Certification / Sécurité / Administration)
- ✅ Vue clients (badge, ancrage, plan, KYC, TrustScore)
- ✅ KYC → "Vérification d'identité" (jamais "KYC" visible)
- ✅ Plans lisibles (Enterprise au lieu de B2B_ENTERPRISE)
- ✅ MRR/ARR avec "Sur devis" pour Enterprise
- ✅ AIAlert boutons Investiguer/Résoudre/Ignorer fonctionnels
- ✅ Lien "Mon espace personnel" dans sidebar admin

### Extension Chrome TrustScan
- ✅ Badge vert ✓ Certifié BLOCKTRUST™ visible dans Gmail
- ✅ Cache 5 min anti rate-limit
- ✅ Queue séquentielle 300ms
- ✅ Trust Circle search élargi (pas juste les contacts directs)
- ✅ CORS mail.google.com
- ✅ Popup état chargement + barre statut "Actif sur Gmail"
- ✅ Manifest V3 + service worker

### Qualité code
- ✅ ESLint 99 erreurs no-explicit-any corrigées
- ✅ SASU → SAS dans tout le codebase
- ✅ CI complète GitHub Actions (lint + build + prisma validate)
- ✅ 11 index Prisma performance
- ✅ TrustScore sur tous les chemins FRAUD_ALERT
- ✅ PasswordResetEmail template React Email charte BLOCKTRUST™

### Nettoyage comptes
- ✅ TATA GEORGETTE (1rst.invest@gmail.com) supprimé
- ✅ Doublons identifiés et nettoyés
- ✅ contact@brnb.fr à bootstrapper quand compte créé

---

## 5. TRUST ENGINE V2 — À IMPLÉMENTER

### Architecture cible

```
Entrées (signaux) → Signal Collector → Weight Engine
→ Decay Engine → Propagation Engine → Anti-Sybil Guard
→ Score Aggregator → TrustScore + Alertes contextuelles
```

### Formule canonique

```
GlobalTrustScore =
  IdentityScore   × 0.40  (KYC, certificat, coordonnées)
+ NetworkScore    × 0.30  (contacts MUTUAL, qualité réseau)
+ BehaviorScore   × 0.20  (ancienneté, activité, anomalies)
+ TechnicalScore  × 0.10  (domaine, IP, email jetable)

Affichage contextuel /verify :
"⚠ Domaine créé il y a 3 jours"
"⚠ Première interaction"
"⚠ Wallet jamais vu dans le réseau"
TrustScore: 62/100 — VIGILANCE RECOMMANDÉE
```

### 4 couches distinctes (TRUST ≠ SECURITY)

```
Identity Layer   → Qui es-tu ? (KYC, certificat)
Security Layer   → Es-tu compromis ? (IP, device)
Reputation Layer → Quelle est ta réputation ? (réseau)
Context Layer    → Dans ce contexte es-tu fiable ?
```

---

## 6. LEGAL & COMPLIANCE

### Priorités absolues (Laurianne)

| Tâche | Urgence |
|-------|---------|
| CGU corrections (tribunal Paris, médiateur, rétractation 14j) | 🔴 Avant lancement |
| Privacy Policy complète (RGPD Art. 13/14) | 🔴 Avant lancement |
| DPIA avec avocat | 🔴 Obligatoire |
| SOPs incident response + RGPD breach 72h CNIL | 🔴 |
| DPA sous-traitants (Neon, Resend, Upstash) | 🔴 |
| EUIPO avant octobre 2026 (1 200€) | 🟡 |
| HOLDING + SAS + Qonto | 🔴 En cours |
| Contrat licence marque Olivier → SAS | 🔴 |

### Wording légal obligatoire

```
❌ INTERDIT :
"Frauduleux" / "Dangereux" / "Blacklisté"

✅ OBLIGATOIRE :
"Signaux de vigilance" / "Score de confiance faible"
"Indicateurs inhabituels" / "Non certifié BLOCKTRUST™"
```

### Conformité progressive

```
Maintenant : RGPD basique + CGU + Privacy Policy
6 mois    : DPIA complet + SOPs + Audit OWASP
12 mois   : ISO 27001 préparation + Pentest
24 mois   : ISO 27001 certification + SOC 2
```

---

## 7. PRICING (EN RÉVISION)

### B2C (TTC)
| Plan | Prix/mois | Coordonnées certifiées |
|------|-----------|----------------------|
| Essentiel | 3,99€ | 1 email + 1 tel |
| Premium | 9,99€ | 1 email + 1 tel |
| Famille | 14,99€ | 1/profil |
| Famille+ | 24,99€ | 1/profil |

### B2B (HT + TVA 20%)
| Plan | Prix/user/mois | White Label |
|------|---------------|-------------|
| Solo Pro | 9,99€ | ❌ |
| Starter | 8,99€ | ❌ |
| Team | 7,99€ | ❌ |
| Business | 5,99€ | ✅ |
| Enterprise | Sur devis | ✅ |

**Toggle annuel : -20%** | **Vérifications illimitées 6 mois lancement**

**Note : Stripe Price IDs à créer** (pricing en révision)

---

## 8. AVANCEMENT — 20 MAI 2026

```
Technique        ████████████████████  100% ✅
Sécurité         ███████████████████░   95%
Produit/UX       ████████████████████   98%
Extension Chrome ███████████████████░   95% ✅
Trust Engine V2  ░░░░░░░░░░░░░░░░░░░░    0% 🔴
Legal/Compliance ███████░░░░░░░░░░░░░   35%
Marketing        ████████████████░░░░   80%
Commercial       ████░░░░░░░░░░░░░░░░   20%

GLOBAL           ██████████████████░░   91%
Score            9.8/10
```

---

## 9. ROADMAP IMMÉDIATE

### 🔴 CETTE SEMAINE
```
□ Trust Engine V2 (lib/trust-engine.ts)
□ Signaux contextuels sur /verify
□ Secrets GitHub configurés
□ Audit mobile 375px
□ Landing page finale
```

### 🔴 LEGAL (Laurianne — urgent)
```
□ CGU corrections
□ Privacy Policy
□ DPIA
□ SOPs incident response
□ DPA sous-traitants
```

### 🟡 MARKETING (Deborah)
```
□ Plaquette B2B 1 page
□ Témoignages + chiffres landing
□ Démo vidéo 2 min
```

### 🔵 LONG TERME
```
□ App mobile + NFC (6-12 mois)
□ SSO/SAML Enterprise
□ ISO 27001
□ Cloudflare Pro
□ Pentest externe
□ AWS KMS
□ eIDAS 2.0 compatibility
```

---

## 10. SCRIPTS UTILES

```bash
npx tsx scripts/create-plans.ts              # Créer les plans
npx tsx scripts/bootstrap-all-admins.ts      # Bootstrapper 4 admins
npx tsx scripts/bootstrap-johanna.ts         # Bootstrapper Johanna
npx tsx scripts/bootstrap-olivier-pro.ts     # Bootstrapper comptes pro
npx tsx scripts/repair-admin-signatures.ts   # Réparer signatures badge
npx tsx scripts/check-admin-badge.ts         # Vérifier badges admins
npx tsx scripts/cleanup-test-accounts.ts     # Nettoyer comptes test
npx prisma migrate deploy                    # Appliquer migrations
```

---

## 11. VARIABLES VERCEL (état)

| Variable | Statut |
|----------|--------|
| AUTH_SECRET + NEXTAUTH_SECRET | ✅ (même valeur) |
| AUTH_URL + NEXTAUTH_URL | ✅ https://blocktrust.tech |
| GOOGLE_CLIENT_ID | ✅ (non-sensitive pour vérification) |
| GOOGLE_CLIENT_SECRET | ✅ |
| ADMIN_EMAILS | ✅ 4 adresses |
| DATABASE_URL | ✅ Sensitive |
| STRIPE_SECRET_KEY | ✅ Sensitive (Production + Preview) |
| RESEND_API_KEY | ✅ Sensitive |
| BLOCKTRUST_JWT_PRIVATE/PUBLIC_KEY | ✅ |
| POLYGON_PRIVATE_KEY | ✅ Sensitive |
| UPSTASH_REDIS_REST_URL/TOKEN | ✅ Sensitive |
| QSTASH_TOKEN + SIGNING_KEYS | ✅ Sensitive |
| ANTHROPIC_API_KEY | ✅ Sensitive |
| SENTRY_DSN | ✅ |
| STRIPE_PRICE_* | 🔴 À créer (pricing en révision) |

---

## 12. RÈGLES ABSOLUES

```
PrismaClient  → import { prisma } from '@/app/lib/db'
Auth          → import { auth } from '@/app/lib/auth-server'
AccountType   → PERSONAL / BUSINESS
Burn address  → 0x000000000000000000000000000000000000dEaD
"KYC"         → jamais visible utilisateur
"entité"      → "contact" côté utilisateur
"Frauduleux"  → jamais — "Signaux de vigilance"
BLOCKTRUST™   → majuscules + trademark
Turbopack     → DÉSACTIVÉ (--webpack)
timingSafeEqual → toute comparaison secrets
Icônes        → lucide-react uniquement
Badge SVG     → uniquement app/api/badge/[id]/route.ts
SASU          → SAS (partout dans le code) ✅
```

---

## 13. SKILLS PROJECT KNOWLEDGE

| Fichier | Contenu |
|---------|---------|
| BLOCKTRUST_Security_Skills_Phase1/2/3 | OWASP, WAF, Pentest |
| BLOCKTRUST_UI_UX_Audit_Skill | Checklist UI/UX |
| BLOCKTRUST_Stripe_Skill | Stripe, Price IDs, Tax |
| BLOCKTRUST_Chrome_Extension_Skill | MV3, Gmail, CORS |
| BLOCKTRUST_React_Email_Skill | Templates, verifyUrl |
| BLOCKTRUST_Design_System_Skill | Couleurs, typo, badge |
| BLOCKTRUST_Process_Audit_Skill | Flux complet 10 sections |
| BLOCKTRUST_Trust_Engine_Skill | Vision Trust Layer, TrustScore V2 |
| BLOCKTRUST_Legal_Compliance_Skill | RGPD, AI Act, eIDAS 2.0 |

---

## 14. ACCÈS

| Ressource | Info |
|-----------|------|
| Production | https://blocktrust.tech |
| Admin | https://blocktrust.tech/admin/dashboard |
| GitHub | github.com/brnbtech770/blocktrust |
| Vercel | vercel.com → blocktrust-mvp |
| Neon | console.neon.tech |
| Stripe | dashboard.stripe.com |
| Resend | resend.com |
| Upstash | console.upstash.com |
| Sentry | sentry.io → brnb-tech |
| Anthropic | console.anthropic.com |
| INPI | n°5253718 |
| Support | support@blocktrust.tech |
| Commercial | commercial@blocktrust.tech |
| Sécurité | security@blocktrust.tech |
| DPO | privacy@blocktrust.tech |

---

*Mis à jour le 20 mai 2026*
*Session : Auth réparé + Extension Chrome fonctionnelle + CI + Index DB + Legal Skill*
*Règle absolue : uploader dans Project Knowledge + commit docs/ après chaque session*
