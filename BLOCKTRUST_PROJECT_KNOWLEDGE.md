# BlockTrust — Document de Référence Projet

**Version:** 7.0
**Date:** 29 avril 2026
**Auteur:** Olivier Bernabé (BRNB TECH SAS)
**Statut:** Production live — 100% technique — Score 8.5/10

---

## 1. VISION & POSITIONNEMENT

### Headlines validées (Deborah + Laurianne — 28/04/2026)
> "La preuve que c'est vous. La certitude que c'est eux." ✅

> "Tout document que vous envoyez. Toute interaction que vous initiez. BLOCKTRUST certifie que c'est authentiquement vous — et que rien n'a été altéré." ✅ (sous-titre universel)

### Hero actuel (29/04/2026)
- **Pill :** "✦ Certifié · Protégé · Infalsifiable"
- **H1 :** "La carte d'identité numérique de tout ce que vous envoyez."
- **Sous-titre :** "Fini les faux RIB, faux conseillers, faux documents. BLOCKTRUST vous protège et certifie votre identité — vérifiable par n'importe qui, en 1 scan."
- **CTA :** "Certifier mon identité" + micro-copy "Inscription en 30 secondes — certification après abonnement"
- **Stats :** Infalsifiable / Anti-usurpation / On-chain

### Positionnement — La 4ème couche
| Solution | Ce qu'elle fait | Ce qu'elle NE fait PAS |
|----------|----------------|----------------------|
| Antivirus | Protège la machine | Ne prouve pas qui vous êtes |
| France Identité | Prouve votre identité à l'État | Ne prouve pas aux autres |
| Équipe IT interne | Sécurise le SI de l'entreprise | Ne certifie pas l'identité externe |
| **BLOCKTRUST** | **Certifie votre identité aux autres + vérifie ce que vous recevez** | Complémentaire |

### Équipe (BRNB TECH SAS — transformation en cours)
| Nom | Rôle | Capital |
|-----|------|---------|
| Olivier Bernabé | CEO / Fondateur | 50% |
| Shaï Bernabé | Data / IA | 20% |
| Déborah Bernabé épouse Slama | Marketing | 15% |
| Laurianne Winter | DAF & Chef de projet | 15% |

---

## 2. STACK TECHNIQUE

```
Framework    : Next.js 16.1.6 (App Router)
Language     : TypeScript (strict)
Style        : TailwindCSS
Auth         : NextAuth v5
ORM          : Prisma 5 (v6.19.3) + prisma.config.ts
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
#0a1628 navy | #00d4ff cyan | #BDA76B gold
BLOCKTRUST = toujours en majuscules, couleur cyan #00d4ff
KYC = jargon interne uniquement (jamais visible utilisateur)
"entité/entités" = remplacé par "contact/contacts" côté utilisateur
```

---

## 3. PRICING

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
| Starter | 29€ (→ dégressif) | 3 | 200 | ✅ |
| Team | 79€ (→ dégressif) | 10 | 500 | ✅ |
| Business | 199€ (→ dégressif) | 50 | Illimité | ✅ |
| Enterprise | Sur devis | Illimité | Illimité | ✅ |

**Proposition pricing dégressif validée Deborah/Laurianne :**
- 1-3 users : 9,99€/user
- 4-10 users : 7,99€/user
- 11-50 users : 5,99€/user
- 50+ : Enterprise sur devis
*(tranches et prix à finaliser avec Olivier)*

**Toggle annuel : -20% engagement annuel**
**14 Price IDs Stripe | Upgrade banner à 80% quota**

### Débats pricing en cours
- Particuliers : prix d'appel 4,99€ peut être un frein (suggestion 2,99€ — PDG 65 ans)
- TPE Starter : 29€ peut être un frein (suggestion 14,99€)
- À trancher avec l'équipe avant mise en prod

---

## 4. FONCTIONNALITÉS EN PRODUCTION

### Auth & Sécurité
- Google OAuth, Email/Password, Magic Link
- Proxy Edge (proxy.ts — migré Next.js 16)
- JWT RS256, fail-closed
- Upstash Redis rate limiting distribué (fail-soft vers in-memory)
- Sentry monitoring production

### Paiement & KYC
- Stripe checkout B2C + B2B (14 Price IDs)
- User.planId synchronisé sur 3 événements Stripe
- Stripe Identity — "Vérification d'identité" côté utilisateur
- INSEE API Sirene 3.11 (SIRET B2B)

### Certificats & Cryptographie
- Signatures ES256 + SHA-256
- QR code rotatif dynamique (invalide après scan)
- /verify PRIVÉE — abonnement requis + quotas

### Blockchain Polygon Mainnet RÉEL ✅
- Burn address `0x000000000000000000000000000000000000dEaD`
- RPC Alchemy Polygon Mainnet
- Wallet `BlockTrust Anchor` (~122 POL)
- Ancrage auto + retry manuel + cron 4h
- Email confirmation avec lien PolygonScan

### Badge SVG BlockTrust
- Hexagone, circuits animés, double anneau, bouclier + checkmark
- Props : size, className, label, instanceId
- Déployé partout : Hero, Navbar, Footer, Dashboard, /verify, Integration, FinalCTA

### Landing Page
- Section Categories anti-objection antivirus
- Halos néon sur tous les labels de section
- "contact/contacts" remplace "entité/entités" partout
- "-20% engagement annuel" (plus "offre de lancement")
- Fond quadrillé supprimé
- Effets néon CSS (text-shadow) sur labels

### White Label & API Publique
- GET /api/public/verify/:id + widget
- Webhooks HMAC-SHA256
- Dashboard /dashboard/white-label

### Emails (9 templates Resend)
- CertificateAnchoredEmail (lien PolygonScan)
- PaymentConfirmationEmail, KYCApprovedEmail, KYCRejectedEmail
- TrustCircleInviteEmail, TrustCircleConfirmedEmail
- ManualTrustRequestEmail, MagicLinkEmail, PasswordResetEmail

### Tests
- E2E 8/8 validé

---

## 5. ROADMAP TRUST CIRCLE — CAS 1 / CAS 2

**Feature différenciante — à implémenter**

### Cas 1 — Partenaire SANS badge
→ Alerte orange : "⚠️ Ce contact ne fait pas partie de votre réseau certifié."
→ Protection passive

### Cas 2 — Partenaire AVEC badge
→ Alerte rouge : "🚨 FRAUDE DÉTECTÉE — Ce contact prétend être [Nom] mais son identité ne correspond pas."
→ Certitude cryptographique

### Priorité d'implémentation
| Phase | Feature | Effort |
|-------|---------|--------|
| Court terme | Enrichir /verify logique Cas 1/Cas 2 | 2 jours |
| Court terme | Alertes dashboard Trust Circle | 3 jours |
| Moyen terme | Extension Chrome TrustScan | 2-3 mois |
| Long terme | Plugin email Outlook/Gmail | 2-3 mois |

---

## 6. FEEDBACKS RÉSEAU (analysés)

### F_44_FREELANCE — Jessica (niveau basique)
- Objection antivirus → **corrigée** (section Categories)
- KYC → **corrigé** ("vérification d'identité")
- Prête à payer si valeur expliquée ✅

### H_39_Entrepreneur (niveau moyen)
- Bronze/silver/gold → **corrigé**
- KYC → **corrigé**
- Hamburger menu pas compris → à investiguer
- Liens footer non actifs → **à vérifier**
- Sans explication préalable incompréhensible → améliorer onboarding

### H_65_PDG (niveau 0)
- **Objection clé B2B :** "Les grandes entreprises ont déjà des équipes IT"
- **Réponse :** BLOCKTRUST n'est pas de la cybersécurité interne — c'est la certification d'identité EXTERNE que les équipes IT ne font pas
- TPE : 29€ trop cher → suggestion 14,99€
- Particuliers : 4,99€ trop cher → suggestion 2,99€
- Manque vulgarisation

### FEEDBACKS_BOARD (Laurianne)
- Sous-titre trop défensif → **corrigé**
- "Ancré" incompris → **corrigé** ("Protégé")
- "Entité" incompris → **corrigé** ("contact")
- Pricing dégressif par user → validé, à implémenter
- Accordion détail par plan → à faire
- Cas 1/Cas 2 Trust Circle → roadmapé

---

## 7. STRATÉGIE COMMERCIALE

### Pivot stratégique (validé Deborah/Laurianne 28/04)
**Cibles prioritaires :** grandes entreprises + banques + organismes publics + structures connues du grand public les plus exposées à la fraude.
Les particuliers restent importants mais en second plan.
Les réseaux sociaux seuls ne suffiront pas pour le B2B.

### Objections à préparer
| Objection | Cible | Réponse |
|-----------|-------|---------|
| "On a déjà un antivirus" | B2C | BLOCKTRUST certifie votre identité aux autres — pas la même chose |
| "On a déjà une équipe IT" | Grands comptes | BLOCKTRUST certifie l'identité externe — pas la sécurité interne |
| "C'est trop cher" | TPE/Particuliers | 1 fraude évitée > 12 mois d'abonnement |
| "Nos clients ne connaissent pas BLOCKTRUST" | B2B | Premier dans votre réseau = avantage concurrentiel |

### Leviers actifs
- Agence immo Olivier (dogfood)
- Appel Koray (connecteur banques/crypto)
- Juriste/formaliste (client direct + prescripteur avocats/comptables)
- Réseaux sociaux → après INPI + SAS officielle

### Supports à préparer
- Plaquette B2B TPE/PME/ETI/Grandes entreprises (Deborah)
- Prompts IA pour édition des plaquettes (Deborah)
- Kit prescription pour juriste (Olivier)

---

## 8. VARIABLES VERCEL (toutes configurées)

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
| NEXT_PUBLIC_SENTRY_DSN | ✅ |
| SENTRY_AUTH_TOKEN | ✅ Sensitive |

---

## 9. CHANTIERS RESTANTS

### 🔴 Commercial
- [ ] 1er client B2B signé (priorité absolue)
- [ ] Appel Koray
- [ ] Email pitch juriste/formaliste
- [ ] Plaquette B2B (Deborah)

### 🔴 Juridique (Laurianne)
- [ ] Dépôt INPI BLOCKTRUST + BLOCKTRUST CIRCLE (620€)
- [ ] Recherche antériorités avant dépôt
- [ ] DPIA + avocat
- [ ] CGU/CGV corrections + avocat
- [ ] SOPs incident response + RGPD breach
- [ ] EUIPO Europe (après INPI)

### 🟡 Produit
- [ ] Vérifier liens footer (feedback entrepreneur)
- [ ] Améliorer onboarding "à quoi ça sert"
- [ ] Accordion détail par plan /pricing
- [ ] Trust Circle Cas 1/Cas 2 sur /verify
- [ ] Pricing B2B dégressif par user (Stripe)
- [ ] Débat pricing B2C (2,99€ vs 4,99€)
- [ ] Témoignages + chiffres réels landing

### 🔵 Long terme
- Extension Chrome TrustScan
- Plugin email Outlook/Gmail
- App mobile + NFC
- SSO / SAML Enterprise + SCIM
- WAF Cloudflare + pentest
- ISO 27001

---

## 10. OBJECTIFS 9-10/10

Score actuel : **8.5/10**

| Action | Impact |
|--------|--------|
| 1 client B2B signé | +++++ |
| Témoignages + chiffres réels | +++ |
| DPIA + SOPs + INPI | ++ |
| Trust Circle Cas 1/Cas 2 | +++ |
| Extension Chrome | ++ |
| Partenariats prescripteurs | +++++ |

---

## 11. RÈGLES DE TRAVAIL

### Ne jamais faire
- PrismaClient ad hoc (→ `@/app/lib/db`)
- userId du body/query (→ `session.user.id`)
- wallet.address comme destinataire ancrage
- "KYC" visible utilisateur (→ "vérification d'identité")
- "entité" visible utilisateur (→ "contact")
- Silver/bronze/gold comme niveaux certification
- Stats non vérifiables sur landing

### Règles de communication
- BLOCKTRUST = toujours majuscules cyan
- "La preuve que c'est vous. La certitude que c'est eux." = headline validée
- Pas de jargon blockchain côté utilisateur
- Deux dimensions toujours : émission + réception

---

## 12. DOCUMENTS PRODUITS

| Document | Contenu |
|----------|---------|
| BLOCKTRUST_PROJECT_KNOWLEDGE_v7.md | Ce fichier |
| BLOCKTRUST_Plan_Juridique_Laurianne.docx | DPIA + ISO + CGU |
| BLOCKTRUST_Depot_Marque_INPI.docx | 2 marques, 4 classes |
| BLOCKTRUST_Plan_Commercial_Deborah_Laurianne.docx | Plan 4 semaines + scripts |
| BLOCKTRUST_Messaging_Domaines_Intervention.docx | Messaging B2C/B2B + domaines |
| BLOCKTRUST_Roadmap_TrustCircle_Alertes.md | Feature Cas 1/Cas 2 |
| FEEDBACKS_BOARD (Google Drive) | Laurianne + Jessica + PDG + Entrepreneur |

---

## 13. ACCÈS & CONTACTS

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
| Support | support@blocktrust.tech |
| Commercial | commercial@blocktrust.tech |

---

*Mis à jour le 29 avril 2026 — Session Claude*
*Milestones : Technique 100% + Ancrage Polygon réel + Refonte positionnement + Feedbacks intégrés*
*Règle absolue : ce fichier est mis à jour après chaque session*
*→ Uploader dans Project Knowledge Claude + commit GitHub*
