# BlockTrust — Document de Référence Projet

**Version:** 7.0 final  
**Date:** 30 avril 2026  
**Auteur:** Olivier Bernabé (BRNB TECH SAS)  
**Statut:** Production live — 100% technique — Score 8.5/10

---

## 1. VISION & POSITIONNEMENT

### Headlines validées (Deborah + Laurianne)
> "La preuve que c'est vous. La certitude que c'est eux." ✅

### Hero actuel
- **Pill :** ✦ Certifié ✦ Protégé ✦ Infalsifiable (sans points séparateurs)
- **H1 :** "La carte d'identité numérique de tout ce que vous envoyez."
- **Sous-titre :** "La preuve que c'est vous. La certitude que c'est eux." (cyan/gold)
- **CTA :** "Certifier mon identité" + "Inscription en 30 secondes — certification après abonnement"
- **Stats :** Infalsifiable / Anti-usurpation / On-chain

### Positionnement — La 4ème couche
| Solution | Ce qu'elle fait | Ce qu'elle NE fait PAS |
|----------|----------------|----------------------|
| Antivirus | Protège la machine | Ne prouve pas qui vous êtes |
| France Identité | Prouve votre identité à l'État | Ne prouve pas aux autres |
| Équipe IT interne | Sécurise le SI entreprise | Ne certifie pas l'identité externe |
| **BLOCKTRUST** | **Certifie votre identité + protège les menaces entrantes** | Complémentaire |

### Double dimension — Règle absolue
- **Émission :** prouver que c'est bien VOUS qui envoyez
- **Réception :** détecter que l'autre est bien qui il prétend être

### Équipe (BRNB TECH SAS — transformation en cours)
| Nom | Rôle | Capital |
|-----|------|---------|
| Olivier Bernabé | CEO / Fondateur | 50% (via BERNABÉ HOLDING SASU) |
| Shaï Bernabé | Data / IA | 20% (nom propre) |
| Déborah Bernabé épouse Slama | Marketing | 15% (nom propre) |
| Laurianne Winter | DAF & Chef de projet | 15% (nom propre) |

**Structure juridique en cours :**
- BERNABÉ HOLDING SASU (100€ capital, Olivier 100%)
- BRNB TECH SAS (1 000€ capital, 4 associés)
- Les deux créées simultanément — juriste en charge
- Banque : Qonto | APE : 6201Z
- Contrat de licence marque BLOCKTRUST (Olivier → SAS) à prévoir

---

## 2. PROPRIÉTÉ INTELLECTUELLE

### Marque BLOCKTRUST
- **Numéro INPI :** 5253718
- **Date de dépôt :** 30 avril 2026
- **Lieu :** INPI en ligne (92)
- **Type :** Marque française — verbale
- **Déposant :** Olivier Bernabé (nom propre)
- **Classes :** 35, 38, 42, 45
- **Symbole :** BLOCKTRUST™ (™ dans navbar + footer)
- **EUIPO Europe :** à déposer dans 6 mois max (priorité unioniste)
- **BLOCKTRUST SEAL :** à étudier ultérieurement

### Protection de la technologie
- Code source → droit d'auteur automatique
- Architecture → secret des affaires (NDA)
- Données → droit sui generis base de données

---

## 3. STACK TECHNIQUE

```
Framework    : Next.js 16.2.x (App Router) — package.json
Language     : TypeScript (strict)
Style        : TailwindCSS
Auth         : NextAuth v5
ORM          : Prisma 6 (@prisma/client 6.19.x) + prisma.config.ts
DB           : PostgreSQL via Neon
Paiements    : Stripe (subscriptions + Stripe Identity)
Emails       : Resend (domaine blocktrust.tech vérifié)
Storage      : Vercel Blob (blocktrust-blob, IAD1, Private)
JWT          : jose (ES256 / RS256)
Blockchain   : Polygon Mainnet (Chain ID 137) via Alchemy
Rate Limiting: Upstash Redis (distribué) + in-memory fallback
Monitoring   : Sentry (@sentry/nextjs — production uniquement)
Proxy        : proxy.ts (migré depuis middleware.ts Next.js 16)
Déploiement  : Vercel (plan Hobby)
Repo         : github.com/brnbtech770/blocktrust
```

### Charte graphique
```
#0a1628 navy | #00d4ff cyan | #BDA76B gold | #E05252 rouge
BLOCKTRUST™ = toujours majuscules
KYC = jargon interne (jamais visible utilisateur)
"contact/contacts" = remplace "entité/entités" côté utilisateur
```

### Imports critiques
```typescript
import { prisma } from '@/app/lib/db'
import { auth } from '@/app/lib/auth-server'
// AccountType : PERSONAL / BUSINESS
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

### B2B (pricing dégressif par user — à implémenter)
| Plan | Prix/mois | Users | Vérifs/mois | White Label |
|------|-----------|-------|-------------|-------------|
| Starter | 29€ | 3 | 200 | ✅ |
| Team | 79€ | 10 | 500 | ✅ |
| Business | 199€ | 50 | Illimité | ✅ |
| Enterprise | Sur devis | Illimité | Illimité | ✅ |

**Pricing dégressif validé Deborah/Laurianne :**
- 1-3 users : 9,99€/user
- 4-10 users : 7,99€/user
- 11-50 users : 5,99€/user
- 50+ : Enterprise sur devis
*(à implémenter dans Stripe — tranches à finaliser)*

**Toggle annuel : -20% engagement annuel**

---

## 5. FONCTIONNALITÉS EN PRODUCTION

### Auth & Sécurité
- Google OAuth, Email/Password, Magic Link
- Proxy Edge (proxy.ts — Next.js 16)
- Upstash Redis rate limiting distribué
- Sentry monitoring production

### Paiement & KYC
- Stripe checkout B2C + B2B (14 Price IDs)
- Stripe Identity — "Vérification d'identité" côté utilisateur
- INSEE API Sirene 3.11 (SIRET B2B)

### Certificats & Cryptographie
- Signatures ES256 + SHA-256
- QR code rotatif dynamique

### Blockchain Polygon Mainnet RÉEL ✅
- Burn address `0x000000000000000000000000000000000000dEaD`
- Wallet `BlockTrust Anchor` (~122 POL)
- Ancrage auto + retry + email confirmation PolygonScan

### Landing Page (état 30/04/2026)
**Ordre des sections :**
1. Navbar (BLOCKTRUST™, CTA "Certifier mon identité")
2. Hero (pill ✦ Certifié ✦ Protégé ✦ Infalsifiable, sous-titre cyan/gold)
3. Problem (4 cards dont "Un faux vous circule déjà" rouge)
4. QuickUnderstand (3 cas concrets : RIB / Email frauduleux typosquatting / Nouveau fournisseur)
5. Categories (anti-objection antivirus — 3 cartes hiérarchisées)
6. Solution (3 étapes + alerte usurpation identité)
7. Particuliers (4 cards dont protection menaces entrantes)
8. Entreprises (5 cards dont Trust Circle B2B + Network / partenaires certifiés)
9. Integration (4 tabs)
10. PricingTeaser ("À partir de 4,99€" + "badge inclus sans frais cachés")
11. FinalCTA
12. Footer (BLOCKTRUST™, CGU ✅ /cgu, Confidentialité ✅ /privacy, LinkedIn)

**Onboarding (4 interventions) :**
- QuickUnderstand : 3 cas concrets avec icônes Lucide charte
- /pricing : badge inclus sans frais cachés
- /auth/register : 3 étapes avant formulaire
- Dashboard : guide dynamique PAR OÙ COMMENCER (si 0 certificat) — lien étape 3 → /dashboard/certificates

### Effets visuels
- Halos néon CSS (text-shadow) sur labels de section
- Fond quadrillé supprimé
- Icônes Lucide uniquement (pas d'emojis dans QuickUnderstand)

### Emails (9 templates Resend)
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

---

## 6. ROADMAP TRUST CIRCLE — CAS 1 / CAS 2

### Cas 1 — Partenaire SANS badge
→ Alerte orange : "⚠️ Ce contact ne fait pas partie de votre réseau certifié."

### Cas 2 — Partenaire AVEC badge
→ Alerte rouge : "🚨 FRAUDE DÉTECTÉE — identité ne correspond pas."

### Priorité
| Feature | Effort |
|---------|--------|
| Enrichir /verify logique Cas 1/2 | 2 jours |
| Alertes dashboard Trust Circle | 3 jours |
| Extension Chrome TrustScan | 2-3 mois |
| Plugin email Outlook/Gmail | 2-3 mois |

---

## 7. FEEDBACKS RÉSEAU

### F_44_FREELANCE Jessica → corrigés ✅
### H_39_Entrepreneur → corrigés ✅
### H_65_PDG
- Objection "équipe IT" → à traiter dans plaquette B2B
- Pricing trop cher → débat en cours

### FEEDBACKS_BOARD Laurianne/Deborah → corrigés ✅
- Headline validée, "Ancré"→"Protégé", "entité"→"contact"
- Pricing dégressif → à implémenter

---

## 8. STRATÉGIE COMMERCIALE

### Pivot stratégique (validé 28/04)
**Cibles prioritaires :** grandes entreprises + banques + organismes publics
Particuliers en second — réseaux sociaux après INPI + SAS

### Objections préparées
| Objection | Réponse |
|-----------|---------|
| "On a déjà un antivirus" | BLOCKTRUST certifie l'identité externe |
| "On a déjà une équipe IT" | IT = sécurité interne, BLOCKTRUST = identité externe |
| "C'est trop cher" | 1 fraude évitée > 12 mois d'abonnement |
| "Mes clients ne connaissent pas BLOCKTRUST" | Premier dans votre réseau = avantage concurrentiel |

### Leviers actifs
- Agence immo Olivier (dogfood)
- Koray (connecteur banques/crypto)
- Juriste/formaliste (client direct + prescripteur)
- Réseaux sociaux → après INPI ✅ + SAS officielle

---

## 9. VARIABLES VERCEL (toutes configurées)

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
| POLYGON_RPC_URL | ✅ Alchemy Mainnet |
| POLYGON_CHAIN_ID | ✅ 137 |
| POLYGON_PRIVATE_KEY | ✅ Sensitive |
| POLYGON_CONTRACT_ADDRESS | ✅ burn address |
| UPSTASH_REDIS_REST_URL/TOKEN | ✅ Sensitive |
| NEXT_PUBLIC_SENTRY_DSN | ✅ |
| SENTRY_AUTH_TOKEN | ✅ Sensitive |

---

## 10. SUPPORTS & OUTILS

| Outil | Usage |
|-------|-------|
| Cursor (Composer) | IDE principal |
| GitHub brnbtech770/blocktrust | Versioning |
| Vercel | Déploiement auto |
| Neon PostgreSQL | Base de données |
| Prisma | ORM |
| Vercel Blob | Storage documents |
| Stripe + Stripe Identity | Paiements + KYC |
| INSEE API Sirene 3.11 | Vérification SIRET |
| NextAuth v5 | Auth multi-provider |
| Upstash Redis | Rate limiting |
| Sentry | Monitoring prod |
| Polygon + Alchemy | Blockchain |
| MetaMask | Wallet anchor |
| Resend + React Email | Emails transactionnels |
| Lovable | Prototype référence |
| Google Drive | Docs équipe |
| INPI | Marque déposée ✅ |
| Qonto | Banque (à ouvrir) |

---

## 11. CHANTIERS RESTANTS

### 🔴 Commercial
- [ ] 1er client B2B signé (priorité absolue)
- [ ] Appel Koray
- [ ] Plaquette B2B (Deborah)
- [ ] Réponse objection "équipe IT" dans plaquette

### 🔴 Juridique
- [ ] Création BERNABÉ HOLDING SASU + BRNB TECH SAS
- [ ] Ouverture Qonto (2 comptes)
- [ ] Contrat de licence marque Olivier → SAS
- [ ] EUIPO Europe (dans 6 mois max — priorité unioniste)
- [ ] DPIA + avocat
- [ ] CGU/CGV + avocat
- [ ] SOPs incident response + RGPD

### 🟡 Produit
- [ ] Pricing B2B dégressif par user (Stripe)
- [ ] Accordion détail par plan /pricing
- [ ] Trust Circle Cas 1/Cas 2 sur /verify
- [ ] Témoignages + chiffres réels landing
- [ ] SASU → SAS dans le code (après immatriculation)

### 🔵 Long terme
- Extension Chrome TrustScan
- Plugin email Outlook/Gmail
- App mobile + NFC
- SSO / SAML + SCIM Enterprise
- WAF Cloudflare + pentest
- ISO 27001

---

## 12. OBJECTIFS 9-10/10

Score actuel : **8.5/10**

| Action | Impact |
|--------|--------|
| 1 client B2B signé | +++++ |
| Témoignages réels | +++ |
| DPIA + SOPs + EUIPO | ++ |
| Trust Circle Cas 1/2 | +++ |
| Extension Chrome | ++ |
| Partenariats prescripteurs | +++++ |

---

## 13. RÈGLES ABSOLUES

- PrismaClient → `@/app/lib/db`
- userId → `session.user.id` uniquement
- Burn address pour ancrage Polygon
- POLYGON_PRIVATE_KEY jamais loggée
- "KYC" jamais visible utilisateur
- "entité" → "contact" côté utilisateur
- Silver/bronze/gold supprimés
- BLOCKTRUST™ = majuscules toujours

---

## 14. DOCUMENTS PRODUITS

| Document | Contenu |
|----------|---------|
| BLOCKTRUST_PROJECT_KNOWLEDGE.md | Ce fichier (référence repo) |
| BLOCKTRUST_Plan_Juridique_Laurianne.docx | DPIA + ISO + CGU |
| BLOCKTRUST_Depot_Marque_INPI.docx | Dossier dépôt INPI |
| BLOCKTRUST_Plan_Commercial_Deborah_Laurianne.docx | Plan 4 semaines |
| BLOCKTRUST_Messaging_Domaines_Intervention.docx | Messaging B2C/B2B |
| BLOCKTRUST_Roadmap_TrustCircle_Alertes.md | Feature Cas 1/Cas 2 |

---

## 15. ACCÈS

| Ressource | Info |
|-----------|------|
| Production | https://blocktrust.tech |
| Admin | https://blocktrust.tech/admin/dashboard |
| GitHub | github.com/brnbtech770/blocktrust |
| Vercel | vercel.com → blocktrust-mvp |
| Alchemy | dashboard.alchemy.com |
| Upstash | console.upstash.com |
| Sentry | sentry.io → brnb-tech/javascript-nextjs |
| PolygonScan | polygonscan.com |
| INPI | depot.inpi.fr (marque n°5253718 déposée) |
| Support | support@blocktrust.tech |
| Commercial | commercial@blocktrust.tech |

---

### Page /how-to — Vérification

- Sous-titre gold (desktop single line) sous « Comment fonctionne la vérification ? » :  
  *De l'émetteur au verdict — chaque étape est cryptographique, traçable et ancrée sur Polygon.*

---

*Mis à jour le 30 avril 2026 — Session Claude*  
*Milestones : INPI n°5253718 ✅ + Technique 100% + Onboarding + Protection menaces entrantes*  
*Règle absolue : ce fichier est mis à jour après chaque session*  
*→ Uploader dans Project Knowledge Claude + commit GitHub*
