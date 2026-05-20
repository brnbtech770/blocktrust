# BLOCKTRUST — Legal & Compliance Skill
## RGPD, AI Act, eIDAS 2.0, wording produit

**Responsable :** Laurianne Winter (DAF / DPO) — laurianne@winter-keys.com  
**Société :** BRNB TECH SAS | DPO contact : privacy@blocktrust.tech  
**Date :** 20 mai 2026

---

## 1. RÔLE DE CE SKILL

Ce document guide Cursor et l'équipe sur :
- Le wording légal obligatoire dans l'UI, les emails et `/verify`
- Les obligations RGPD applicables à BLOCKTRUST
- La roadmap conformité (DPIA, DPA, SOPs, certifications)
- Les interdictions absolues (terminologie à risque juridique)

**Référence produit :** `docs/BLOCKTRUST_PROJECT_KNOWLEDGE_v12.md` §6

---

## 2. WORDING PRODUIT — RÈGLES ABSOLUES

### ❌ INTERDIT (UI, emails, landing, API publique)

| Terme interdit | Raison |
|----------------|--------|
| Frauduleux / Fraude certaine (sans contexte juridique) | Qualification juridique — risque diffamation |
| Dangereux / Malveillant | Jugement de valeur non prouvé |
| Blacklisté / Liste noire | Terme réglementaire imprécis |
| KYC | Terme technique — utiliser « vérification d'identité » |
| Entité | Terme technique — utiliser « contact » côté utilisateur |
| Certifié frauduleux | Allégation non tranchée par autorité |

### ✅ OBLIGATOIRE (formulations approuvées)

```
Signaux de vigilance
Score de confiance faible
Indicateurs inhabituels
Non certifié BLOCKTRUST™
Vigilance recommandée
Mismatch certificat détecté
Contact non certifié dans votre réseau
Vérification d'identité en cours / approuvée / rejetée
```

### Verdicts `/verify` — libellés utilisateur

| Code technique | Affichage utilisateur |
|----------------|----------------------|
| VALID | Certifié · Protégé |
| EXPIRED | Certificat expiré |
| REVOKED | Certificat révoqué |
| TAMPERED / FRAUD_ALERT (Cas 2) | Signaux de vigilance — mismatch détecté |
| INVALID | Non certifié BLOCKTRUST™ |

---

## 3. RGPD — TRAITEMENTS BLOCKTRUST

### Responsable de traitement
**BRNB TECH SAS** — données hébergées UE (Neon EU Central)

### Données personnelles collectées

| Catégorie | Exemples | Base légale |
|-----------|----------|--------------|
| Compte | email, nom, image OAuth | Exécution contrat |
| Vérification identité | Stripe Identity (doc, selfie) | Exécution contrat + intérêt légitime |
| Certificats / contacts | email, tel, SIRET, domaines | Exécution contrat |
| Vérifications publiques | IP hashée (SHA-256 + salt), user-agent | Intérêt légitime anti-fraude |
| Paiements | Stripe Customer ID | Exécution contrat |
| Logs sécurité | hash IP, actions audit | Intérêt légitime |

### Principes techniques RGPD (déjà en place)

```typescript
// IP — JAMAIS en clair en DB
import { hashIp } from '@/app/lib/auth' // SHA-256 + salt

// Secrets — timingSafeEqual obligatoire
import { timingSafeEqual } from 'crypto'

// Logs — pas d'email/token en clair
console.log(`[action] userId=${id.slice(0, 8)}...`)
```

### Droits des personnes
- Accès / rectification / suppression : support@blocktrust.tech ou privacy@blocktrust.tech
- Délai de réponse : 30 jours (RGPD Art. 12)
- Export : à documenter dans Privacy Policy

### Sous-traitants — DPA requis 🔴

| Sous-traitant | Service | DPA |
|---------------|---------|-----|
| Neon | PostgreSQL | 🔴 À signer |
| Vercel | Hébergement | 🔴 À vérifier |
| Resend | Emails transactionnels | 🔴 À signer |
| Upstash | Redis + QStash | 🔴 À signer |
| Stripe | Paiements + Identity | ✅ DPA Stripe standard |
| Alchemy | RPC Polygon | 🔴 À vérifier |
| Anthropic | Veille IA (articles RSS) | 🔴 À signer |
| Sentry | Monitoring erreurs | 🔴 À signer |

---

## 4. DOCUMENTS LÉGAUX — ÉTAT & PRIORITÉS

### 🔴 Avant lancement public

| Document | Route | Statut | Actions Laurianne |
|----------|-------|--------|-------------------|
| CGU | `/cgu` | Existant — révision | Tribunal Paris, médiateur, rétractation 14j B2C |
| Privacy Policy | `/privacy` | Existant — révision | Art. 13/14 RGPD complet, sous-traitants, durées conservation |
| Mentions légales | Footer | À vérifier | SIREN, capital, APE 6201Z, hébergeur |
| Cookies | Banner | Partiel | Consentement cookieConsent en DB |

### 🔴 Obligatoire post-lancement

- **DPIA** (Analyse d'impact) — avocat spécialisé RGPD
- **SOP incident response** — breach notification 72h CNIL (Art. 33)
- **Registre des traitements** — Art. 30 RGPD
- **Contrat licence marque** Olivier Bernabé → BRNB TECH SAS (INPI n°5253718)

### 🟡 6–12 mois

- Audit OWASP externe
- Préparation ISO 27001
- EUIPO marque BLOCKTRUST™ (avant oct. 2026 — budget ~1 200€)

### 🔵 24 mois

- ISO 27001 certification
- SOC 2 Type II (si clients Enterprise l'exigent)

---

## 5. AI ACT & VEILLE IA

### Usage actuel BLOCKTRUST
- **Claude Haiku 4.5** : synthèse articles RSS veille cyber (`/menaces`)
- Pas de décision automatisée impactant des personnes sans revue humaine
- Pas de profilage à des fins commerciales via IA

### Règles Cursor / dev

```
❌ Ne pas logger le contenu des prompts contenant des PII
❌ Ne pas envoyer de données KYC à l'API Anthropic
✅ Veille : titres/excerpts RSS uniquement (pas de données utilisateurs)
✅ Admin valide les alertes AIAlert manuellement
```

---

## 6. eIDAS 2.0 — COMPATIBILITÉ FUTURE

BLOCKTRUST n'est **pas** un QTSP (Qualified Trust Service Provider) aujourd'hui.

**Positionnement actuel :**
- Certificat BLOCKTRUST™ = preuve d'identité certifiée + ancrage Polygon
- Complémentaire à eIDAS / France Identité — pas substitut

**Roadmap compatibilité (long terme) :**
- Interopérabilité wallets EU Digital Identity
- Audit architecture signature (jose ES256 déjà en place)
- Veille réglementaire Q2 2027

---

## 7. STRIPE IDENTITY — CONFORMITÉ

### Wording UI
```
✅ "Vérification d'identité"
✅ "Complétez votre vérification d'identité"
❌ "KYC" / "Know Your Customer"
```

### Données
- Stripe Identity = sous-traitant certifié
- Documents stockés côté Stripe — pas en DB BLOCKTRUST (sauf statut + sessionId)
- Rate limit KYC : 3/h (coût ~1,50€/session)

---

## 8. CHECKLIST CURSOR — AVANT MERGE UI/TEXTE

```
□ Aucun "KYC" visible utilisateur
□ Aucun "entité" visible utilisateur → "contact"
□ Aucun "frauduleux" / "dangereux" / "blacklisté"
□ Verdicts /verify conformes au tableau §2
□ Pas de stats non vérifiables sur landing ("99,9% disponibilité")
□ BLOCKTRUST™ avec trademark dans navbar/footer
□ Emails : footer BRNB TECH SAS (pas SASU)
□ IP hashée si stockée
□ Pas de secret dans logs ou réponses API
```

---

## 9. CONTACTS LÉGAUX

| Rôle | Email |
|------|-------|
| DPO | privacy@blocktrust.tech |
| Support RGPD | support@blocktrust.tech |
| Sécurité / incident | security@blocktrust.tech |
| DAF / DPO interne | laurianne@winter-keys.com |

---

## 10. CONFORMITÉ PROGRESSIVE — TIMELINE

```
Maintenant  : RGPD basique + CGU + Privacy Policy révisées
6 mois      : DPIA + SOPs incident + DPA sous-traitants + OWASP
12 mois     : ISO 27001 préparation + Pentest externe
24 mois     : ISO 27001 certifiée + SOC 2 si requis Enterprise
```

---

*BLOCKTRUST Legal Compliance Skill — v1.0 — 20 mai 2026*  
*Aligné sur BLOCKTRUST_PROJECT_KNOWLEDGE_v12.md*
