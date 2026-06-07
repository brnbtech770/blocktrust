# BLOCKTRUST — Knowledge Base v14
**Date : 1er juin 2026 | Score : 9.9/10 | Global : ~97%**
*(Remplace v13 du 27 mai — intègre sessions 29 mai infra + 1er juin pricing/Découverte)*

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

## 2. COMMUNICATION ENTRE BADGES (PILIER PRODUIT — NE JAMAIS OUBLIER)

Différenciateur central de BLOCKTRUST, distinct du simple badge statique.

### Trust Graph (graphe de confiance auditable)
```
Les badges se relient entre eux :
- "Entreprise A" certifie "Prestataire B"
- "Agence C" collabore avec "Marque D"
- "Client E" laisse une vérification validée
```
Chaque lien = hash + timestamp. Forme un graphe vérifiable depuis la page publique du badge. Plus une entité interagit avec des partenaires fiables, plus son TrustScore monte. Propagation indirecte déjà implémentée dans Trust Engine V2.

### Trust Circle (3 modes de relation entre badges)
```
MUTUAL     → les deux parties se reconnaissent sur BLOCKTRUST
UNILATERAL → une partie reconnaît l'autre
MANUAL     → ajouté sans vérification
```
4 niveaux affichés : MUTUAL / UNILATERAL / MANUAL / UNVERIFIED. Protection Cas 1 / Cas 2 visible sur /verify/[id].

### Mail Trust Flow (communication badge ↔ email)
```
- Signature des emails (X-BlockTrust-Signature à terme)
- Extension Chrome lit la signature → badge vert/gris dans Gmail
- Footer certifié sur tous les emails
- Vérification croisée expéditeur ↔ badge
```

### FRAUD_ALERT
Pipeline de propagation des signaux de fraude entre entités liées.

### Enrichissements futurs (à ne pas perdre)
```
- Endorsements (graph social entités)
- Trust Graph propagation avancée (au-delà de l'indirect actuel)
- Score d'issuer / réputation comportementale réseau
- Détection clusters via interactions inter-badges
```

---

## 3. ÉQUIPE & SOCIÉTÉ

**BRNB TECH SAS** (transformation SASU→SAS en cours, avocat) | Capital 1000€ | APE 6201Z

| Nom | Rôle | Email | Capital |
|-----|------|-------|---------|
| Olivier Bernabé | CEO | brnbtech@gmail.com | 50% |
| Shaï Bernabé | Data/IA | shai270202@gmail.com | 20% |
| Laurianne Winter | DAF/DPO | laurianne@winter-keys.com | 15% |
| Déborah Slama | Marketing | deborahbernabe@gmail.com | 15% |

PI : Shaï n'a rien développé → PI 100% Olivier. Johanna (épouse) = VIP user, compte interne, pas admin.

**ADMIN_EMAILS (7) :**
brnbtech@gmail.com, laurianne@winter-keys.com, deborahbernabe@gmail.com, shai270202@gmail.com, brnbimmo@gmail.com, contact@brnb.fr, bernabeshai56@gmail.com

**Comptes internes** (libellé "Compte interne", droits Enterprise) : les 7 admins + Johanna (johannabernabe3@gmail.com, johannafartoukh@yahoo.fr)

**INPI :** BLOCKTRUST™ n°5253718 — publié BOPI n°26/21 du 22/05/2026
**Deadline opposition :** 22 juillet 2026 | **EUIPO :** avant octobre 2026 (~1200€)

---

## 4. INFRASTRUCTURE CRITIQUE (RÈGLES ABSOLUES)

### Neon DB
```
✅ bold-frost (vercel-dev) = VRAIE BASE PROD
   ep-bold-frost-agajqrnv-pooler.c-2.eu-central-1.aws.neon.tech
❌ odd-resonance = ANCIENNE BASE — NE PLUS UTILISER
   ep-odd-resonance-aguqwgg5
```

### Règles infra
```
postinstall     → "prisma generate && prisma migrate deploy" (auto-migration Vercel)
CI npm          → TOUJOURS npm ci --ignore-scripts (sinon postinstall plante)
@emnapi/core+runtime → en devDependencies directes (bindings wasm32, sinon CI casse Linux)
AUTH_SECRET     → après régénération → /api/auth/reset-oauth-cookies obligatoire
debug auth      → false en production
Vercel crons    → Hobby = max 1/jour ; Pro = horaire possible
PrismaClient    → @/app/lib/db
Auth            → @/app/lib/auth-server
"KYC"           → jamais visible utilisateur
"Frauduleux"    → jamais → "Signaux de vigilance"
BLOCKTRUST™     → majuscules + trademark
Icônes          → lucide-react uniquement
Badge SVG       → uniquement app/api/badge/[id]/route.ts
Turbopack       → DÉSACTIVÉ (--webpack)
SASU            → SAS partout
Redis           → getRedis() lazy fail-soft (jamais d'instanciation au build)
Charte          → navy #0a1628 / cyan #00d4ff / gold #BDA76B / vert #10b981 / orange #f59e0b / rouge #E05252
```

### RÈGLE ABSOLUE AFFICHAGE (1er juin)
```
L'UI ne contient JAMAIS de nom de plan, prix, quota ou donnée blockchain en dur.
Tout dérivé via resolveAccountPlan + getPlanDisplayLabel
+ getMaxCertificates/getMaxEntities + isInternalAccount.
Composant unique PlanBadge.tsx = source de vérité.
Découverte → "Découverte" | internes → "Compte interne"
```

---

## 5. STACK TECHNIQUE

```
Framework    : Next.js 16.2.6 (webpack — Turbopack DÉSACTIVÉ)
Language     : TypeScript (strict)
Style        : TailwindCSS
Auth         : NextAuth v5 (debug: false en prod)
ORM          : Prisma 6.19.3
DB           : PostgreSQL via Neon Launch (bold-frost)
Paiements    : Stripe (subscriptions + Identity KYC + Tax)
Emails       : Resend (SPF/DKIM/DMARC ✅)
Storage      : Vercel Blob
JWT          : jose (ES256)
Blockchain   : Polygon Mainnet (Chain ID 137) via Alchemy — burn 0x000...dEaD, ~122 POL
Rate Limit   : Upstash Redis + in-memory fallback
Surveillance : QStash (~5 min) + Vercel crons (quotidien)
Monitoring   : Sentry + /status + /api/health
IA Veille    : Claude Haiku 4.5
CI/CD        : GitHub Actions (CI verte ✅)
Déploiement  : Vercel Hobby (→ Pro pending)
Tests        : Vitest (53 tests — ~75% coverage)
Dev port     : 3004 (local)
```

---

## 6. PRICING FINAL (VALIDÉ 1er juin — FIGÉ)

### B2C (TTC) — 4 plans
| Plan | Mensuel | Annuel | Contacts | Vérif/mois | Profils |
|------|---------|--------|----------|-----------|---------|
| Découverte | GRATUIT | — | 5 | 20 | 1 |
| Essentiel | 3,99€ | 2,99€/mois (35,88€/an, éco 12€) | 20 | 500 | 1 |
| Premium | 6,99€ | 4,99€/mois (59,88€/an, éco 24€) | 100 | illimité | 1 |
| Famille | 17,99€ | 14,99€/mois (179,88€/an, éco 36€) | 200 +50/profil | illimité | 5 inclus, max 10 |

Famille add-on : +2,99€/mois (ou 2,49€/mois annuel = 29,88€/an) par profil sup., max 10.
Découverte = badge ES256 NON ancré Polygon (gas zéro), pas de Trust Circle.

### B2B (HT) — 3 plans, par utilisateur, PAS de gratuit
| Plan | Mensuel/user | Annuel/user | Users | Contacts | Vérif/mois |
|------|-------------|-------------|-------|----------|-----------|
| Starter | 12,99€ | 9,99€ (119,88€/an) | 1 | 100 | 500 |
| Team | 8,99€ (dès 17,98€) | 6,99€ (83,88€/an) | 2-10 | vault illimité +100/user | 2500 mutualisées |
| Enterprise | sur devis | — | 51+ | illimité | illimité + SLA |

White Label = OPTION B2B (sur devis, pas lié à la taille). API/SSO/SAML/audit logs avancés = Enterprise. Audit logs basiques = Team. Acquisition B2B = démo commerciale.

### Règles transverses
```
- Toggle annuel par défaut, réduction en € (B2C) / -20% (B2B)
- Vérifications illimitées pendant lancement (6 mois) puis quotas
- RÈGLE /verify : anonyme voit badge+nom+ancrage Polygon, PAS le TrustScore détaillé ;
  inscrit (même Découverte) voit tout
- Stripe : prix créés/migrés, anciens archivés (Business/Famille+),
  variables Vercel STRIPE_PRICE_*, "All Environments" OK en Test
- TVA : Stripe Tax PAS activé (attente SAS + validation Laurianne)
  Reco : France seul, B2C TTC / B2B HT, pas OSS au départ
```

---

## 7. PLAN DÉCOUVERTE — ARCHITECTURE (1er juin)

```
- Gratuit SANS carte bancaire (CB seulement au passage payant)
- Inscription B2C sans abonnement → DISCOVERY par défaut
  (règle de résolution, pas de DB write)
- Badge signé ES256 mais blockchainStatus = NOT_ANCHORED
  (jamais d'ancrage Polygon → gas zéro)
- Garde dans triggerPolygonAnchor : un admin n'ancre jamais un Découverte
- PAS de KYC sur Découverte (KYC + ancrage arrivent au passage payant)
  /api/kyc/start → 403 UPGRADE_REQUIRED si DISCOVERY
- Wording : Découverte = "Identité déclarée — non vérifiée" (orange)
  payant KYC = "Identité certifiée BLOCKTRUST™" (vert)
  Label piloté par KYC seul (abonné KYC en cours d'ancrage reste "certifié")
- Expiration 30 JOURS : emails J-7 (J23) / J-2 (J28) / J30+ = DISCOVERY_EXPIRED
  (badge désactivé, vérif bloquées, données conservées, mur upgrade)
  Géré par agent onboarding existant
- Grandfathering : DATE_LANCEMENT_DECOUVERTE = 2026-06-01
  Comptes créés avant ne sont jamais expirés
- Rate limits anti-abus Sybil :
  compte 3/h/IP, vérif 10/min (60 payant), extension 30/min (120 payant), contacts 5/min (30 payant)
- Statuts en String (pas enum) → zéro migration
- Helpers lib/plan-features.ts : resolveAccountPlan, isDiscoveryPlan,
  isDiscoveryExpired, planAllowsPolygonAnchoring, getPlanDisplayLabel,
  DEFAULT_B2C_PLAN = DISCOVERY
```

---

## 8. FEATURES EN PRODUCTION

### Auth & Sécurité (98%)
- ✅ Google OAuth stable (bold-frost), debug:false prod, db-env-shim
- ✅ /api/health check DB réel, AUTH_SECRET sécurisé
- ✅ Redis lazy fail-soft, rate limiting tiered, Zod strict 32 routes
- ✅ RGPD cascade delete, Stripe webhook idempotence, timingSafeEqual
- ✅ Cloudflare WAF + Bot Fight + SSL Full Strict

### Dashboard Admin (100%)
- ✅ Sidebar 5 sections, vue clients, logs /admin/logs
- ✅ Export CSV (5000), pagination, TrustScore, actions orgs B2B
- ✅ AIAlert, /admin/surveillance, run manuel agents, logs exécution

### 4 Agents Surveillance (100% — QStash ~5min)
- ✅ Fraude (FRAUD_ALERT, TrustScore<30, clusters IP)
- ✅ Sécurité (rate limit, KYC rejeté — 15min)
- ✅ Abonnements (expirations, cron 9h quotidien)
- ✅ Onboarding (KYC 48h, ancrage stale, activation J+7, expiration Découverte 24h)

### Trust Engine V2 (92%)
- ✅ 4 sous-scores : Identity×0.4 + Network×0.3 + Behavior×0.2 + Technical×0.1
- ✅ Plancher 0 (jamais négatif), libellé FR "Non vérifié"
- ✅ Enrichi : domain-age RDAP, disposable-email (35 domaines),
     IP reputation AbuseIPDB, trust graph propagation indirecte
- ✅ Cache Redis /verify TTL 5min, recommandation TRUST/VERIFY/CAUTION/DANGER

### Trust Delegation Model
- ✅ lib/trust-delegation.ts (4 rôles × 5 sujets)
- ✅ getUserRole, canUserCertify, révocation membre org, 403 DELEGATION_DENIED

### Extension Chrome TrustScan (98% — SOUMISE Web Store)
- ✅ Manifest V3, content script Gmail, 4 endpoints
- ✅ Badge vert ✓ / gris ?, tooltip signaux, cache 5min + queue 300ms
- ✅ CORS mail.google.com — compte perso, Non répertorié

### Pricing/Checkout (95%)
- ✅ Page /pricing 2 onglets (Particuliers/Entreprises) à jour
- ✅ Plan gratuit sans priceId (isFree)
- ✅ Checkout par siège B2B (quantity, Team 2-10, validation serveur)
- ✅ Add-on Famille (2e line_item)
- ✅ Webhook provisionne Organization.maxSeats + PersonalAccount.maxProfiles
- ✅ Subscription.seats + extraProfiles, composant PlanBadge unifié

### RGPD / Emails / Qualité
- ✅ BiometricConsentModal Art.9, /api/kyc/consent
- ✅ CertifiedEmailFooter (18 templates)
- ✅ 53 tests vitest (~75%), /status, Sentry crons
- ✅ /privacy complète (DPO anonymisé "Référent protection données")
- ✅ Vercel Analytics + Speed Insights, OG image + favicon, sitemap GSC indexé

---

## 9. EXPERT STACK (Skills internes)

| Skill | Lignes | Contenu |
|-------|--------|---------|
| Trust_Engine | 1074 | Scoring, propagation, anti-Sybil, formule canonique |
| Threat_Model | 591 | Sybil, Insider, Prompt Injection, Reputation Collapse |
| Email_Verification | 560 | SPF/DKIM/DMARC/ARC + Mail Trust Flow |
| Legal_Compliance | 525 | RGPD, AI Act, eIDAS 2.0, DPA |
| Root_Of_Trust | 472 | Polygon, Trust Delegation, Account Recovery |

+ UI_UX_Audit, Security Phase 1/2/3, Stripe, React_Email, Design_System, Chrome_Extension.

---

## 10. AVANCEMENT DÉTAILLÉ — 1er juin 2026

```
Technique core      ████████████████████  100%
Sécurité            ████████████████████   98%
Produit/UX          ███████████████████░   97%
Extension Chrome    ████████████████████   98% (soumise)
Trust Engine V2     ██████████████████░░   92%
Agents surveillance ████████████████████  100%
Dashboard admin     ████████████████████  100%
Infrastructure      ████████████████████  100%
Tests               ███████████████░░░░░   75%
Pricing/Freemium    ███████████████████░   95%
Legal/Compliance    ████████████████░░░░   80%
Propriété Intel.    ████████████████░░░░   82%
Marketing/GTM       ████████████░░░░░░░░   60%
Commercial          ████░░░░░░░░░░░░░░░░   20%

GLOBAL              ███████████████████░   ~97%
Score               9.9/10
```

---

## 11. TÂCHES RESTANTES

### A. PRICING — finir (95→100%)
```
□ Dérouler 4 tests checkout mode Test (Essentiel, Famille+add-on, Team sièges, Découverte)
□ Trancher TVA avec Laurianne + activer Stripe Tax Test
□ Vérifier admins/Johanna ne basculent pas en Découverte
□ Passage Live (quand SAS) : prix Live, séparer environnements Vercel, webhook Live
```

### B. TECHNIQUE / ADMIN (rapides)
```
□ Vercel Pro 20$/mois (débloque crons horaires agents)
□ Secrets GitHub Polygon (POLYGON_PRIVATE_KEY)
□ Emails OVH (contact/privacy/security/commercial @blocktrust.tech)
□ Réseaux sociaux @blocktrust (Instagram/LinkedIn/X/YouTube)
□ Tests coverage 75→80%+
□ Variables legacy Stripe conservées (Famille+/Solo Pro/Business — rétro-compat SYS-5)
```

### C. EXTENSION CHROME
```
□ Attendre validation Google (soumise, 1-3j)
□ Icônes PNG réelles (16/48/128)
□ Images promo Web Store (440×280, 1400×560)
```

### D. LEGAL (Laurianne — BLOQUANT LIVE)
```
□ Création SAS + numéro TVA (avocat)
□ Corriger typos (brnntech.com, BLOCK TRUST, SASU)
□ CGU : tribunal Paris + médiateur + rétractation 14j
□ DPIA validation avocat
□ Politique cookies (dossier vide)
□ Registre des traitements (dossier vide)
□ Politique rétention données (dossier vide)
□ CGV (dossier vide)
□ DPA sous-traitants (Neon, Resend, Upstash)
□ HOLDING + SAS + Qonto
□ Contrat licence marque Olivier → SAS (propriétaire Olivier, SAS licence exclusive 10 ans)
□ EUIPO avant octobre 2026 (~1200€)
□ Surveiller oppositions INPI → 22 juillet 2026
```

### E. PROPRIÉTÉ INTELLECTUELLE
```
✅ OpenTimestamp (29 mai, SHA256 002c0687, commit 9659c77)
□ Copyright notice dans le code
□ Ancrage Polygon version actuelle du code
```

### F. MARKETING / GTM (Déborah)
```
□ Landing page finale (textes + CTA)
□ Plaquette B2B 1 page
□ Témoignages + chiffres réels landing
□ Démo vidéo 2 min, script pitch 30s
□ Réunion Déborah + Laurianne
```

### G. LONG TERME (6-12 mois)
```
□ App mobile + NFC, SSO/SAML Enterprise, plugin Outlook
□ ISO 27001, pentest externe, AWS KMS, Cloudflare Pro, Neon Scale
□ eIDAS 2.0, bug bounty YesWeHack, BIMI, status.blocktrust.tech
□ Trust Graph propagation avancée + endorsements (communication badges)
```

---

## 12. LES 3 VRAIS BLOCAGES AVANT LANCEMENT

```
1. SAS + numéro TVA — verrou principal, sans lui pas de facturation Live
   (le pricing dort en mode Test)
2. Juridique — 4 docs vides (cookies, registre, rétention, CGV) + DPA
   Un client B2B sérieux les vérifiera
3. Validation des flux — 4 tests checkout à dérouler avant d'ouvrir
```

Non-bloquant : landing finale, extension publiée, réseaux sociaux.
Le commercial (1er client B2B) vient APRÈS ces fondations.

---

## 13. RÉPARTITION DU TRAVAIL (RÈGLE ABSOLUE)

```
Claude.ai    = atelier amont (assets, images, PDF/docx/xlsx, diagrammes,
               analyse CSV, prototypage, prompts Cursor, docs réunion,
               knowledge base, mémoire projet)
Cursor       = implémentation repo réel + git + déploiement
Terminal Mac = git / npm / vercel / prisma

Règle : fichier/contenu → Claude ; code prod → Cursor.
Claude ne touche pas au repo/Vercel/Neon.
Quand Olivier signale un manque → générer le prompt Cursor immédiatement.
Pas de 3ème IA (risque de dispersion / versions divergentes).
```

---

## 14. ACCÈS

| Ressource | Info |
|-----------|------|
| Production | https://blocktrust.tech |
| Admin | https://blocktrust.tech/admin/dashboard |
| Status | https://blocktrust.tech/status |
| Health | https://blocktrust.tech/api/health |
| GitHub | github.com/brnbtech770/blocktrust |
| Vercel | vercel.com → blocktrust-mvp (Hobby → Pro pending) |
| Neon | console.neon.tech → vercel-dev (bold-frost) |
| Stripe | dashboard.stripe.com |
| Upstash | console.upstash.com |
| Sentry | sentry.io → brnb-tech |
| INPI | n°5253718 |
| DPO | privacy@blocktrust.tech |
| Sécurité | security@blocktrust.tech |
| Dev port | 3004 (local) |

---

*Mis à jour le 1er juin 2026 — v14*
*Règle de clôture : uploader dans Project Knowledge + commit docs/ après chaque session*
*Prochaine session : tests checkout, Vercel Pro, secrets Polygon, OVH, réseaux sociaux, puis legal (Laurianne) + landing (Déborah)*
