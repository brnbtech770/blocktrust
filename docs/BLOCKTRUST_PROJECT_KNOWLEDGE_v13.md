# BLOCKTRUST — Knowledge Base v13
**Date:** 27 mai 2026 | **Score:** 9.8/10 | **Global:** 96%

---

## 1. VISION

> "BLOCKTRUST n'est pas un badge. C'est le Trust Layer universel — la couche de confiance contextuelle qui manque à Internet." 

**Le Flywheel :**
```
Plus de vérifications → Plus de données → Meilleur scoring
→ Plus de confiance → Plus d'utilisateurs → Plus de vérifications
```

**Le Moat :** Identité + Réputation + Historique + Contexte + Preuve + Réseau

---

## 2. ÉQUIPE & SOCIÉTÉ

**BRNB TECH SAS** | Capital 1000€ | APE 6201Z

| Nom | Rôle | Email | Capital |
|-----|------|-------|---------|
| Olivier Bernabé | CEO | brnbtech@gmail.com | 50% |
| Laurianne Winter | DAF/DPO | laurianne@winter-keys.com | 15% |
| Déborah Slama | Marketing | deborahbernabe@gmail.com | 15% |
| Shaï Bernabé | Data/IA | shai270202@gmail.com | 20% |

**ADMIN_EMAILS (7) :**
brnbtech@gmail.com, laurianne@winter-keys.com, deborahbernabe@gmail.com,
shai270202@gmail.com, brnbimmo@gmail.com, contact@brnb.fr, bernabeshai56@gmail.com

**INPI :** BLOCKTRUST™ n°5253718 — publié BOPI n°26/21 du 22/05/2026
**Deadline opposition :** 22 juillet 2026
**EUIPO :** avant octobre 2026 (~1200€)

---

## 3. INFRASTRUCTURE CRITIQUE

### Neon DB — RÈGLE ABSOLUE
```
✅ bold-frost (vercel-dev) = VRAIE BASE PROD
   ep-bold-frost-agajqrnv-pooler.c-2.eu-central-1.aws.neon.tech

❌ odd-resonance = ANCIENNE BASE — NE PLUS UTILISER
   ep-odd-resonance-aguqwgg5
```

### Après chaque régénération AUTH_SECRET
```
→ Toujours visiter /api/auth/reset-oauth-cookies
→ Vider les cookies du navigateur
→ Retester la connexion Google en fenêtre privée
```

### postinstall Vercel (auto-migration)
```
"postinstall": "prisma generate && prisma migrate deploy"
→ S'exécute à chaque déploiement Vercel
→ Applique les migrations sur bold-frost automatiquement
```

### Vercel crons — Hobby (27 mai 2026)
```
vercel.json — tous les crons quotidiens (max 1/jour sur Hobby) :
  anomaly-detection      → 0 3 * * *
  trustscore-update      → 0 3 * * *
  threat-articles        → 0 5 * * *
  subscription-monitor   → 0 9 * * *  (9h UTC)

⚠️ Un cron horaire (0 * * * *) BLOQUE tous les déploiements Vercel Hobby.
→ Agents fraude/sécurité/onboarding : QStash (~5 min), pas Vercel cron.
→ subscription-monitor : cron quotidien + run manuel /api/admin/run-agent?agent=subscription
```

---

## 4. STACK TECHNIQUE

```
Framework    : Next.js 16.2.4 (webpack — Turbopack DÉSACTIVÉ)
Language     : TypeScript (strict)
Style        : TailwindCSS
Auth         : NextAuth v5 (trustHost: true, debug: false en prod)
ORM          : Prisma 5 (v6.19.3)
DB           : PostgreSQL via Neon Launch (bold-frost)
Paiements    : Stripe (subscriptions + Identity KYC + Tax)
Emails       : Resend (SPF/DKIM/DMARC ✅)
Storage      : Vercel Blob
JWT          : jose (ES256)
Blockchain   : Polygon Mainnet (Chain ID 137) via Alchemy
Rate Limit   : Upstash Redis + in-memory fallback
Surveillance : QStash (~5 min) + Vercel crons (quotidien)
Monitoring   : Sentry + /status page + /api/health
IA Veille    : Claude Haiku 4.5
CI/CD        : GitHub Actions (CI complète ✅)
Déploiement  : Vercel Hobby (→ Pro dès premiers clients)
Tests        : Vitest (17 tests — verify, trust engine, stripe, security)
```

---

## 5. FEATURES EN PRODUCTION — 27 MAI 2026

### Auth & Sécurité
- ✅ Google OAuth stable (fix migration bold-frost)
- ✅ Connexion rapide (fire-and-forget bootstrap)
- ✅ debug: false en production (tokens JWT non exposés)
- ✅ Adapter wrapper debug supprimé
- ✅ AUTH_SECRET régénéré (sécurisé)
- ✅ Provider Google conditionnel (pas de "" vide)
- ✅ db-env-shim.ts (corrige URLs malformées)
- ✅ /api/health avec check DB réel

### Dashboard Admin
- ✅ Sidebar 5 sections
- ✅ Vue clients (badge, ancrage, plan, KYC, TrustScore)
- ✅ Logs d'activité /admin/logs
- ✅ Export CSV certificats (5000 lignes)
- ✅ Pagination certificats (20/page)
- ✅ TrustScore dans liste utilisateurs
- ✅ Actions organisations B2B (tier, suspend, vault)
- ✅ AIAlert boutons Investiguer/Résoudre/Ignorer
- ✅ /admin/surveillance avec agents actifs
- ✅ Boutons run manuel agents (fraude/sécurité/abonnements/onboarding)
- ✅ Logs exécution agents (20 dernières)

### 4 Agents Surveillance (ACTIFS — scan 5 min)
- ✅ Agent Fraude : FRAUD_ALERT, TrustScore < 30, clusters IP
- ✅ Agent Sécurité : rate limit, connexions échouées, KYC rejeté
- ✅ Agent Abonnements : expirations, rappels J-7 (cron 9h quotidien)
- ✅ Agent Onboarding : KYC 48h, ancrage stale, activation J+7
- ✅ /api/admin/restart-surveillance (relancer QStash)
- ✅ /api/admin/run-agent (test manuel)

### Extension Chrome TrustScan
- ✅ Badge vert ✓ Certifié • Score 87/100
- ✅ Badge gris ? Non vérifié BLOCKTRUST™ (expéditeurs inconnus)
- ✅ Tooltip au survol (signaux KYC/réseau/Polygon)
- ✅ Lien "Certifier son identité" dans tooltip UNKNOWN
- ✅ Cache 5 min + queue 300ms anti rate-limit
- ✅ Trust Circle search élargi
- ✅ CORS mail.google.com
- ✅ Fix tooltip CSS Gmail (styles inline, pas .bt-tooltip-interactive)

### Trust Engine V2
- ✅ lib/trust-engine.ts (4 sous-scores)
- ✅ Formule canonique : Identity×0.4 + Network×0.3 + Behavior×0.2 + Technical×0.1
- ✅ Signaux contextuels sur /verify (ValidWowView)
- ✅ Animation badge-pop + score en grand
- ✅ Recommandation TRUST/VERIFY/CAUTION/DANGER
- ✅ Cache Redis /verify (TTL 5 min)

### Trust Delegation Model
- ✅ lib/trust-delegation.ts (matrice 4 rôles × 5 sujets)
- ✅ getUserRole() + canUserCertify()
- ✅ Section "Mes droits" dans /dashboard/settings
- ✅ Révocation membre organisation complète
- ✅ API certificats vérifie la délégation (403 DELEGATION_DENIED)

### Qualité & Ops
- ✅ 17 tests vitest (verify, trust engine, stripe, security)
- ✅ /status page publique
- ✅ Sentry sur échec crons
- ✅ Status page alertes si cron inactif > 10 min
- ✅ ESLint 0 erreurs no-explicit-any
- ✅ CI GitHub Actions complète
- ✅ 12 migrations Neon (bold-frost)
- ✅ 11 index Prisma performance

### RGPD
- ✅ BiometricConsentModal (Art. 9)
- ✅ /api/kyc/consent (GET/POST)
- ✅ biometricConsentAt + biometricConsentVersion en DB
- ✅ KYC bloque sans consentement (403)

### Emails
- ✅ CertifiedEmailFooter dans tous les templates (18 fichiers)
- ✅ "✓ Cet email est envoyé par une identité certifiée BLOCKTRUST™"
- ✅ PasswordResetEmail template charte BLOCKTRUST™
- ✅ MagicLinkEmail + tous les templates

### Extension — Publication (à faire)
- ⬜ Icônes PNG réelles (16/48/128)
- ⬜ Publication Chrome Web Store (5$)

---

## 6. EXPERT STACK BLOCKTRUST (5 Skills)

| Skill | Lignes | Contenu |
|-------|--------|---------|
| Trust_Engine_Skill | 1074 | Scoring, propagation, anti-Sybil, formule canonique |
| Legal_Compliance_Skill | 525 | RGPD, AI Act, eIDAS 2.0, DPA |
| Email_Verification_Skill | 560 | SPF/DKIM/DMARC/ARC complet + Mail Trust Flow |
| Root_Of_Trust_Skill | 472 | Polygon, Trust Delegation, Account Recovery |
| Threat_Model_Skill | 591 | Sybil, Insider, Prompt Injection, Reputation Collapse |
| **TOTAL** | **3222** | |

---

## 7. LEGAL — ÉTAT RÉEL (27 mai 2026)

### Documents Laurianne — Drive

| Document | Statut |
|----------|--------|
| CGU v2 (1er mai 2026) | ✅ Rédigées — corrections à faire |
| Politique de confidentialité | ✅ Rédigée — corrections à faire |
| DPIA v0 (1er mai 2026) | ✅ Rédigée — validation avocat requise |
| SOP Incident Response | ✅ Rédigée |
| SOP RGPD Breach 72h CNIL | ✅ Rédigée |
| Politique cookies | ⬜ Dossier vide |
| Registre des traitements | ⬜ Dossier vide |
| Politique rétention données | ⬜ Dossier vide |
| CGV | ⬜ Dossier vide |
| DPA sous-traitants | ⬜ À créer |

### Corrections urgentes
```
→ "contact@brnntech.com" → brnbtech.com (typo)
→ "BLOCK TRUST" → "BLOCKTRUST™"
→ "BRNB TECH SASU" → "BRNB TECH SAS"
→ CGU : tribunal Paris + médiateur + rétractation 14j
```

### Réunion jeudi prochain
- Laurianne + Déborah + Olivier
- Landing page + expérience admin/clients
- Validation docs juridiques

---

## 8. PRICING (EN RÉVISION)

### B2C (TTC)
| Plan | Prix/mois | Profils |
|------|-----------|---------|
| Essentiel | 3,99€ | 1 |
| Premium | 9,99€ | 1 |
| Famille | 14,99€ | 5 |
| Famille+ | 24,99€ | 10 |

### B2B (HT + TVA 20%)
| Plan | Prix/user/mois | White Label |
|------|---------------|-------------|
| Solo Pro | 9,99€ | ❌ |
| Starter | 8,99€ | ❌ |
| Team | 7,99€ | ❌ |
| Business | 5,99€ | ✅ |
| Enterprise | Sur devis | ✅ |

**⬜ Stripe Price IDs à créer**
**Réunion jeudi pour décision finale**

---

## 9. AVANCEMENT — 27 MAI 2026

```
Technique core     ████████████████████  100% ✅
Sécurité           ████████████████████   98% ✅
Produit/UX         ███████████████████░   97%
Extension Chrome   ████████████████████   98% ✅
Trust Engine V2    ████████████████░░░░   80%
Agents surveillance████████████████████  100% ✅
Dashboard admin    ████████████████████  100% ✅
Tests              ████████░░░░░░░░░░░░   40%
Legal/Compliance   ████████████████░░░░   80%
Marketing          ████████████░░░░░░░░   60%
Commercial         ████░░░░░░░░░░░░░░░░   20%

GLOBAL             ███████████████████░   96%
Score              9.8/10
```

---

## 10. TÂCHES RESTANTES

### 🔴 CETTE SEMAINE
```
□ Vercel Pro (20$/mois) → crons horaires agents
□ Chrome Web Store publication (5$)
□ Icônes PNG extension (16/48/128)
□ Freemium plan gratuit (adoption asymétrique)
□ Stripe pricing décision + Price IDs
□ Secrets GitHub (Polygon manquant)
□ Trust Engine enrichissement :
  → Domain age (WHOIS)
  → IP reputation (AbuseIPDB)
  → Disposable email detection
  → Trust Graph propagation
□ Tests vitest supplémentaires (coverage > 60%)
□ Vault B2B flux complet testé
□ Cache Redis /api/public/verify ✅ (fait)
```

### 🔴 RÉUNION JEUDI (Laurianne + Déborah)
```
□ Landing page finale (textes + CTA)
□ Expérience admin et clients
□ Pricing final
□ Docs juridiques corrections
```

### 🔴 LEGAL (Laurianne + avocat)
```
□ Corriger typos tous documents
□ CGU tribunal + médiateur + rétractation
□ DPIA validation avocat
□ Politique cookies
□ Registre traitements
□ CGV + DPA sous-traitants
□ EUIPO avant oct. 2026 (1200€)
□ Surveiller oppositions → deadline 22 juillet 2026
□ HOLDING + SAS + Qonto
□ Contrat licence marque Olivier → SAS
```

### 🟡 MARKETING (Déborah)
```
□ Plaquette B2B 1 page
□ Témoignages + chiffres landing
□ Démo vidéo 2 min
□ Script pitch 30 secondes vertical immo
```

### 🔵 UPGRADES INFRA
```
□ Vercel Pro (maintenant — bloquant pour agents horaires)
□ Cloudflare Pro (avant grands comptes)
□ Neon Scale (si > 10GB)
```

### 🔵 LONG TERME
```
□ App mobile + NFC (6-12 mois)
□ SSO/SAML Enterprise
□ ISO 27001
□ Pentest externe
□ AWS KMS
□ eIDAS 2.0 compatibility
□ Plugin Outlook
□ Bug bounty YesWeHack
□ Status page publique (status.blocktrust.tech)
□ BIMI setup (logo dans Gmail)
```

---

## 11. RÈGLES ABSOLUES

```
PrismaClient    → @/app/lib/db
Auth            → @/app/lib/auth-server
Neon prod       → bold-frost (vercel-dev) JAMAIS odd-resonance
debug auth      → false en production (jamais true)
AUTH_SECRET     → après régénération → reset-oauth-cookies obligatoire
"KYC"           → jamais visible utilisateur
"Frauduleux"    → jamais → "Signaux de vigilance"
BLOCKTRUST™     → majuscules + trademark
Turbopack       → DÉSACTIVÉ (--webpack)
Icônes          → lucide-react uniquement
Badge SVG       → uniquement app/api/badge/[id]/route.ts
SASU            → SAS partout ✅
postinstall     → prisma generate && prisma migrate deploy
Vercel crons    → Hobby = max 1/jour ; Pro = horaire possible
```

---

## 12. ACCÈS

| Ressource | Info |
|-----------|------|
| Production | https://blocktrust.tech |
| Admin | https://blocktrust.tech/admin/dashboard |
| Status | https://blocktrust.tech/status |
| Health | https://blocktrust.tech/api/health |
| GitHub | github.com/brnbtech770/blocktrust |
| Vercel | vercel.com → blocktrust-mvp |
| Neon | console.neon.tech → vercel-dev (bold-frost) |
| Stripe | dashboard.stripe.com |
| Resend | resend.com |
| Upstash | console.upstash.com |
| Sentry | sentry.io → brnb-tech |
| INPI | n°5253718 |
| DPO | privacy@blocktrust.tech |
| Sécurité | security@blocktrust.tech |

*Mis à jour le 27 mai 2026*
*Règle absolue : uploader dans Project Knowledge + commit docs/ après chaque session*
