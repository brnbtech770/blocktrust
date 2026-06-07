# BLOCKTRUST — Skill d’audit processus complet

Document de référence pour audits bout-en-bout (produit, technique, B2B) avant livraison ou release majeure.  
**Repo :** blocktrust-mvp · **Stack :** Next.js App Router, Prisma, Stripe, Resend, `proxy.ts`.

---

## 1. Flux inscription → badge → vérification (6 étapes)

| # | Étape | Points à vérifier | Fichiers / routes utiles |
|---|--------|-------------------|---------------------------|
| 1 | **Compte & session** | Magic link / OAuth, session NextAuth, redirection dashboard | `app/auth/*`, `app/lib/auth-server.ts` |
| 2 | **Vérification d’identité (utilisateur)** | Parcours onboarding, statut KYC côté UI (pas le mot « KYC »), webhooks Identity | `app/onboarding/*`, `app/api/stripe/identity-webhook`, `app/api/kyc/*` |
| 3 | **Contact & certificat** | Création entité + certificat, quotas, ownership `userId` session | `app/dashboard/create`, `app/api/entities`, `app/api/certificates` |
| 4 | **Validation & activation** | PENDING → ACTIVE, admin si applicable, pas d’IDOR | `app/api/admin/*`, statuts Prisma `CertificateStatus` |
| 5 | **Badge, QR, ancrage** | QR encode `/verify?certId=` ou `/verify/qr/*` (dynamique), badge SVG, Polygon burn address | `app/api/qr/[id]`, `app/api/badge/[id]`, `app/api/qr/generate/*`, `lib/*polygon*` |
| 6 | **Vérification tiers** | Page publique `/verify?certId=`, rate limit, verdicts (VALID / FRAUD / …) | `app/verify/page.tsx`, `app/api/public/certificate/*`, `proxy.ts` (chemins publics) |

**Critères de succès :** un utilisateur non connecté peut vérifier un titulaire via lien public ; le titulaire voit KPIs, certificats et activité sur le dashboard.

---

## 2. Flux fraude et alertes

- **Vérifications `FRAUD_ALERT`** : création `Verification`, baisse TrustScore si prévu, **email titulaire** (`notifyCertificateOwnerFraudAlertFireAndForget` dans `lib/verify-fraud.ts`), **AdminAlert** (`createAdminFraudAlert`).
- **Points d’entrée à tracer** : `app/verify/[id]/page.tsx` (contexte / Trust Circle), `app/verify/qr/[token]/page.tsx`, `app/api/verify/[id]/route.ts`, `app/api/v2/verify/route.ts`.
- **Dashboard client** : bannière rouge si `FRAUD_ALERT` sur certificats du user **7 derniers jours** (`app/dashboard/page.tsx`).
- **Admin** : file d’alertes, types `FRAUD_ALERT` / volume / scanning (`app/admin/alerts/*`).
- **Emails** : template `emails/FraudAlertEmail.tsx` (sujet sans emoji, CTA dashboard + `security@blocktrust.tech`).

---

## 3. Flux Trust Circle (Cas 1 et Cas 2 — référence produit ; Cas 3 : invitations / confiance manuelle)

| Cas | Comportement attendu (rappel `.cursorrules`) | Vérification |
|-----|---------------------------------------------|--------------|
| **Cas 1** | Partenaire **hors** Trust Circle → avertissement (contact non certifié dans le réseau) | `app/verify/[id]/page.tsx`, `lib/certified-contact.ts` |
| **Cas 2** | Partenaire **dans** le cercle mais certificat incohérent → **fraude certaine**, `FRAUD_ALERT`, fichier admin | Même base + TrustScore |
| **« Cas 3 » (audit)** | Invitations Trust Circle, lien externe, confirmation mutuelle, demandes manuelles | `app/api/trust-circle/*`, emails `TrustCircleInviteEmail`, `TrustCircleExternalInviteEmail`, `MutualTrustEmail`, `ManualTrustRequestEmail` / demandes admin |

S’assurer que la **terminologie UI** utilise « contact / réseau », pas « entité ».

---

## 4. Flux emails (9 templates cœur — à valider à chaque release)

Liste alignée sur la doc produit historique ; le dossier `emails/` peut contenir **des templates additionnels** (bienvenue, création certificat, etc.) — les inclure dans les tests si le flux les déclenche.

| # | Template (React Email) | Déclencheur typique |
|---|------------------------|---------------------|
| 1 | `CertificateAnchoredEmail` | Ancrage Polygon réussi |
| 2 | `PaymentConfirmationEmail` | Paiement / souscription |
| 3 | `KYCApprovedEmail` | Vérification d’identité approuvée |
| 4 | `KYCRejectedEmail` | Vérification d’identité refusée |
| 5 | `TrustCircleInviteEmail` | Invitation Trust Circle |
| 6 | `MutualTrustEmail` | Relation Trust Circle confirmée (mutuelle) — `app/api/trust-circle/confirm/*` |
| 7 | `ManualEntryApprovedEmail` / emails admin associés | Approbation demande manuelle (`app/api/admin/demandes/*`) |
| 8 | `MagicLinkEmail` | Connexion sans mot de passe |
| 9 | `PasswordResetEmail` (réf. `.cursorrules` — confirmer présence dans `emails/` ou template auth utilisé) | Réinitialisation mot de passe |

**À vérifier pour chacun :** expéditeur Resend, sujet, pas de données sensibles en log, liens vers `NEXT_PUBLIC_APP_URL`, charte BLOCKTRUST™.

**Templates supplémentaires fréquents dans le repo :** `FraudAlertEmail`, `WelcomeEmail`, `CertificateCreatedEmail`, `CertificateRevokedEmail`, `PaymentSuccessEmail`, `KYCRetryEmail`, invites externes, etc.

---

## 5. Flux extension Chrome (TrustScan)

- **Manifest** : `extension/manifest.json` — `content_scripts` sur `https://mail.google.com/*`, `host_permissions` blocktrust.tech.
- **Gmail** : `extension/content/gmail.js` — sélecteurs 2026 (`.gD[email]`, `.yP[email]`, …), debounce observer, logs `[BLOCKTRUST]` en console.
- **API** : `GET /api/extension/me`, `GET /api/extension/verify-sender` avec clé `bt_ext_*` (stockage `chrome.storage.local`).
- **Popup** : `extension/popup/popup.js` — validation préfixe + 64 hex, `/me` avant enregistrement de la clé.

---

## 6. Flux admin

- **Accès** : `ADMIN_EMAILS`, garde `proxy.ts` + layouts `app/admin/*`.
- **Domaines** : utilisateurs, certificats, KYC, alertes, surveillance, QStash / crons si exposés UI.
- **Sécurité** : pas d’IDOR sur IDs certificat / user ; actions destructrices confirmées côté UI.

---

## 7. Flux Stripe (Price IDs + taxe + webhooks)

### Variables d’environnement (Price IDs)

Les prix B2C/B2B sont mappés dans `app/api/stripe/webhook/route.ts` via `lib/pricing.ts` :

- **Souscriptibles** : `ESSENTIEL`, `PREMIUM`, `FAMILLE`, `STARTER`, `TEAM` (+ add-on Famille)
- **Legacy (rétro-compat, non checkout)** : `FAMILLE_PLUS`, `SOLO_PRO`, `BUSINESS`
- **Enterprise** : sur devis (pas de Price ID checkout)

**Audit :** chaque plan actif en vente a une variable d'env ; checkout refuse les legacy (`isLegacyPriceId`) ; priceId inconnu → `DISCOVERY`.

### Taxe

- Vérifier **Stripe Tax** ou paramètres TVA / `customer_tax_ids` selon implémentation actuelle (`lib/stripe.ts`, checkout routes).
- Factures : cohérence pays / `tax_behavior` sur les produits Stripe dashboard.

### Webhooks

- Endpoint : `app/api/stripe/webhook/route.ts` — signature `STRIPE_WEBHOOK_SECRET`, idempotence (`lib/stripe-webhook-idempotency`).
- Événements critiques : `checkout.session.completed`, `customer.subscription.*`, facturation, Identity si applicable.
- **Ne jamais logger** les secrets ou payloads complets avec PII.

---

## 8. Flux sécurité

- **Proxy** : `proxy.ts` — `/verify` public ; `/verify/qr/*` public (QR dynamique) ; autres `/verify/*` protégés ; `/admin/*` ; APIs sensibles.
- **Auth** : `userId` toujours depuis `auth()`, jamais depuis body/query pour des actions sensibles.
- **JWT / signatures** : clés `BLOCKTRUST_JWT_*`, burn address Polygon `0x…dEaD`.
- **Rate limit** : Upstash prefixes `bt:verify`, `bt:api`, `bt:auth`, `bt:kyc` — comportement fail-open documenté.
- **RGPD** : hash IP pour `Verification`, pas d’IP en clair en base.

---

## 9. Flux mobile 375px

- **Pages clés** : landing, `/pricing`, `/verify`, dashboard (KPIs, grille certificats + TrustScore + activité), fiche certificat / badge.
- **Contrôles** : pas de débordement horizontal, tap targets ≥ 44px, badge / QR lisibles, modales plein écran si nécessaire.
- **Proxy / cookies** : comportement session sur mobile (chunk cookies NextAuth).

---

## 10. Checklist pré-lancement client B2B

- [ ] **Contrat / plan** : plan STARTER → ENTERPRISE, limites users / vérifications / white-label alignées Stripe + DB.
- [ ] **White-label** : domaine, webhooks, clés régénérables (`app/dashboard/white-label`, `app/api/whitelabel/*`).
- [ ] **Onboarding équipe** : emails invitation, rôles si multi-comptes (selon produit).
- [ ] **Preuves** : export ou écran démo Trust Circle, fraude, ancrage Polygon.
- [ ] **SLA & support** : canal support, `security@blocktrust.tech` pour incidents fraude.
- [ ] **Conformité** : CGU / privacy à jour, DPA si nécessaire, sous-traitants (Vercel, Stripe, Resend, Neon).
- [ ] **Recette** : parcours §1 en environnement staging avec vrais webhooks Stripe (test mode) et envoi email Resend de test.

---

## Utilisation dans Cursor

En début de session d’audit, indiquer :

> « Suivre `docs/BLOCKTRUST_Process_Audit_Skill.md` section par section ; pour chaque section, lister écarts, risques P1/P2, et PRs suggérées. »

**Version document :** 1.0 — maintenir après chaque changement majeur de flux (Stripe, verify, extension).
