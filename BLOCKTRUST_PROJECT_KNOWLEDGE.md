# BlockTrust — Document de Référence Projet

**Version:** 5.0  
**Date:** 27 avril 2026  
**Auteur:** Olivier Bernabé (BRNB TECH SASU)  
**Statut:** Production live — 98% d'avancement

---

## 1. VISION & POSITIONNEMENT

### Message central
> "Protégez chaque interaction de votre écosystème digital"

BlockTrust est une plateforme SaaS de certification d'identité numérique anti-fraude combinant signatures cryptographiques (ES256, SHA-256), ancrage blockchain (Polygon) et vérification par QR code rotatif. Cible B2C (particuliers/familles) et B2B (entreprises/marque blanche).

### Équipe
| Nom | Rôle |
|-----|------|
| Olivier Bernabé | CEO / Fondateur / CTO |
| Laurianne Winter | DAF & Chef de projet |
| Deborah Slama | Directrice Marketing |
| Shaï Bernabé | Data / IA (Bachelor PSTB) |

---

## 2. STACK TECHNIQUE

```
Framework   : Next.js 16.1.6 (App Router)
Language    : TypeScript
Style       : TailwindCSS
Auth        : NextAuth v5
ORM         : Prisma 5 (v6.19.2)
DB          : PostgreSQL via Neon
Paiements   : Stripe (subscriptions + Stripe Identity KYC)
Emails      : Resend (domaine blocktrust.tech vérifié)
Storage     : Vercel Blob (blocktrust-blob, IAD1, Private)
JWT         : jose (ES256 / RS256)
Déploiement : Vercel (plan Hobby)
Repo        : github.com/brnbtech770/blocktrust
```

### Polices
```
Inter          → corps de texte (font-sans)
Space Grotesk  → titres (alias font-syne dans Tailwind)
IBM Plex Mono  → données techniques (font-mono)
```

### Charte
```
#0a1628 navy | #00d4ff cyan | #BDA76B gold
BLOCKTRUST = toujours en majuscules, couleur cyan #00d4ff
```

### Imports critiques
```typescript
import { prisma } from '@/app/lib/db'
import { auth } from '@/app/lib/auth-server'
// AccountType : PERSONAL / BUSINESS
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

---

## 4. FONCTIONNALITÉS EN PRODUCTION

### Auth & Sécurité
- Google OAuth, Email/Password, Magic Link
- ADMIN_EMAILS via env var
- Middleware fail-closed, JWT RS256
- Anti-bot inscription (honeypot, délai, regex)
- Headers sécurité (X-Frame-Options, HSTS, etc.)

### Paiement & KYC
- Stripe checkout B2C + B2B, webhooks validés
- **Bug fix critique (27/04)** : User.planId maintenant synchronisé sur customer.subscription.created + checkout.session.completed + customer.subscription.updated
- KYC Stripe Identity (1,50€/vérif)
- INSEE API Sirene 3.11 — vérification SIRET B2B

### Certificats & Badge
- ES256 + SHA-256
- **BlockTrustBadge SVG animé** (Lovable) — hexagone gold, circuits data-flow, double anneau contra-rotatif, bouclier cyan + checkmark gold, film lumineux "VERIFIED·SECURE·ON-CHAIN"
- Props : size, className, label, instanceId (useId SSR-safe)
- CSS animations dans globals.css (préfixe bt-)
- QR dynamique rotatif (invalide après scan)
- /verify PRIVÉE — abonnement requis + quotas par plan

### White Label & API Publique (27/04/2026)
- **Modèle WhiteLabelConfig** en DB
- **GET /api/public/verify/:id** — X-API-Key header, réponse JSON complète
- **GET /api/public/widget/:id** — SVG personnalisable (couleurs, taille, label)
- **Webhooks sortants** — HMAC-SHA256, events : verification.completed, badge.created, kyc.approved
- **Dashboard /dashboard/white-label** — clé API, personnalisation, webhook, docs
- Rate limit : 30 req/min par apiKey + quota mensuel hard
- Visible dans sidebar uniquement si plan B2B

### TrustScore dynamique
- KYC (+30) | abonnement (+15) | cert actif (+20)
- Ancienneté (+10 max) | CGU (+5) | MUTUAL (+1/rel, max 15)
- Pénalité FRAUD_ALERT (-10/alerte)
- Cron quotidien 3h

### Page /how-to (27/04/2026)
- Hero + tabs Particuliers/Entreprises
- Schéma vérification 8 étapes animé
- 3 démos BrowserFrame animées CSS (formulaire, intégration, visio)
- Guide Entreprises (API terminal, marque blanche, SDK)
- FAQ accordion 6 questions
- CTA final avec BlockTrustBadge
- Lien navbar "Comment ça marche" → /how-to

### Test E2E validé (27/04/2026)
Script scripts/test-e2e-flow.ts — 8/8 étapes OK :
1. User création ✅
2. Subscription + planId sync ✅
3. KYC verified ✅
4. Entity + Certificate + Signature ✅
5. Certificate activation ✅
6. QR rotatif généré ✅
7. Vérification publique VALID ✅
8. WhiteLabel API ✅

---

## 5. SÉCURITÉ

### Commits critiques
| Fix | Commit | Impact |
|-----|--------|--------|
| Auth bypass /api/v2/issue | 6427938 | Critique |
| Isolation données inter-users | 1cbbbe8 | Critique |
| Accès admin non autorisé | c8ace3a | Critique |
| User.planId non synchronisé | 57642b9 | Important |
| Anti-bot inscription | bd3a4c2 | Moyen |

### API publique White Label
- apiKeyHash jamais retourné dans réponses
- Clé en clair : uniquement à la création et régénération
- timingSafeEqual pour comparaison
- Webhook signé HMAC-SHA256

### À implémenter (roadmap sécurité)
- WAF Cloudflare
- Upstash Redis (rate limiting distribué)
- Migration JWT → AWS KMS
- Pentest externe (Synacktiv/Quarkslab)
- CSP headers
- Monitoring Sentry
- Bug bounty (HackerOne/YesWeHack)

---

## 6. VARIABLES D'ENVIRONNEMENT VERCEL

| Variable | Statut |
|----------|--------|
| BLOB_READ_WRITE_TOKEN | ✅ |
| INSEE_CONSUMER_KEY | ✅ Sensitive |
| INSEE_CONSUMER_SECRET | ✅ Sensitive |
| RESEND_API_KEY | ✅ |
| STRIPE_SECRET_KEY | ✅ → marquer Sensitive |
| STRIPE_WEBHOOK_SECRET | ✅ → marquer Sensitive |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | ✅ |
| BLOCKTRUST_JWT_PRIVATE_KEY | ✅ → marquer Sensitive |
| BLOCKTRUST_JWT_PUBLIC_KEY | ✅ |
| NEXTAUTH_SECRET | ✅ → marquer Sensitive |
| CRON_SECRET | ✅ |
| ADMIN_EMAILS | ✅ brnbtech@gmail.com,laurianne@blocktrust.tech |
| DATABASE_URL | ✅ |

---

## 7. PIPELINE DE DÉPLOIEMENT

```bash
# Terminal Mac
cd /Users/olivierbernabe/Projects/blocktrust-mvp
git push origin main          # webhook auto → Vercel
npx vercel --prod             # si webhook KO

# Config git
git config user.email "brnbtech770@gmail.com"
git config user.name "brnbtech770"
git config --global credential.helper osxkeychain
```

**Vercel Hobby → Crons quotidiens (0 3 * * *)**
**Webhook GitHub → Vercel opérationnel depuis 22/04/2026**

---

## 8. CHANTIERS RESTANTS

### 🔴 Priorité
- [ ] **Ancrage Polygon réel** (blockchain)
- [ ] **Marquer Sensitive** les variables Vercel
- [ ] **OG image + favicon** depuis BlockTrustBadge SVG

### 🟡 Moyen terme
- [ ] Migration middleware → proxy (Next.js 16)
- [ ] Migration prisma.config.ts (avant Prisma 7)
- [ ] DPIA finaliser pour avocat (Laurianne)
- [ ] SOPs incident response + RGPD breach
- [ ] Upstash Redis rate limiting distribué
- [ ] npm audit 3 vulnérabilités modérées (tar@7.5.7)
- [ ] Témoignages + chiffres réels sur landing

### 🔵 Long terme
- Extension Chrome TrustScan
- App mobile + NFC
- SSO / SAML Enterprise
- Tests automatisés Jest
- Plugin email Outlook/Gmail
- WAF Cloudflare + pentest externe
- Migration JWT → AWS KMS
- Intégration appels (Twilio + Teams/Zoom)

---

## 9. OBJECTIFS 9-10/10

Score actuel : **7.5/10**

| Action | Impact |
|--------|--------|
| 1 client B2B signé | +++++ |
| Témoignages + chiffres réels | +++ |
| Ancrage Polygon réel | +++ |
| DPIA + SOPs | ++ |
| Extension Chrome + plugin email | ++ |
| Partenariats (SeLoger, Malt, LeBonCoin) | +++++ |

**La priorité n°1 est commerciale, pas technique.**

---

## 10. RÈGLES DE TRAVAIL

### Workflow Cursor
1. Un prompt à la fois — audit step obligatoire
2. Build vert entre chaque prompt
3. Reporter résultats à Claude avant le suivant
4. Push + déploiement après validation
5. **Knowledge base mis à jour après chaque session**

### Ne jamais faire
- PrismaClient ad hoc (→ @/app/lib/db)
- userId du body/query (→ session.user.id)
- Erreur rouge sur page de conversion (→ UpgradePrompt)
- apiKeyHash dans les réponses API

---

## 11. ACCÈS & CONTACTS

| Ressource | Info |
|-----------|------|
| Production | https://blocktrust.tech |
| How-to | https://blocktrust.tech/how-to |
| GitHub | github.com/brnbtech770/blocktrust |
| Vercel | vercel.com → blocktrust-mvp |
| INSEE API | portail-api.insee.fr |
| Vercel Blob | vercel.com → Storage → blocktrust-blob |
| Admin | blocktrust.tech/admin/dashboard |
| Support | support@blocktrust.tech |
| Sécurité | security@blocktrust.tech |
| Commercial | commercial@blocktrust.tech |

---

*Mis à jour le 27 avril 2026 — Session Claude*
*Règle : ce fichier est mis à jour après chaque session*
*→ Uploader dans Project Knowledge Claude + commit GitHub*
