# BLOCKTRUST — Knowledge Base v19 (COMPLÈTE)
**Date : 21 juin 2026 | Score : ~99% tech · 20% commercial | 128 tests · 83% coverage**
*(Consolide v18 + BIS Phase 2 + Extension Outlook + Landing complète + Codes rotatifs + Audit 3 + Perf LCP)*

---

## 1. VISION & POSITIONNEMENT

> "BLOCKTRUST n'est pas un badge. C'est le Trust Layer universel — la couche de confiance contextuelle qui manque à Internet."

**Slogan officiel (INTOUCHABLE — ponctuation, casse, ordre inclus) :**
> « La preuve que c'est vous. La certitude que c'est eux. »

### Positionnement final validé (90-95%)
```
Catégorie   : Infrastructure de confiance numérique
Problème    : L'usurpation de CONFIANCE (pas seulement d'identité)
Produit     : Identité + Contexte + Réputation vérifiables (3 couches DÈS LE JOUR 1)
Promesse    : "Avant de répondre, signer ou payer, BlockTrust vous permet de
              vérifier à qui vous avez affaire et d'évaluer le niveau de confiance
              de l'interaction."
Vision inv. : "L'infrastructure de réputation vérifiable des interactions numériques."
```

### Règles de positionnement absolues
- **3 couches DÈS LE JOUR 1** : la réputation est présente dès le départ (TrustScore existe dès le 1er badge), simplement minimale au début. Ne JAMAIS dire "la réputation vient plus tard".
- **Cas d'usage dominant** = vérification de confiance des **interactions entrantes**.
- Jamais "fiable/honnête" → toujours "éléments objectifs pour évaluer la confiance".
- Verticales APRÈS le socle : immobilier, marketplaces, PME, finance, Web3.
- **Répondre en UNE phrase à "pourquoi j'achète BlockTrust demain ?"**
- **Démo = 120s max** : email → badge → verify → TrustScore → Polygon. Rien d'autre.
- Ne pas concurrencer Aura (monitoring/assurance réactif). BlockTrust = certifieur cryptographique proactif. Positionnements complémentaires.
- Stratégie commerciale = **horizontale multi-secteurs, opportuniste**. PAS de verticalisation forcée.

### Le Flywheel
```
Plus de vérifications → plus de données → meilleur scoring
→ plus de confiance → plus d'utilisateurs → plus de vérifications
```

### Le Moat
Identité + Réputation + Historique + Contexte + Preuve + Réseau. Le Trust Graph s'accumule et ne peut pas être copié.

---

## 2. BIS — BlockTrust Interaction Signature (IMPLÉMENTÉ — Phase 1, 16 juin 2026)

**Transforme BlockTrust de "vérification d'identité" en "infrastructure d'interaction vérifiée".**

### Le problème que BIS résout
Une adresse email seule ne prouve pas la légitimité. Boîte mail compromise = l'adresse reste identique, l'historique accessible, l'attaquant se fait passer pour le contact légitime. SPF/DKIM/DMARC ne prouvent pas l'identité BlockTrust. **Pirater une boîte mail ne donne PAS accès à la clé privée ES256/RSA de BlockTrust** → l'absence de signature = le signal d'alerte.

### 5 niveaux BIS
```
0 = Inconnu       : aucun profil BlockTrust (rouge)
1 = Référencé     : ajouté manuellement, pas de garantie (gris)
2 = Vérifié       : identité vérifiée, ancrage Polygon (cyan)
3 = Signé         : interaction signée cryptographiquement (vert) ← IMPLÉMENTÉ Phase 1
4 = Sensible      : action sensible, vérification renforcée requise (gold) ← Phase 4
```

### Architecture technique Phase 1
```
Modèle Prisma     : InteractionSignature (table créée manuellement en prod le 16 juin)
Bibliothèque      : lib/bis-sign.ts (createBisSignature, verifyBisSignature)
                    lib/bis-access.ts (types, gate plan, éligibilité cert ancré)
                    lib/jwt-pem.ts (détection auto RSA→RS256 / EC P-256→ES256)
API               : POST /api/bis/sign (auth session, plan payant + cert ancré)
                    GET /api/bis/verify/[id] (public — tout le monde peut vérifier)
                    GET /api/bis/my-signatures (auth session, paginé)
                    GET /api/bis/received (auth session, paginé)
Page vérification : /verify/bis/[id] (publique, niveaux BIS colorés, badge, TrustScore, PolygonScan)
Dashboard         : /dashboard/bis (onglets Envoyées / Reçues / Signer)
Sidebar           : "Signatures BIS" (icône FileSignature) dans "Mon réseau"
Proxy             : /verify/bis/* et /api/bis/verify/* publics ; sign/my-signatures/received protégés
```

### Types d'interaction supportés
```
EMAIL            → signature d'un email
DOCUMENT         → signature d'un document (contrat, mandat, facture)
PAYMENT_REQUEST  → demande de paiement / RIB
CONTRACT         → validation de contrat
MARKETPLACE      → communication marketplace
```

### Signature
```
Payload signé : {
  iss: "blocktrust.tech",
  sub: senderCertId,
  sender: senderEmail,
  recipient: recipientEmail,
  type: interactionType,
  context: contextLabel,
  contentHash: SHA-256 du contenu (calculé côté CLIENT, contenu JAMAIS envoyé au serveur),
  iat: timestamp,
  exp: iat + 7 jours,
  jti: cuid unique
}
Algo : RS256 (RSA) ou ES256 (EC P-256) — détection automatique dans lib/jwt-pem.ts
Clé  : BLOCKTRUST_JWT_PRIVATE_KEY (sur Vercel Production)
```

### Accès BIS
```
Peut SIGNER  : Premium, Famille, Starter, Team, Enterprise (certificat ancré Polygon requis)
Ne peut PAS  : Découverte (badge non ancré), Essentiel sans ancrage
Peut VÉRIFIER : TOUT LE MONDE (même non inscrit, même anonyme) → levier de conversion
```

### Impact TrustScore
```
Behavior (×0.2) :
  +2 points par signature réussie (max +20)
  +1 point si le destinataire vérifie la signature
  -10 points si certificat révoqué après signature BIS
```

### Première signature BIS
- Date : 16 juin 2026 19:20
- Expéditeur : brnbtech@gmail.com (TrustScore 69)
- Destinataire : jusaadoun@gmail.com
- Type : EMAIL, Contexte : TEST
- Vérification : /verify/bis/cmqgwrayk0001l1046gn7vg2z

### Phases restantes
```
Phase 3 → Détection automatique actions sensibles (Niveau 4 : RIB, contrat, virement)
Phase 4 → Plugin Outlook natif BIS (signature sortante dans le composeur)
```

### BIS Phase 2 — Extension Chrome détecte les signatures (IMPLÉMENTÉ 17 juin)
```
Content script gmail.js : scan corps email → regex blocktrust.tech/verify/bis/
API verify-sender enrichie : bisSignatureDetected, bisVerification, senderUsuallySignsBis, bisMissingAlert
Badge enrichi Gmail :
  - Vert + "BIS Niveau 3 — Signé" (icône FileCheck SVG) si signature valide
  - Orange "Signature BIS invalide ou expirée" si lien présent mais invalide
  - "⚠ Sans signature BIS" si contact certifié qui signe habituellement SANS lien BIS
Alerte compromission : contact certifié + signe habituellement + email sans BIS → signal piratage
Commits : cef5f8d, 406ef50, 5d40b71
Extension v1.0.4 construite avec BIS Phase 2 intégrée
```

### Spec complète : BLOCKTRUST_FEATURE_SPEC_BIS.md

---

## 3. COMMUNICATION ENTRE BADGES (PILIER PRODUIT — NE JAMAIS OUBLIER)

Différenciateur central. Les concurrents ne font que l'identité. BlockTrust fait identité + contexte + relations + historique + propagation.

### Trust Graph (graphe de confiance auditable)
Les badges se relient : "Entreprise A" certifie "Prestataire B", "Agence C" collabore avec "Marque D", "Client E" laisse une vérification validée. Chaque lien = hash + timestamp. Forme un graphe vérifiable depuis la page publique du badge. Plus une entité interagit avec des partenaires fiables, plus son TrustScore monte. Propagation indirecte déjà implémentée dans Trust Engine V2.

### Trust Circle (3 modes de relation entre badges)
MUTUAL (les deux parties sur BLOCKTRUST) / UNILATERAL (une partie reconnaît l'autre) / MANUAL (ajouté sans vérification). 4 niveaux affichés : MUTUAL / UNILATERAL / MANUAL / UNVERIFIED. Protection Cas 1 / Cas 2 visible sur /verify/[id]. **Trust Circle réservé Premium+ uniquement** (corrigé audit SYS-2 du 4 juin).

### Mail Trust Flow (communication badge ↔ email)
Signature des emails (X-BlockTrust-Signature à terme), extension Chrome lit la signature → badge vert/gris dans Gmail, footer certifié sur tous les emails (CertifiedEmailFooter, 18 templates), vérification croisée expéditeur ↔ badge.

### FRAUD_ALERT
Pipeline de propagation des signaux de fraude entre entités liées.

### Trust Monitoring (évolution des agents — pas juste Alerting)
Les agents ne doivent pas être seulement réactifs. Ils doivent évoluer vers une **surveillance continue proactive** : TrustScore qui évolue, domaine qui change, relation Trust Graph qui se dégrade = prévenir AVANT l'incident. Valeur d'abonnement récurrente. C'est la vraie différence avec les concurrents.

### Enrichissements futurs (à ne pas perdre)
Endorsements (graph social entités), Trust Graph propagation avancée (au-delà de l'indirect actuel), score d'issuer / réputation comportementale réseau, détection clusters via interactions inter-badges.

---

## 4. ÉQUIPE & SOCIÉTÉ

**BRNB TECH SAS** (transformation SASU→SAS) | Capital 1000€ | APE 6201Z
**JALON :** Olivier va recevoir les statuts HOLDING + SAS BRNB TECH. Séquence : dépôt de capital → numéro TVA (avec immatriculation) → connexion compte bancaire pro à Stripe → passage Stripe Live + Stripe Tax. Stripe Live demandera SIREN/SIRET, n° TVA, Kbis, identité représentant légal. **Lève le Blocage n°1.**
**Siège :** 17 bis Avenue Franklin Roosevelt, 94300 Vincennes, France

| Nom | Rôle | Email principal | Capital |
|-----|------|----------------|---------|
| Olivier Bernabé | CEO | brnbtech@gmail.com | 50% |
| Shaï Bernabé | Data/IA | shai270202@gmail.com | 20% |
| Laurianne Winter | DAF/DPO | laurianne@winter-keys.com | 15% |
| Déborah Slama | Marketing/GTM (Universal Music) | deborahbernabe@gmail.com | 15% |

**Koray** = contact externe (banques/crypto/IA), rôle connecteur opportuniste.
**Johanna Bernabé** (femme d'Olivier) = VIP user, plan Enterprise full accès, dashboard user standard (pas admin), badge ancré. Emails : johannabernabe3@gmail.com + johannafartoukh@yahoo.fr

**Profil Olivier :** 25 ans d'expérience immobilier, ancien Nexity, dirige son agence immobilière (activité principale rentable — pas de pression cash sur BlockTrust). 50+ contacts qualifiés dans l'écosystème immo (notaires, diagnostiqueurs, agents, banques). À l'aise commercialement mais pas encore sur BlockTrust. **NON technique** : toutes les instructions terminales/outils doivent être explicites et step-by-step. Ne maîtrise pas le jargon tech B2B. BlockTrust = projet tech parallèle, pas activité de survie.

**PI :** Shaï n'a RIEN développé → PI 100% Olivier.

**Premier client B2B identifié : fajaspao.com** (refonte site + réseaux sociaux + optimisation commerciale). En attente dépôt capital + Stripe Live.

### Accès admin (corrigé 16 juin — 3 listes dans lib/admin-utils.ts)
```
DASHBOARD_ADMIN_EMAILS (4) — accès /admin/* :
  brnbtech@gmail.com (Olivier principal)
  laurianne@winter-keys.com (Laurianne)
  deborahbernabe@gmail.com (Déborah)
  shai270202@gmail.com (Shaï)

INTERNAL_EMAILS (6) — dashboard user Enterprise, PAS /admin/* :
  brnbimmo@gmail.com (Olivier secondaire)
  contact@brnb.fr (Olivier secondaire)
  bernabeshai56@gmail.com (Shaï secondaire)
  johannabernabe3@gmail.com (Johanna)
  johannafartoukh@yahoo.fr (Johanna)
  olivierbernabe@gmail.com (Olivier perso)

SUPER_ADMIN_EMAIL = brnbtech@gmail.com
  → seul à voir l'état de connexion des autres admins
  → section "Équipe BLOCKTRUST" dans /admin/dashboard
  → lastLoginAt, statut En ligne (<15min) / Hors ligne, date inscription
```
Gating : proxy + layout + API /admin/* → isDashboardAdmin. Lien admin sidebar visible uniquement pour les 4 emails. resolveEffectivePlan → Enterprise pour les 9. isInternalAccount → true pour les 9. PlanBadge → "Compte interne" pour les 9.

### KYC admin (script + bootstrap)
Les 9 emails internes sont en KYC VERIFIED (Entity.kycStatus + User.kycStatus).
Script idempotent : `scripts/fix-admin-kyc.ts`. Bootstrap auto : `ensureAdminCapabilities` à chaque login.
2 emails non encore inscrits : contact@brnb.fr, johannafartoukh@yahoo.fr → VERIFIED automatiquement au premier login.

### Emails OVH (redirections, copie conservée sur OVH)
```
contact@blocktrust.tech    → brnbtech@gmail.com (Olivier)
privacy@blocktrust.tech    → laurianne@winter-keys.com (DPO)
security@blocktrust.tech   → brnbtech@gmail.com (Olivier)
commercial@blocktrust.tech → deborahbernabe@gmail.com (Déborah)
```

### INPI
**BLOCKTRUST™ n°5253718** — déposé 30/04/2026, nom propre Olivier Bernabé. Publié BOPI n°26/21 du 22/05/2026.
**Deadline opposition : 22 juillet 2026.**
**EUIPO :** dépôt avant octobre 2026 (~1200€).
**Contrat licence marque :** Olivier→SAS (propriétaire Olivier, SAS licence exclusive 10 ans) — à finaliser.

---

## 5. INFRASTRUCTURE CRITIQUE (RÈGLES ABSOLUES)

### Neon DB
```
✅ bold-frost (vercel-dev) = VRAIE BASE PROD
   ep-bold-frost-agajqrnv-pooler.c-2.eu-central-1.aws.neon.tech (DATABASE_URL pooled)
   ep-bold-frost-agajqrnv.c-2.eu-central-1.aws.neon.tech (DIRECT_URL sans -pooler)
❌ odd-resonance = ep-odd-resonance-aguqwgg5 → MORTE — NE PLUS UTILISER

⚠️ Décalage pooler/direct FRÉQUENT :
   prisma migrate deploy affiche "No pending migrations" mais la base pooler n'a pas les changements.
   Script de filet de sécurité : scripts/apply-pooler-migrations.ts (commité, commit 9c7adf4)
   Si migration ne passe pas → lancer npx tsx scripts/apply-pooler-migrations.ts
   Si enum manquant → ALTER TYPE manuellement (voir session 16 juin, enum ENTERPRISE)
   
   Neon se met en veille après ~5 min d'inactivité → réveiller avec SELECT 1 avant prisma migrate deploy
```

### Règles infra complètes
```
postinstall       → "prisma generate && prisma migrate deploy" (auto-migration Vercel au déploiement)
CI npm            → TOUJOURS npm ci --ignore-scripts
@emnapi/core+runtime → en devDependencies directes (bindings wasm32, sinon CI casse Linux)
AUTH_SECRET       → après régénération → /api/auth/reset-oauth-cookies obligatoire (gatée admin + Bearer CRON_SECRET, SEC-14)
debug auth        → false en production
Vercel            → PRO activé (crons horaires agents, Speed Insights)
PrismaClient      → @/app/lib/db (scripts standalone = exception commentée dans check-prod-db, fix-prod-migration, test-e2e-flow)
Auth              → @/app/lib/auth-server
"KYC"             → jamais visible user → "Vérification d'identité" (DES-6 corrigé)
"Frauduleux"      → jamais → "Signaux de vigilance"
BLOCKTRUST™       → majuscules + trademark partout dans l'UI visible (66 fichiers corrigés DES-4)
Icônes            → lucide-react uniquement (emojis UI éradiqués DES-5)
Badge SVG         → uniquement app/api/badge/[id]/route.ts (+ taille xs pour footer)
Turbopack         → DÉSACTIVÉ (--webpack)
SASU              → SAS partout
Redis             → getRedis() lazy fail-soft (jamais instanciation au build)
timingSafeEqual   → toute comparaison de secrets
IP_HASH_SALT      → variable dédiée Sensitive sur Vercel (vérifié présent)
BLOB_READ_WRITE_TOKEN → vérifié présent (relecture KYC privés access:'private')
Secrets Polygon   → 4 variables Sensitive Vercel : POLYGON_CONTRACT_ADDRESS, POLYGON_RPC_URL,
                    POLYGON_PRIVATE_KEY, POLYGON_CHAIN_ID. PAS dans GitHub (CI vert sans, ancrage = runtime)
BLOCKTRUST_JWT_PRIVATE_KEY + BLOCKTRUST_JWT_PUBLIC_KEY → sur Vercel Production (pour BIS + badge)
BLOCKTRUST_SITE_CERT_ID + NEXT_PUBLIC_BLOCKTRUST_SITE_CERT_ID = cmqgsdnik0005jo0414m07afq (badge ambassadeur)
NEXT_PUBLIC_CHROME_EXTENSION_URL = https://chromewebstore.google.com/detail/bemcnlbifffejlijnndkdgcjpmijfaeg
Vercel "Sensitive" → ne permet PAS "All Environments" → cocher Production+Preview+Development individuellement
Dev port          → 3004 (local)
```

### Charte graphique complète
```
Navy fond       : #0a1628
Navy clair      : #122440
Cyan accent     : #00d4ff
Gold accent     : #BDA76B
Vert            : #10b981
Orange          : #f59e0b
Rouge           : #E05252
Charte réseaux  : accents jaunes #f59e0b uniforme ; badge/logo source = #BDA76B
Contenu centré verticalement sur slides type liste/bénéfices
Format Instagram : carrousel 1080×1350, vrai badge détouré, AUCUN emoji
```

### RÈGLE ABSOLUE AFFICHAGE
```
L'UI ne contient JAMAIS de nom de plan, prix, quota ou donnée blockchain en dur.
Tout dérivé via resolveEffectivePlan + getPlanDisplayLabel
+ getMaxCertificates/getMaxEntities + isInternalAccount.
Composant unique PlanBadge.tsx = source de vérité affichage.
Découverte → "Découverte" | internes → "Compte interne"
Messages upgrade dynamiques : formatPlanMonthlyPriceLabel() / getPlanMonthlyAmountEur() depuis lib/pricing.ts.
```

### Décisions architecturales verrouillées (NE JAMAIS TOUCHER)
```
- Enum Prisma PlanType (B2C_FAMILLE_PLUS, B2B_SOLO_PRO, B2B_BUSINESS) + tous les mappings
  runtime (auth.ts, webhook, checkout, subscription) = conservés pour rétro-compatibilité abonnés legacy.
  Migration enum = destructive sur bold-frost = INTERDITE.
- PostgreSQL enum ValidationLevel contient : BRONZE, SILVER, GOLD, PLATINUM (anciennes, PostgreSQL
  ne permet pas de supprimer) + DISCOVERY, ESSENTIEL, PREMIUM, FAMILLE, STARTER, TEAM, ENTERPRISE (nouvelles).
  Le code n'utilise plus que les nouvelles.
- entityType/accountType='BUSINESS' = concept entreprise valide, ne jamais toucher
- jsonwebtoken déjà supprimé (commit f8aea35)
```

### Règle Landing Page
```
"La landing est bien — tu COMPLÈTES avec l'existant, tu ne modifies PAS l'existant."
Slogan = INTOUCHABLE. Seules sections additives autorisées.
```

---

## 6. STACK TECHNIQUE
```
Framework    : Next.js 16.2.7 (webpack — Turbopack DÉSACTIVÉ)
Language     : TypeScript (strict)
Style        : TailwindCSS
Auth         : NextAuth v5 (debug: false en prod)
               3 méthodes : Google OAuth + Email/MDP (bcrypt 12 rounds) + Magic Link (Resend)
ORM          : Prisma 6.19.3
DB           : PostgreSQL via Neon Launch (bold-frost)
Paiements    : Stripe (subscriptions + Identity KYC + Tax)
Emails       : Resend (domaine blocktrust.tech vérifié SPF/DKIM/DMARC, DNS OVH)
Storage      : Vercel Blob (uploads KYC privés, access:'private')
JWT          : jose (RS256/ES256 détection auto — lib/jwt-pem.ts)
Blockchain   : Polygon Mainnet (Chain ID 137) via Alchemy
               Wallet "BlockTrust Anchor", burn 0x000...dEaD, ~122 POL
Rate Limit   : Upstash Redis + in-memory fallback (fail-soft)
Surveillance : QStash (~5 min) + Vercel crons (horaires, Pro)
Monitoring   : Sentry + /status + /api/health (détail ops = admin only, SEC-3)
IA Veille    : Claude Haiku 4.5
CI/CD        : GitHub Actions (CI verte ✅)
Déploiement  : Vercel Pro (blocktrust-mvp)
Tests        : Vitest (113 tests — ~83% coverage)
Dev port     : 3004 (local)
Repo         : github.com/brnbtech770/blocktrust
```

---

## 7. PRICING FINAL (VALIDÉ 1er juin — FIGÉ, ne rien changer avant 100 users + 10 entreprises + 3 mois)

### B2C (TTC) — 4 plans
| Plan | Mensuel | Annuel | Contacts | Vérif/mois | Profils | Trust Circle | BIS |
|------|---------|--------|----------|-----------|---------|-------------|-----|
| Découverte | GRATUIT | — | 5 | 20 | 1 | NON | NON |
| Essentiel | 3,99€ | 2,99€/mois (35,88€/an, éco 12€) | 20 | 500 | 1 | NON | NON |
| Premium | 6,99€ | 4,99€/mois (59,88€/an, éco 24€) | 100 | illimité | 1 | OUI | OUI |
| Famille | 17,99€ | 14,99€/mois (179,88€/an, éco 36€) | 200+50/profil | illimité | 5 inclus, max 10 | OUI | OUI |

Famille add-on : +2,99€/mois (ou 2,49€/mois annuel = 29,88€/an) par profil sup., max 10.
Découverte = badge ES256 NON ancré Polygon (gas zéro). Formuler comme **progression de valeur** ("ancrage Polygon disponible à partir du plan Essentiel"), jamais comme "limité" ou "restreint".
**Gratuit = UNIQUEMENT B2C.** Badge non ancré = gas zéro. White Label = OPTION B2B.

### B2B (HT, par utilisateur) — 3 plans, PAS de gratuit (acquisition par démo)
| Plan | Mensuel/user | Annuel/user | Users | Contacts | Vérif/mois | BIS |
|------|-------------|-------------|-------|----------|-----------|-----|
| Starter | 12,99€ | 9,99€ (119,88€/an) | 1 | 100 | 500 | OUI |
| Team | 8,99€ (dès 17,98€) | 6,99€ (83,88€/an) | 2-10 | vault illimité +100/user | 2500 mutualisées | OUI |
| Enterprise | sur devis | — | 51+ | illimité | illimité + SLA | OUI |

API/SSO/SAML/audit logs avancés = Enterprise. Audit logs basiques = Team.
Toggle annuel par défaut, réduction en € (B2C) / -20% (B2B).

### Règles transverses pricing
```
- Vérifications illimitées au lancement (6 mois) puis quotas → voir CGV (wording "période de lancement" interdit DES-1)
- RÈGLE /verify : anonyme = badge+nom+ancrage, PAS TrustScore détaillé ; inscrit (même Découverte) = tout
- Stripe : prix créés/migrés, anciens archivés (Business/Famille+/Solo Pro)
- Plans legacy : reconnus webhook/auth/MRR (rétro-compat), JAMAIS souscriptibles (isLegacyPriceId → HTTP 410)
- Fallback priceId inconnu → DISCOVERY (jamais ESSENTIEL) — corrigé SYS-6
- TVA : Stripe Tax PAS activé (attente SAS + numéro TVA + validation Laurianne)
  Reco : France seul, B2C TTC / B2B HT, pas OSS au départ
- lib/pricing.ts = SOURCE UNIQUE pour tous montants, quotas, features
- PLAN_QUOTAS + helpers getMaxContacts/getMaxVerifications/getMaxTrustCircle dérivent de pricing.ts
- Checkout par siège B2B (quantity, Team 2-10, Starter=1, validation serveur) + add-on Famille (2e line_item)
- Webhook provisionne maxSeats + maxProfiles, Subscription.seats + extraProfiles
```

---

## 8. PLAN DÉCOUVERTE — ARCHITECTURE (1er juin)
```
- Gratuit SANS carte bancaire (CB tuerait 60-80% des inscriptions — CB seulement au passage payant)
- Inscription B2C sans abonnement → DISCOVERY par défaut
  Subscription.plan @default("DISCOVERY") — corrigé SYS-9, migration 20260607180000
- resolveEffectivePlan vérifie le statut Stripe ACTIF — corrigé SYS-1
  Abonnement inactif/annulé/past_due → DISCOVERY, jamais de droits payants résiduels
- Badge signé ES256 mais blockchainStatus = NOT_ANCHORED (gas zéro)
- Garde dans triggerPolygonAnchor : admin n'ancre jamais un Découverte
- PAS de KYC sur Découverte → /api/kyc/start → 403 UPGRADE_REQUIRED
- PAS de Trust Circle sur Découverte ni Essentiel (Premium+ uniquement) — corrigé SYS-2
- PAS de BIS (nécessite certificat ancré)
- Wording : "Identité déclarée — non vérifiée" (orange) / payant KYC = "Identité certifiée BLOCKTRUST™" (vert)
  Label piloté par KYC seul.
- Expiration 30 JOURS : emails J-7 (J23)/J-2 (J28), J30+ = DISCOVERY_EXPIRED
  (badge désactivé, vérif bloquées, données conservées, mur upgrade). Géré par agent onboarding.
- Grandfathering : DATE_LANCEMENT_DECOUVERTE = 2026-06-01. Comptes créés avant jamais expirés.
- Rate limits anti-abus Sybil : compte 3/h/IP, vérif 10/min (60 payant), extension 30/min (120 payant), contacts 5/min (30 payant)
- Conversion = ancrage blockchain, pas CB forcée
```

---

## 9. FEATURES EN PRODUCTION

### Auth & Sécurité (99%)
- ✅ Google OAuth stable (bold-frost), Redis lazy fail-soft, Zod strict 32 routes
- ✅ 3 méthodes auth : Google OAuth + Email/MDP (bcrypt 12 rounds) + Magic Link (Resend)
- ✅ Comptes Google peuvent définir un mot de passe (/dashboard/settings)
- ✅ Message d'erreur clair (plus de no-session-cookie technique)
- ✅ RGPD cascade delete, Stripe webhook idempotence DB fail-closed (ProcessedStripeEvent + release on error)
- ✅ timingSafeEqual sur tous les secrets, IP hashées (salt dédié IP_HASH_SALT)
- ✅ Cloudflare WAF + Bot Fight + SSL Full Strict
- ✅ **Audit 1 (1er juin) intégralement traité :** 7H+11M+7L — anti-SSRF (lib/ssrf-guard.ts), secrets hashés at rest, rate limit KYC bt:kyc 3/h, uploads KYC privés (access:'private'), CORS hostname exact, idempotence webhook DB fail-closed
- ✅ **Audit 2 (4 juin) intégralement traité :** 40 findings (4C+10H+21M+5L) en 6 lots :
  - P0 Plans : resolveEffectivePlan+statut Stripe (SYS-1), Trust Circle Premium (SYS-2), quotas source unique (SYS-3), Subscription @default DISCOVERY (SYS-9)
  - P0 UX : wording "période de lancement" éradiqué (DES-1), FAQ navbar→/faq (DES-2), ancre #compare retirée (DES-3)
  - P1 Sécu : identity webhook idempotence release (SEC-1), clé API extension en header (SEC-2), /api/health gating admin (SEC-3), proxy matcher étendu (SEC-4)
  - P1 Legacy : plans morts isolés 410 au checkout (SYS-5), fallback DISCOVERY priceId inconnu (SYS-6), docs/scripts alignés grille (SYS-7)
  - P2 Marque : BLOCKTRUST™ 66 fichiers (DES-4), emojis→lucide (DES-5), KYC invisible (DES-6)
  - P2 Dette : messages upgrade dynamiques (SYS-8), scripts singleton Prisma (SYS-10), copy Bitcoin vs Polygon (SYS-12), SEC-13 stack trace, SEC-14 reset-oauth-cookies auth, DES-9 ARIA toggles, DES-14 domaine badge
- ✅ Cookies CNIL conformes : 3 choix niveau égal (Accepter/Refuser/Paramétrer), gating analytics strict, expiration 6 mois, lien "Gestion des cookies" footer
- ✅ Checkout légal sécurisé : CGU+CGV obligatoires (z.literal(true)), renonciation B2C non pré-cochée (accountType=PERSONAL uniquement), trace DB horodatée (cgvAcceptedAt, cgvVersion "2026-05-01", retractationWaiverAt). Route legacy /api/stripe/checkout supprimée.

### Dashboard Admin (100%)
- ✅ Sidebar 5 sections, vue clients, logs, export CSV (5000), pagination, TrustScore
- ✅ Actions orgs B2B, AIAlert, /admin/surveillance, run manuel agents
- ✅ Bouton "Ancrer" par certificat (POST /api/admin/anchor-certificate, isDashboardAdmin)
- ✅ Accès limité 4 emails principaux (isDashboardAdmin)
- ✅ Section "Équipe BLOCKTRUST" (super admin only) avec lastLoginAt

### 4 Agents Surveillance (100% — QStash ~5min, crons horaires Vercel Pro)
- ✅ Fraude (FRAUD_ALERT, TrustScore<30, clusters IP)
- ✅ Sécurité (rate limit, KYC rejeté — 15min)
- ✅ Abonnements (expirations, cron 9h)
- ✅ Onboarding (KYC 48h, ancrage stale, activation J+7, expiration Découverte 24h)
→ Évolution prévue : Trust Monitoring (surveillance proactive).

### Trust Engine V2 (92%)
- ✅ 4 sous-scores : Identity×0.4 + Network×0.3 + Behavior×0.2 + Technical×0.1
- ✅ Plancher 0, libellé FR "Non vérifié", recommandation TRUST/VERIFY/CAUTION/DANGER
- ✅ Enrichi : domain-age RDAP, disposable-email (35 domaines), IP reputation AbuseIPDB, trust graph propagation indirecte
- ✅ BIS : +2/sig (max +20), +1/vérifiée, -10 cert révoqué (dans Behavior)
- ✅ Cache Redis /verify TTL 5min

### Extension Chrome TrustScan (98%)
- ✅ v1.0.4 soumise Web Store (BIS Phase 2 intégrée, review en cours — host permissions Gmail = 3-7j)
- ✅ Manifest V3, content script Gmail, 4 endpoints, badge vert/gris, cache 5min + queue 300ms
- ✅ Auth header Authorization: Bearer / X-API-Key (plus query string — SEC-2)
- ✅ Marqueur dashboard (content/blocktrust-mark.js, data-blocktrust-trustscan="installed")
- ✅ Tooltip hover : TrustScore + signaux (restaurée)
- ✅ BIS Phase 2 : détection liens BIS dans Gmail, badge enrichi "BIS Niveau 3 — Signé", alerte compromission
- ✅ Page /dashboard/extension (clé API bt_ext_... pour tous les plans, Chrome + Outlook)
- ✅ Bannière "Protégez-vous dans Gmail" dans le dashboard (dismissable, détection auto)
- ✅ Lien sidebar "Extension Chrome" (icône Puzzle)
- ✅ URL listing : https://chromewebstore.google.com/detail/bemcnlbifffejlijnndkdgcjpmijfaeg
- ✅ Doc instructions test (Drive : 19lFjFvizG7XosU56FScgUyoAk8zD8TQtVon72-Rn6g4)
- ✅ Description Web Store mise à jour avec BIS (soumise 17 juin)

### Extension Outlook TrustScan (NOUVEAU — Phase 1, 21 juin)
- ✅ Office Add-in (unified manifest JSON), pas COM/VSTO
- ✅ Manifest : public/outlook/manifest.json (MailboxItem.Read.User)
- ✅ Task pane React : app/outlook/taskpane/ (~320px, charte navy/cyan)
- ✅ 7 états UI : auth, chargement, certifié, inconnu, alerte compromission, fraude, erreur
- ✅ Flux : Office.onReady() → expéditeur → scan BIS dans le corps → GET /api/extension/verify-sender
- ✅ CORS : outlook.office.com, outlook.office365.com, outlook.live.com
- ✅ Dashboard : section Outlook + instructions sideload
- ✅ Clé API partagée Chrome/Outlook (même bt_ext_...)
- ✅ Icônes : public/outlook/assets/icon-{16,32,80}.png
- ✅ Spec complète : docs/BLOCKTRUST_Outlook_Addin_SPEC.md

Sideloading test :
```
Outlook Web → Paramètres → Gérer les compléments → Ajouter depuis URL
→ https://blocktrust.tech/outlook/manifest.json
→ Ouvrir un email → "Vérifier l'expéditeur" → coller clé bt_ext_...
```

Roadmap Outlook :
```
Phase 1 ✅ : Task pane + vérification + BIS + alertes (21 juin)
Phase 2    : LaunchEvent auto à l'ouverture d'un email
Phase 3    : Signature BIS sortante dans le composeur
Phase 4    : Publication Microsoft AppSource
```

### Badge ambassadeur (16 juin)
- ✅ Certificat BLOCKTRUST™ créé en prod via /api/admin/repair-ambassador-cert
- ✅ Entity : BLOCKTRUST™ / contact@blocktrust.tech / blocktrust.tech
- ✅ publicCertId : cmqgsdnik0005jo0414m07afq
- ✅ Ancré Polygon : txHash 0xc8dda31ece3b8e9cc3869e33985fc0c98cb4baa3ce586575b60a5f926c04f569
- ✅ PolygonScan : https://polygonscan.com/tx/0xc8dda31ece3b8e9cc3869e33985fc0c98cb4baa3ce586575b60a5f926c04f569
- ✅ Badge discret dans le footer de TOUTES les pages (FooterSiteCertBadge.tsx, ~40px, cliquable → /verify)
- ✅ Fail-soft : masqué si NEXT_PUBLIC_BLOCKTRUST_SITE_CERT_ID absent ou erreur

### Pricing/Checkout (95%)
- ✅ Page /pricing 2 onglets, plan gratuit isFree, harmonisation TTC/HT (recette UX)
- ✅ Checkout par siège B2B + add-on Famille + webhook provisionnement
- ✅ resolveEffectivePlan source unique, PlanBadge unifié, quotas dérivés pricing.ts
- ✅ Plans legacy → 410, fallback DISCOVERY

### Refactor ValidationLevel (7 juin)
- ✅ BRONZE/SILVER/GOLD → DISCOVERY/ESSENTIEL/PREMIUM/FAMILLE/STARTER/TEAM/ENTERPRISE
- ✅ Nouveau module lib/certificate-plan-level.ts — niveau certificat dérivé du plan effectif
- ✅ Migration Prisma : 20260607190000_validation_level_plan_codes
- ✅ Admin dropdowns nettoyés (plus FAMILLE_PLUS/BUSINESS affichés)
- ✅ Composant PlanBadge unifié (resolveAccountPlan → resolveEffectivePlan + getPlanDisplayLabel + isInternalAccount)

### Codes rotatifs vérification (NOUVEAU — 16 juin)
- ✅ Modèle Prisma CertificateVerifyToken (table créée manuellement en prod)
- ✅ API : POST /api/verify/generate-link (auth propriétaire, TTL 1h/24h/7j/30j)
- ✅ API : GET /api/verify/tokens (historique actif/consulté/expiré)
- ✅ API : GET /api/verify/resolve-token (résolution token + fallback Redis)
- ✅ API : GET /api/verify/link-qr (QR PNG du lien rotatif)
- ✅ /verify accepte ?certId= (permanent) + ?vt=TOKEN (rotatif, expirable)
- ✅ Dashboard badge : choix durée + copie lien rotatif + QR rotatif
- ✅ Lien rotatif PAR DÉFAUT dans le dashboard (24h auto), lien permanent en secondaire
- ✅ Historique des liens rotatifs visible
- Commits : 0f6a6cf, ac1a7e4, a755ec9

### Noms liés aux codes badge (NOUVEAU — 16 juin)
- ✅ Helper centralisé : lib/format-certificate-label.ts
- ✅ formatCertificateLabel() → "Olivier BRNB (…db33)" avec tooltip code complet
- ✅ Appliqué dans : admin (certificats, clients, alertes, surveillance), agents fraude,
  dashboard user (activité récente), /verify, composants CertificateLabel/IdCell
- Commit : 44397ec

### Recette UX (16 juin — 7 commits)
- ✅ Landing : coquilles corrigées ("Une fausse version de vous", "Plus de 20 pays"), narration restructurée (menaces avant solution), 3ème couche (pas 4ème), tooltips termes techniques (TechTermTooltip : blockchain, Polygon, ES256, QR rotatif), wording B2C/B2B revu, prix renvoyé vers /pricing (plus de prix hardcodé)
- ✅ Pricing : harmonisation TTC/HT labels, cursor:pointer boutons, Enterprise "Contactez-nous" + email prérempli, bandeau B2B + FAQ bas de page retirés
- ✅ Auth : AuthMinimalHeader (logo+retour ←) sur /auth/signin, /auth/register, /verify
- ✅ Inscription : astérisques rouges champs obligatoires, hint MDP (12 car. + complexité — aligné API), bouton œil (Eye/EyeOff), layout compact
- ✅ UI : header sticky au scroll up, item actif cyan (usePathname), backdrop mobile, Connexion centrée
- ✅ Légal : mentions obligatoires footer (adresse BRNB TECH 17 bis Av. Franklin Roosevelt Vincennes, email, téléphone "à venir", RCS en cours, directeur publication Olivier Bernabé, hébergeur Vercel)
- ✅ Actualités : dates articles épinglés, tooltips ZATAZ/CERT-FR/pertinence

### Refonte landing complète (17-21 juin)
- ✅ Wording reformulé sans jargon : "BLOCKTRUST™ vérifie vos interactions avant que vous agissiez"
- ✅ Section BIS ajoutée : BisSection.tsx, "Signez et vérifiez chaque interaction"
- ✅ Fix mots orphelins : text-wrap: balance CSS, titres raccourcis, max-w-3xl/2xl
- ✅ Commits : 8b6e9af (wording), 995d6f3 (BIS), b36c1f7 (orphelins)

### Refonte pricing page (21 juin)
- ✅ Header sobre + toggle B2C/B2B + toggle Mensuel/Annuel (annuel par défaut, badge -20%)
- ✅ 4 cartes B2C allégées (Premium "Populaire") + 3 cartes B2B (Team "Populaire")
- ✅ CTAs checkout fonctionnels, Enterprise mailto prérempli
- ✅ Harmonisation TTC/HT, cursor:pointer, text-wrap: balance
- ✅ FAQ inline supprimée (renvoyée vers /faq)

### Tableau comparatif #compare (21 juin)
- ✅ lib/pricing-compare.ts : données B2C (4 plans) + B2B (3 plans), prix via getPlanPerMonthAmount
- ✅ PricingCompareTable.tsx : synchro toggle, header sticky, scroll mobile, colonne featured surlignée
- ✅ Fix headers garbled "Prée,996m" → fonds opaques sur headers sticky (commit 3ff010d)
- ✅ Lisibilité : lignes alternées, Minus visible, bordure cyan colonne featured

### FAQ B2C/B2B split (21 juin)
- ✅ Toggle Particuliers/Entreprises (PricingToggle réutilisé)
- ✅ B2C : 12 questions, 4 sections (Général, Sécurité, Mon compte, Contact)
- ✅ B2B : 10 questions, 3 sections (Général, Sécurité entreprise, Tarifs & intégration)
- ✅ Ancre #security-bis conservée, ?tab=entreprises et #b2b supportés
- ✅ Prix depuis lib/pricing.ts (Essentiel annuel, Starter/Team)
- Commit : f744798

### "Comment ça marche" vulgarisé (21 juin)
- ✅ Refonte complète (-794 lignes techniques)
- ✅ 4 étapes : Créez votre badge → Partagez et signez → Vérifiez vos contacts → Protégez-vous dans Gmail
- ✅ 4 cartes "Ce qui rend BLOCKTRUST™ unique" (blockchain, signature, réputation, Gmail)
- ✅ Lexique 7 termes en accordéon (Blockchain, Polygon, ES256, SHA-256, QR rotatif, TrustScore, BIS)
- ✅ TechTermTooltip enrichi avec nouvelles clés (sha256, trustscore, bis, cryptographique)
- ✅ CTA final "Commencer gratuitement"
- Commits : 1cf81ee, d9edf88

### Fix perf LCP (17 juin)
- ✅ 13→3 familles polices + 2 preloads woff2 (Inter 400/700, Space Grotesk 700) + font-display:swap
- ✅ 14 sections landing en lazy load (next/dynamic), BlockTrustBadge hero dynamic, CookieBanner différé
- ✅ optimizePackageImports lucide-react
- ✅ Browserslist moderne (Chrome/Firefox/Edge≥90, Safari≥15)
- ✅ LCP estimé : 4,5s → ~2-2,5s
- Commit : 215bfcd
- Lighthouse (17 juin) : Perf 83, Access 96, BP 92, SEO 100

### Audit sécurité n°3 (16-17 juin)
Lot 1 (commits bf734a5, f07f4d3, 59b1a38, 0d032a8) :
- ✅ H1 : admin unifié env (isDashboardAdmin via getAdminEmailList, fallback hardcodé dev)
- ✅ H2 : OAuth linking désactivé par défaut (allowDangerousEmailAccountLinking = opt-in)
- ✅ M5 : rate limit BIS verify 30/min + resolve-token 30/min (Upstash, IP hashée)
- ✅ P0-1 : npm test bloquant CI GitHub Actions
Variables Vercel ajoutées : ADMIN_EMAILS, INTERNAL_EMAILS, EXTENSION_ID (Production)

Lot 2 (commits 8c1fb23, 1c20e9a, bf5e1f2, e80be81) :
- ✅ M2 : EXTENSION_ID obligatoire en prod (403 sans, permissif en dev)
- ✅ M4 : fail-closed Redis endpoints publics coûteux (503 si Redis KO)
- ✅ M6 : proxy Edge /dashboard/* (redirect signin si pas de session)
- ✅ P1-1 : Prisma singleton assigné en prod
128 tests après lot 2.

Lot 3 (dette technique — APRÈS lancement) :
□ M1 Vault VIEWER RBAC, M3 CORS White Label, M7 verify-sender rate limit dédié
□ M8 SECURITY.md, P1-2 couverture tests, P1-3 Sentry, P1-4 Polygon queue
□ P2 factoriser 4 chemins verify, unifier 3 trust scores

### Juridique intégré
- ✅ CGU V2 intégrées dans /cgu (textes Laurianne + corrections : /tarifs→/pricing, contact@brnntech→blocktrust)
  CGU modifs Laurianne juin (5) : Trust Circle, Vaults+contacts, offres familiales, ancrage blockchain (horodatage/intégrité, aucun caractère officiel), disponibilité/maintenance, préavis→"délai raisonnable"
- ✅ CGV V2 intégrées dans /cgv
  CGV modifs Laurianne juin (11) : Trust Circle+Vaults dans services, offres familiales, capacités évolutives, prestataires paiement tiers, upgrade/downgrade, suspension Trust Circle/Vaults (usage abusif), remboursement→"sommes éligibles", responsabilité relations utilisateurs, données Vaults responsabilité utilisateur, préavis→"délai raisonnable"
- ✅ Politique de Confidentialité v2 complète (12 sections)
  Modifs juin (10+) : données B2B organisationnelles, Trust Circle+Vaults, ligne Vaults exécution contrat, TrustScore≠décision automatique art.22, Extension Chrome pas d'entraînement IA, Trust Circle+Vaults conservation 12 mois, Anthropic anonymisé, préférence sous-traitants UE, cookies pas de pub, droits renforcés (désactivation badge + suppression progressive), clause blockchain immuable
- ✅ DPIA Art.35 v1 + Registre Art.30 V2 + 2 SOP (Laurianne)
- ✅ DPA : tableau 11 sous-traitants créé (BLOCKTRUST_Suivi_Soustraitants_DPA_2.xlsx), liens vérifiés
  - 9 à récupérer : Stripe, Vercel, Neon, Resend, Upstash, Cloudflare, Anthropic API, Sentry, Alchemy
  - 2 cas particuliers : AbuseIPDB (responsable indépendant, documenter base légale), Google OAuth (responsable indépendant, couvrir via privacy policy)
  - Point RGPD Neon : WAL (Write-Ahead Log) peut retenir données après effacement art.17 — à valider avocat
  - Alchemy : enjeu RGPD faible (pas de PII users, seulement des hash)
  - DPA = document à RÉCUPÉRER chez chaque sous-traitant, pas à rédiger. Outils de dev (Claude/Cursor/terminal) ne sont PAS des sous-traitants RGPD.

### RGPD / Emails / Qualité
- ✅ BiometricConsentModal Art.9, CertifiedEmailFooter (18 templates)
- ✅ 113 tests vitest (~83% coverage), /status, Sentry crons
- ✅ /privacy complète, Vercel Analytics + Speed Insights, OG image + favicon, sitemap GSC indexé
- ✅ OpenTimestamp PI ancré Bitcoin (29 mai 2026, SHA256 002c0687, commit 9659c77) — preuve antériorité principale
- ✅ NOTICE + en-têtes copyright sur 20 fichiers cœur IP
- ✅ DNS Cloudflare configuré, www→apex 308

---

## 10. EXPERT STACK (Skills internes)

| Skill | Contenu |
|-------|---------|
| Trust_Engine (1074L) | Scoring, propagation, anti-Sybil, formule canonique |
| Threat_Model (591L) | Sybil, Insider, Prompt Injection, Reputation Collapse |
| Email_Verification (560L) | SPF/DKIM/DMARC/ARC + Mail Trust Flow |
| Legal_Compliance (525L) | RGPD, AI Act, eIDAS 2.0, DPA |
| Root_Of_Trust (472L) | Polygon, Trust Delegation, Account Recovery |
| Social_Media_Manager | Ton/audience/ratios 40-20-20-10-10, structure posts, garde-fous |
| Content_Calendar | Grille hebdo lundi→dimanche, rythme 90j, modes semaine/jour/mois |

+ UI_UX_Audit, Security Phase 1/2/3, Stripe, React_Email, Design_System, Chrome_Extension.

---

## 11. MARKETING / GTM — RÉSEAUX SOCIAUX

### Instagram @blocktrust (Business)
- Bio + logo + slogan, email contact@blocktrust.tech, lien bio → /verify. 2FA à activer (app, pas SMS).
- À réserver : LinkedIn / X / YouTube (même identité/bio).

### Charte réseaux sociaux
- Accents jaunes #f59e0b uniforme (slogans, intitulés, handle @blocktrust).
- Badge/logo source = #BDA76B. Contenu centré verticalement sur slides.
- Format Instagram : carrousel 1080×1350, vrai badge détouré, AUCUN emoji.

### Assets livrés
- 2 plaquettes B2B + B2C (PDF + HTML, pictos SVG sobres, vrai logo badge vectoriel, AUCUN emoji).
- 3 carrousels de lancement (6 slides chacun) : présentation/manifeste, faux email, immobilier.
- badge_logo.png (détouré transparent).

### Automatisation Instagram — n8n Niveau 2 (EN COURS)
```
Schedule 08h → Claude génère → Google Sheet "à valider"
→ Déborah valide → Meta Graph API → "publié"
RÈGLE : JAMAIS d'auto-publication sans statut "validé"
```
n8n Cloud créé (région UE Frankfurt, ~24$/mois). **Prérequis bloquant Meta :** Page Facebook BLOCKTRUST (Déborah) + app Meta Developers + permissions instagram_basic + instagram_content_publish + pages_read_engagement + token longue durée 60j + IG Business Account ID + hébergement image URL publique.

### Feature roadmap notée
Certification comptes sociaux (Instagram/LinkedIn/X) comme extension des contacts certifiés. Pas d'injection dans l'UI Instagram native (verrouillé Meta). Vérif handle par preuve de possession.

---

## 12. SCRIPTS COMMITÉS DANS LE REPO

```
scripts/apply-pooler-migrations.ts      → filet de sécurité décalage pooler/direct (commit 9c7adf4)
scripts/fix-admin-kyc.ts                → KYC VERIFIED pour les 9 emails internes (idempotent)
scripts/backfill-discovery-not-anchored.ts → nettoie hash Polygon sur certificats Découverte
scripts/create-blocktrust-entity.ts     → crée l'entité + certificat ambassadeur BLOCKTRUST™
scripts/bootstrap-all-admins.ts         → boucle 9 emails + ensureAdminCapabilities
```

Tables créées manuellement en prod (décalage pooler) :
```
InteractionSignature  → BIS Phase 1 (16 juin)
CertificateVerifyToken → Codes rotatifs (16 juin)
```

---

## 13. AVANCEMENT — 21 juin 2026
```
Technique core      ████████████████████  100%
Sécurité            ████████████████████   99%  (3 audits traités + BIS)
Produit/UX          ████████████████████   99%  (BIS Phase 1+2 + landing complète)
Extension Chrome    ████████████████████   99%  (v1.0.4 en review Google)
Extension Outlook   █████████████████░░░   85%  (Phase 1 déployée, AppSource à venir)
Trust Engine V2     ██████████████████░░   92%  (+signaux BIS)
Agents/Monitoring   ████████████████████  100%  (Vercel Pro, crons horaires)
Dashboard admin     ████████████████████  100%  (accès séparé, état connexion, ancrage)
Infrastructure      ████████████████████  100%  (bold-frost, Vercel Pro, CI verte + tests bloquants)
Tests               █████████████████░░░   83%  (128 tests)
Pricing/Freemium    ████████████████████  100%  (pricing + #compare + FAQ + rotatifs)
Legal/Compliance    ████████████████░░░░   85%
Marketing/GTM       █████████████████░░░   80%
Commercial          ████░░░░░░░░░░░░░░░░   20%

Score technique/produit : ~99%
Score commercial : 20%
```

---

## 14. TÂCHES RESTANTES

### PRIORITÉ 1 — Avant Stripe Live
```
□ 4 tests checkout Stripe mode Test (Essentiel, Famille+add-on, Team sièges, Découverte)
□ Attendre review Google extension v1.0.4 (soumise 17 juin, 3-7j)
□ TVA avec Laurianne → Stripe Tax
```

### PRIORITÉ 2 — Landing / UX (QUASI TERMINÉ)
```
✅ Pricing page (cartes allégées, toggle, TTC/HT)
✅ Tableau comparatif #compare (B2C 4 + B2B 3, fix headers)
✅ FAQ B2C/B2B split (22 questions, toggle)
✅ "Comment ça marche" vulgarisé (4 étapes + lexique)
✅ Section BIS landing
✅ Wording reformulé + mots orphelins
✅ Fix perf LCP
✅ Noms liés aux codes badge dans admin + alertes
✅ Codes rotatifs par défaut dans le dashboard
□ Onglet Verify intégré au Dashboard (cosmétique nav — optionnel)
```

### PRIORITÉ 3 — Juridique (Laurianne — BLOQUANT LIVE)
```
□ Création SAS + numéro TVA (statuts en cours de réception — imminent)
□ DPA : récupérer 9 contrats + confirmer 2 cas particuliers
□ Valider CGU/CGV final + politique rétractation/remboursement avec Laurianne
□ EUIPO avant octobre 2026 (~1200€)
□ Surveiller oppositions INPI → 22 juillet 2026
□ Contrat licence marque Olivier→SAS
□ Lot 4 RGPD : cron purge Vercel Blob (30j/3ans/7j), suppression self-service compte, cascade
```

### PRIORITÉ 4 — Marketing / GTM (Déborah)
```
□ Créer Page Facebook BLOCKTRUST + lier Instagram (débloque n8n)
□ Poster les 3 carrousels · assembler workflow n8n (après tokens Meta)
□ Plaquettes 4 cibles : immobilier, avocats, PME, cybersécurité
□ Script démo 120s : email → badge → verify → TrustScore → Polygon
□ Témoignages + chiffres réels sur landing
□ @blocktrust LinkedIn / X / YouTube
□ Réunion Déborah + Laurianne
```

### PRIORITÉ 5 — Commercial (APRÈS fondations — décision ferme Olivier)
```
□ Dépôt capital → Stripe Live → facturation réelle
□ 1er client B2B : fajaspao.com (refonte site + réseaux + optimisation commerciale)
□ Partenariats prescripteurs (SeLoger, Malt, LeBonCoin)
□ Stratégie = horizontale multi-secteurs, opportuniste
```

### PRIORITÉ 6 — Produit V2+
```
□ BIS Phase 3 : détection actions sensibles (Niveau 4 : RIB, contrat, virement)
□ Extension Outlook Phase 2 : LaunchEvent auto + notification barre info
□ Extension Outlook Phase 3 : signature BIS sortante dans le composeur
□ Publication Microsoft AppSource (Outlook)
□ App mobile + NFC (badge NFC + vérification native)
□ BIMI (logotype certifié en-tête email)
□ Certification comptes sociaux (Instagram/LinkedIn/X via lien bio → /verify)
□ Trust Graph propagation avancée + endorsements (réputation comportementale réseau)
```

### PRIORITÉ 7 — Sécurité avancée (chantiers dédiés futurs)
```
□ Audit 3 Lot 3 : dette technique (M1 RBAC Vault, M3 CORS White Label, P2 factoriser verify)
□ CSP nonces · WAF Cloudflare Pro
□ DPA AbuseIPDB (Laurianne, registre traitements)
□ Surveiller patch ethers (ws ≥ 8.21)
□ Pentest externe (Synacktiv/Quarkslab) → ISO 27001
□ AWS KMS (migration JWT) · Bug bounty YesWeHack
□ Neon IP Allowlist (activer quand premiers revenus)
□ Neon Scale (base ne dort jamais)
□ Monitoring Sentry complet · logs structurés sans données sensibles
```

### Ancrage Polygon du code (PARKÉ)
```
Route /api/admin/anchor-codebase créée, PARKÉE — 403 persistant.
Cause probable : cookie NextAuth chunké .0/.1 ou secret.
NON urgent. À reprendre EN DERNIER après ajout d'un message d'erreur explicite.
OpenTimestamp du 29 mai = preuve d'antériorité principale suffisante.
```

---

## 15. LES 3 VRAIS BLOCAGES AVANT LANCEMENT
```
1. SAS + numéro TVA — verrou principal (statuts en cours de réception — imminent)
   Séquence : dépôt capital → TVA → compte bancaire Stripe → Stripe Live
2. Juridique — DPA à récupérer chez 9 sous-traitants, valider CGU/CGV final Laurianne
3. Validation des flux — 4 tests checkout mode Test
```
Le commercial (1er client B2B fajaspao.com) vient APRÈS ces fondations (décision ferme d'Olivier).

---

## 16. RÉPARTITION DU TRAVAIL (RÈGLE ABSOLUE)
```
Claude.ai    = atelier amont (assets, images, PDF/docx/xlsx, diagrammes, analyse CSV,
               prototypage logique, prompts Cursor, docs réunion, knowledge base, mémoire projet)
Cursor       = implémentation repo réel + git + déploiement (Fable 5 recommandé pour tâches complexes)
Terminal Mac = git / npm / vercel / prisma

Règle : fichier/contenu → Claude ; code prod → Cursor. Claude ne touche pas au repo/Vercel/Neon.
Quand Olivier signale un manque → générer le prompt Cursor immédiatement sans attendre validation.
Pas de 3ème IA (risque de dispersion / versions divergentes).

Règle de clôture : knowledge .md téléchargeable (via present_files) après chaque session.
Règle process : ne jamais modifier l'existant si la consigne est de compléter.
Règle landing : "COMPLÉTER pas MODIFIER" — slogan INTOUCHABLE.
```

---

## 17. ACCÈS
| Ressource | Info |
|-----------|------|
| Production | https://blocktrust.tech |
| Admin | /admin/dashboard (isDashboardAdmin, 4 emails) |
| BIS | /dashboard/bis + /verify/bis/[id] |
| Extension Chrome | /dashboard/extension |
| Extension Outlook | /outlook/taskpane (sideload via manifest.json) |
| Badge ambassadeur | footer toutes pages → /verify?certId=cmqgsdnik0005jo0414m07afq |
| GitHub | github.com/brnbtech770/blocktrust (dossier local : blocktrust-mvp) |
| Vercel | blocktrust-mvp (Pro) |
| Neon | console.neon.tech → vercel-dev (bold-frost) |
| Stripe | dashboard.stripe.com (mode Test, Live bloqué SAS) |
| Upstash | console.upstash.com |
| Sentry | sentry.io → brnb-tech |
| n8n | Cloud (compte créé, région UE Frankfurt) |
| Instagram | @blocktrust (Business, contact@blocktrust.tech) |
| INPI | n°5253718 |
| DPO / Sécurité | privacy@ · security@blocktrust.tech |
| Chrome Web Store | https://chromewebstore.google.com/detail/bemcnlbifffejlijnndkdgcjpmijfaeg |
| Dev port | 3004 (local) |

---

*Mis à jour le 21 juin 2026 — v19 COMPLÈTE*
*Consolide v18 + BIS Phase 2 + Extension Outlook Phase 1 + Landing complète (pricing/FAQ/#compare/how-to) + Codes rotatifs + Noms badges + Audit 3 (2 lots) + Fix perf LCP + Adresse siège*
*Règle de clôture : uploader dans Project Knowledge + commit docs/ après chaque session.*
