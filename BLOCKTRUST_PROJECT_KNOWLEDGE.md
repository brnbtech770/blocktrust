# BlockTrust — Document de Référence Projet

**Version:** 9.0 final  
**Date:** 7 mai 2026  
**Auteur:** Olivier Bernabé (BRNB TECH SAS)  
**Statut:** Production live — Technique 100% — Score 9.5/10

---

## 1. VISION & POSITIONNEMENT

### Headlines validées
> "L'identité numérique qui protège vos échanges." ✅ (H1)
> "La preuve que c'est vous. La certitude que c'est eux." ✅ (sous-titre cyan/gold)

### Logique produit — La règle d'or
> "BLOCKTRUST prouve que tu es bien toi quand tu envoies quelque chose, et vérifie que l'autre est bien lui quand tu reçois quelque chose."

### Double dimension — Règle absolue
- **Émission :** prouver que c'est bien VOUS qui envoyez
- **Réception :** détecter que l'autre est bien qui il prétend être

---

## 2. LOGIQUE PRODUIT COMPLÈTE

### Le badge
- Carte d'identité numérique infalsifiable
- KYC obligatoire (pièce d'identité + selfie)
- Certificat cryptographique ES256 + SHA-256
- Ancrage blockchain Polygon Mainnet
- QR code rotatif (invalide après chaque scan)
- Lien de vérification permanent (/verify?certId=)

### Les contacts
- Personnes/entreprises dont l'utilisateur a enregistré l'identité officielle
- Domaines certifiés, emails certifiés, téléphones certifiés, wallet crypto
- **Règle clé :** BLOCKTRUST ne protège que contre les identités enregistrées
- Plus de contacts enregistrés = plus de protection

### La vérification — 2 niveaux
**Niveau 1 — Public gratuit (/verify)**
- Sans compte, sans abonnement
- Verdict : VALIDE / INVALIDE / FRAUDE
- Nom + date certification

**Niveau 2 — Abonné (/verify/[id])**
- Contexte personnalisé selon ses contacts
- Trust Circle Cas 1/2/3/4
- TrustScore, Polygon, Hash SHA-256

### Les 4 situations de vérification

| Situation | Condition | Résultat |
|-----------|-----------|---------|
| **A** | Badge reçu — inconnu non dans contacts | ℹ️ Identité vérifiée — inconnu certifié |
| **B** | Contact enregistré SANS badge — discordance domaine | ⚠️ Orange — suspicion |
| **C** | Contact enregistré AVEC badge — match parfait | ✅ Confiance totale certifiée |
| **D** | Contact enregistré AVEC badge — mismatch | 🚨 FRAUDE CERTAINE |

### Limites documentées (CGU)
1. **Boîte mail piratée** → badge valide mais pas l'émetteur → révoquer immédiatement
2. **Badge apposé sur mail non officiel** → badge valide mais domaine différent → détectable si contact enregistré
3. **Faux badge similaire** → vrai KYC mais nom similaire → TrustScore bas, KYC tracé
4. **Lien certId exposé** → permanent mais affiche toujours le vrai propriétaire
5. **BLOCKTRUST ne lit pas les emails** → protection manuelle aujourd'hui, automatique avec l'extension Chrome

### Protection par canal
| Canal | Aujourd'hui | Avec Extension Chrome |
|-------|-------------|----------------------|
| Badge scanné manuellement | ✅ | ✅ |
| Email avec lien badge | ✅ Si clic | ✅ Auto |
| Email sans badge | ❌ | ✅ Auto |
| Appel téléphonique | ❌ | ✅ App mobile (futur) |
| SMS | ❌ | ✅ App mobile (futur) |

---

## 3. TRUST CIRCLE & TRUSTSCORE

### Trust Circle
- **Contacts sans badge** → Protection B (suspicion domaine)
- **Contacts avec badge** → Protection C/D (certitude cryptographique)
- Pas d'étape supplémentaire — automatique si contact a un badge

### TrustScore — Algorithme
**Départ : 50/100 dès création badge (KYC validé)**

**Monte avec :**
- Ancienneté sans incident (temps)
- Relations MUTUAL actives
- Complétude profil (domaines, emails, wallet)
- Activité (certificats utilisés)

**Baisse avec :**
- FRAUD_ALERT non traité rapidement
- Inactivité > 6 mois
- Relations MUTUAL rompues

**Suspendu (pas perdu) si :**
- Abonnement annulé/expiré → reprend à resouscription

**Réinitialisé si :**
- Fraude avérée confirmée admin
- Suppression volontaire du compte

**Niveaux :**
```
90-100 → Identité établie, réseau actif, aucun incident
70-89  → Identité fiable, réseau en construction
50-69  → Nouveau compte ou peu actif
< 50   → Incident détecté ou inactivité
```

---

## 4. PRICING FINAL

### B2C (TTC) — Vérifications illimitées*
| Plan | Prix/mois | Profils | Contacts |
|------|-----------|---------|----------|
| Essentiel | **3,99€** | 1 | 20 |
| Premium | 9,99€ | 1 | 100 |
| Famille | 14,99€ | 5 | 100 |
| Famille+ | 24,99€ | 10 | 300 |

### B2B (HT + TVA 20%) — Vérifications illimitées*
| Plan | Prix/user/mois | Users | Contacts/user |
|------|---------------|-------|---------------|
| Solo Pro | 9,99€ | 1 | 100 |
| Starter | 8,99€ | 2-5 | 100/user |
| Team | 7,99€ | 6-15 | 200/user |
| Business | 5,99€ | 16-50 | 500/user |
| Enterprise | Sur devis | 51+ | Illimité |

**\* Vérifications illimitées pendant 6 mois (période de lancement)**
**Toggle annuel : -20% sur tous les plans**
**Mention : "Sans engagement · Résiliable à tout moment"**

### Packages vérifications (après lancement)
| Pack | Prix | Vérifs |
|------|------|--------|
| Pack S | 1,99€ | +20 |
| Pack M | 4,99€ | +100 |
| Pack L | 9,99€ | +300 |
| Pack XL | 19,99€ | +1000 |

### Price IDs Stripe à créer
- Solo Pro mensuel : 9,99€ → `STRIPE_PRICE_SOLO_PRO_MONTHLY`
- Solo Pro annuel : 95,90€ → `STRIPE_PRICE_SOLO_PRO_YEARLY`
- Mettre à jour Starter/Team/Business prix dégressifs
- Activer Stripe Tax (TVA automatique)

---

## 5. STACK TECHNIQUE

```
Framework    : Next.js 16.2.4 (App Router + Webpack)
Language     : TypeScript (strict)
Style        : TailwindCSS
Auth         : NextAuth v5
ORM          : Prisma 5 (v6.19.3)
DB           : PostgreSQL via Neon (plan Free)
Paiements    : Stripe (subscriptions + Stripe Identity)
Emails       : Resend (SPF/DKIM/DMARC configurés)
Storage      : Vercel Blob
JWT          : jose (ES256 / RS256)
Blockchain   : Polygon Mainnet (Chain ID 137) via Alchemy
Rate Limit   : Upstash Redis + in-memory fallback
Surveillance : QStash (5 min) + événementiel
Monitoring   : Sentry (production)
WAF          : Cloudflare (Bot Fight + SSL Full Strict)
IA Veille    : Claude Haiku 4.5 (Anthropic API)
CI/CD        : GitHub Actions (Dependabot + npm audit)
Déploiement  : Vercel (Hobby)
Repo         : github.com/brnbtech770/blocktrust
```

---

## 6. FONCTIONNALITÉS EN PRODUCTION

### Features livrées cette session
- ✅ Wallet crypto (walletAddress + walletNetwork)
- ✅ Domaines + emails + téléphones certifiés
- ✅ TagInput composant réutilisable
- ✅ Alerte site miroir sur /verify/[id]
- ✅ "Résiliable à tout moment" partout
- ✅ SEO meta description FR
- ✅ Accordion /pricing détail par plan
- ✅ Articles épinglés /menaces (Kratos + FNC-RF)
- ✅ Pricing B2C 3,99€ + Solo Pro + dégressif B2B
- ✅ Vérifications illimitées 6 mois lancement
- ✅ API extension Chrome (4 endpoints)
- ✅ Clé API extension dans dashboard settings
- ✅ Extension Chrome TrustScan V1 (structure + Gmail)

### Extension Chrome TrustScan
```
Dossier : extension/ (à la racine du projet)
Manifest V3
Content script : Gmail (MutationObserver)
Popup : connexion clé API + état compte
API endpoints :
  GET /api/extension/verify-sender
  POST /api/extension/add-contact
  GET /api/extension/me
  GET /api/extension/api-key

Statuts affichés :
  CERTIFIED → vert #10b981
  IN_CONTACTS → cyan #00d4ff
  FRAUD → rouge #ef4444
  UNKNOWN → blanc/40

Test : chrome://extensions → Mode développeur
       → Charger extension/ → Gmail
```

### Emails — État actuel
- Lien de vérification présent dans les emails ✅
- Format actuel : `/verify/${certificateId}` (connecté)
- **À corriger :** → `/verify?certId=` (public sans compte)

### Landing Page (ordre sections)
1. Navbar (BLOCKTRUST™, Vérifier, Actualités)
2. Hero
3. Problem (4 cards)
4. QuickUnderstand (3 cas concrets)
5. Categories
6. ThreatAlert (menaces permanentes)
7. Solution
8. Particuliers (4 cards)
9. Entreprises (5 cards)
10. Integration
11. PricingTeaser
12. FinalCTA
13. Footer

---

## 7. SÉCURITÉ — ÉTAT COMPLET

### Phase 1 + 2 complètes ✅
- OWASP IDOR, Mass Assignment, XSS
- Zod strict 32 routes
- timingSafeEqual partout
- Rate limit magic link 3/h (incident 06/05)
- SPF/DKIM/DMARC OVH + Resend
- Cloudflare Bot Fight + SSL Full Strict
- Dependabot + npm audit CI
- RGPD cascade delete + data minimization
- QR Token entropy 256 bits
- Stripe webhook idempotence Redis
- CSP + HSTS + Security Headers

### Incident traité
- **06/05/2026** — Spam magic link (korper.nl, databreaches.net)
- Rate limit déployé en urgence
- 3 comptes suspects supprimés dont bot confirmé

### Reste à faire
| Action | Priorité |
|--------|----------|
| Cloudflare Pro (WAF rate limiting) | 🔴 Avant grands comptes |
| Pentest externe (3-8k€) | 🔴 Avant grands comptes |
| AWS KMS JWT + Polygon keys | 🟡 |
| Neon IP Allowlist | 🟡 Dès premiers revenus |
| SOPs incident response | 🔴 Laurianne |

---

## 8. OUTILS & UPGRADES

| Outil | Plan actuel | Upgrade quand | Coût |
|-------|------------|---------------|------|
| Vercel | Hobby | Dès premiers clients | 20$/mois |
| Cloudflare | Free | Avant grands comptes | 20$/mois |
| Resend | Free (100/jour) | Dès > 100 emails/jour | 20$/mois |
| Neon | Free | Dès premiers revenus | ~15$/mois |
| Upstash | Free | Dès > 1000 users | ~10$/mois |
| Sentry | Free | Production critique | 26$/mois |
| Chrome Web Store | - | Publication extension | 5$ unique |

---

## 9. AVANCEMENT — 7 MAI 2026

```
Technique        ████████████████████  100% ✅
Sécurité         ███████████████████░   95%
Produit/UX       █████████████████████   97%
Extension Chrome ███████░░░░░░░░░░░░░   35%
Marketing        ████████████████░░░░   80%
Juridique        ████████████░░░░░░░░   62%
Commercial       ████░░░░░░░░░░░░░░░░   20%

GLOBAL           █████████████████░░░   87%
```

**Score qualitatif : 9.5/10**

---

## 10. CHANTIERS RESTANTS

### 🔴 DEMAIN — Technique
- [ ] Stripe Price IDs Solo Pro + B2B dégressif
- [ ] Stripe Tax activer
- [ ] Tester extension Chrome sur Gmail
- [ ] Fix emails verifyUrl → /verify?certId= public
- [ ] Fix badge dashboard (mal proportionné)
- [ ] Compteur de clics sur lien certId
- [ ] Boutons admin AIAlert (actions serveur)
- [ ] Onboarding — expliquer pourquoi enregistrer contacts

### 🔴 COMMERCIAL
- [ ] RDV Koray semaine prochaine
- [ ] RDV Adenis en attente
- [ ] Plaquette B2B (Deborah)
- [ ] 1er client B2B signé

### 🔴 JURIDIQUE (Laurianne)
- [ ] CGU "certifié" + "alerte immédiate"
- [ ] CGU limite boîte mail piratée
- [ ] CGU badge sur mail non officiel
- [ ] CGU badge similaire frauduleux
- [ ] TrustScore RGPD (droit rectification)
- [ ] SOPs incident response + RGPD breach
- [ ] EUIPO Europe avant octobre 2026
- [ ] Création HOLDING + SAS + Qonto

### 🟡 EXTENSION CHROME
- [ ] Icônes réelles (remplacer PNG placeholders)
- [ ] Test complet Gmail
- [ ] Compte Chrome Web Store (5$)
- [ ] Publication Chrome Web Store

### 🔵 LONG TERME
- App mobile + NFC (6-12 mois)
- SSO / SAML + SCIM Enterprise
- ISO 27001
- Bug bounty YesWeHack

---

## 11. SKILLS DANS PROJECT KNOWLEDGE

| Fichier | Contenu | Statut |
|---------|---------|--------|
| BLOCKTRUST_Security_Skills_Phase1.md | OWASP, RGPD, JWT, Rate Limiting | ✅ Uploadé |
| BLOCKTRUST_Security_Skills_Phase2.md | WAF, DNS, Supply Chain, Blockchain | ✅ Uploadé |
| BLOCKTRUST_Security_Skills_Phase3_Vulnerabilities.md | Pentest, SOC, ISO 27001 | ✅ Uploadé |
| BLOCKTRUST_UI_UX_Audit_Skill.md | Checklist UI/UX complète | 🔴 À uploader |
| .cursorrules | Contexte complet Cursor (538 lignes) | ✅ Dans le repo |

---

## 12. RÈGLES ABSOLUES

```
PrismaClient → @/app/lib/db
userId → session.user.id uniquement
Burn address → 0x000000000000000000000000000000000000dEaD
POLYGON_PRIVATE_KEY → jamais loggée
"KYC" → jamais visible utilisateur
"entité" → "contact" côté utilisateur
BLOCKTRUST™ → majuscules toujours
Turbopack → DÉSACTIVÉ (--webpack)
timingSafeEqual → toute comparaison de secrets
Icônes → lucide-react uniquement (jamais d'emojis)
Emails verifyUrl → /verify?certId= (public)
Badge dashboard → proportionné selon la charte
```

---

## 13. ACCÈS

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
| INPI | n°5253718 — 30/04/2026 |
| Support | support@blocktrust.tech |
| Commercial | commercial@blocktrust.tech |
| Sécurité | security@blocktrust.tech |

---

*Mis à jour le 7 mai 2026 — Session Claude*
*Milestones : Identité numérique complète + Extension Chrome V1 + Pricing final + Logique produit clarifiée*
*Règle absolue : uploader dans Project Knowledge + commit GitHub après chaque session*
