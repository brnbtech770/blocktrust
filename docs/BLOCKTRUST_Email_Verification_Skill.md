# BLOCKTRUST — Email Verification Skill
## SPF · DKIM · DMARC · ARC · BIMI · Verified Communication Layer

---

## 1. VISION

L'email est le vecteur principal de fraude numérique. BLOCKTRUST peut devenir la **couche de confiance universelle sur l'email** — ce que personne ne fait aujourd'hui.

```
Aujourd'hui :
[Email reçu] → [Antivirus] → "Pas de virus"
                              (ne dit pas qui l'a envoyé)

Demain avec BLOCKTRUST :
[Email reçu] → [Extension TrustScan] → "✅ Identité certifiée"
                                        "Score 92/100"
                                        "SPF/DKIM/DMARC ✅"
                                        "Dans votre réseau"
```

**Le Moat Email :** Personne ne combine authentification technique (SPF/DKIM/DMARC) + identité certifiée (badge BLOCKTRUST) + réputation réseau (Trust Circle) en une seule couche.

---

## 2. STACK AUTHENTIFICATION EMAIL

### SPF (Sender Policy Framework)

```
Principe : L'expéditeur déclare quelles IPs peuvent envoyer en son nom
Format DNS : TXT record sur le domaine expéditeur

Exemple pour blocktrust.tech :
v=spf1 include:resend.com ~all

Résultats possibles :
PASS     → IP autorisée → expéditeur légitime
FAIL     → IP non autorisée → suspect
SOFTFAIL → Non autorisée mais toléré (~all)
NEUTRAL  → Pas de politique (?)
NONE     → Pas de SPF configuré

Limite : SPF ne protège que le domaine MAIL FROM
         (pas le From: visible par l'utilisateur)
```

### DKIM (DomainKeys Identified Mail)

```
Principe : Signature cryptographique du message par l'expéditeur
Format : Header "DKIM-Signature" + clé publique en DNS

Algorithmes : rsa-sha256 (standard), ed25519-sha256 (moderne)

Ce que DKIM garantit :
✅ Le message vient bien du domaine signataire
✅ Le corps du message n'a pas été modifié
✅ Non-répudiation (preuve d'envoi)

Ce que DKIM ne garantit PAS :
❌ Que le From: affiché correspond au signataire
❌ Que le signataire est l'identité réelle

Canonicalization (important pour BLOCKTRUST) :
simple/simple → strict, casse facilement lors du transit
relaxed/relaxed → plus tolérant, recommandé

Replay Attack via DKIM :
Problème : Un attaquant peut re-envoyer un email DKIM valide
Solution BLOCKTRUST : contextHash + timestamp dans le badge
```

### DMARC (Domain-based Message Authentication)

```
Principe : Politique d'action si SPF ou DKIM échoue
Format DNS : TXT _dmarc.[domaine]

Exemple blocktrust.tech :
v=DMARC1; p=reject; rua=mailto:dmarc@blocktrust.tech; pct=100

Policies :
p=none      → Monitorer seulement (pas d'action)
p=quarantine → Mettre en spam si échec
p=reject    → Bloquer si échec (recommandé prod)

Alignement (crucial) :
strict → DKIM/SPF domain = From domain exactement
relaxed → sous-domaines acceptés

BLOCKTRUST status :
✅ SPF via Resend configuré
✅ DKIM via Resend configuré
✅ DMARC configuré (OVH DNS)
```

### ARC (Authenticated Received Chain)

```
Problème résolu : Les listes de diffusion cassent DMARC
(elles re-signent le message → SPF/DKIM invalides)

Principe : Chaîne de "sceaux" ARC préservant l'auth d'origine

Headers ARC :
ARC-Authentication-Results
ARC-Message-Signature
ARC-Seal

Pertinence BLOCKTRUST :
Quand un email certifié BLOCKTRUST est transféré
→ ARC préserve la preuve d'authenticité originale
→ L'extension TrustScan peut lire la chaîne ARC
→ "Certifié à l'origine par brnbtech@gmail.com"
```

### BIMI (Brand Indicators for Message Identification)

```
Principe : Affiche le logo de la marque dans Gmail/Apple Mail
Format DNS : TXT default._bimi.[domaine]

Prérequis :
1. DMARC p=quarantine ou p=reject (obligatoire)
2. SVG logo carré (format strict)
3. VMC optionnel (Verified Mark Certificate ~1500$/an)

Impact commercial BLOCKTRUST :
✅ Logo BLOCKTRUST visible dans Gmail
✅ Crédibilité immédiate pour les emails système
✅ Différenciation forte vs concurrents

Setup BLOCKTRUST :
v=BIMI1; l=https://blocktrust.tech/bimi-logo.svg

Compatibility :
Gmail : ✅ (avec VMC)
Apple Mail : ✅ (sans VMC)
Outlook : ❌ (pas encore supporté)
```

---

## 3. ATTAQUES EMAIL — BLOCKTRUST DOIT DÉTECTER

### Replay Attack

```
Scénario :
1. Attaquant capture un email DKIM valide de brnb.fr
2. Le ré-envoie avec le même header DKIM
3. DKIM valide → spam filters passent
4. Victime fait confiance

Détection BLOCKTRUST :
→ Vérifier le Date: header (> 24h = suspect)
→ Vérifier le Message-ID (déjà vu = replay)
→ contextHash unique par envoi (notre protection principale)
→ Redis cache des Message-IDs récents
```

### Email Spoofing / Display Name Attack

```
Scénario :
From: "Olivier Bernabé BRNB" <fake@attacker.com>
(Le nom affiché est trompeur, l'adresse réelle est différente)

Détection BLOCKTRUST :
→ Comparer From: display name vs email address
→ Vérifier que l'email correspond à un certificat BLOCKTRUST
→ Si nom connu mais email différent → ALERTE
→ "⚠️ Le nom affiché ne correspond pas à l'email certifié"
```

### Homograph Attack

```
Scénario :
blocktrust.tech  ← réel
b1ocktrust.tech  ← fake (1 au lieu de l)
blоcktrust.tech  ← fake (ο cyrillique au lieu de o)

Détection BLOCKTRUST :
→ Levenshtein distance sur le domaine
→ Unicode normalization (détecter caractères non-ASCII)
→ Comparer vs domaines certifiés dans le Trust Circle
→ Alerter si distance < 3 du domaine d'un contact certifié
```

### Subdomain Attack

```
Scénario :
real@brnb.fr          ← certifié
fake@mail.brnb.fr     ← sous-domaine non certifié

Détection BLOCKTRUST :
→ Vérifier que le domaine exact est certifié
→ Pas juste le domaine parent
→ Alerter si sous-domaine inconnu d'un domaine certifié
```

### Mail Canonicalization Attack

```
Scénario :
Manipuler les espaces/sauts de ligne pour invalider DKIM
tout en gardant le contenu lisible

Détection :
→ Vérifier DKIM avec relaxed/relaxed
→ Méfiance si DKIM invalide sur relaxed
```

---

## 4. VERIFIED COMMUNICATION LAYER — ARCHITECTURE

### Vision produit

```
Niveau 1 — Email authentifié (SPF/DKIM/DMARC)
  "L'email vient bien de ce domaine"

Niveau 2 — Identité certifiée (badge BLOCKTRUST)
  "Cette personne a prouvé son identité chez nous"

Niveau 3 — Contexte certifié (contextHash)
  "Ce contenu spécifique a été certifié à cet instant"

Niveau 4 — Réputation réseau (Trust Circle)
  "Cette personne est dans votre réseau de confiance"

BLOCKTRUST est le seul à offrir les 4 niveaux.
```

### Extension TrustScan — analyse complète

```typescript
interface EmailAnalysis {
  // Niveau 1 — Technique
  spf: 'PASS' | 'FAIL' | 'SOFTFAIL' | 'NONE'
  dkim: 'PASS' | 'FAIL' | 'NONE'
  dmarc: 'PASS' | 'FAIL' | 'NONE'
  arc: 'PASS' | 'FAIL' | 'NONE' | 'NOT_PRESENT'

  // Niveau 2 — Identité
  blocktrustCertified: boolean
  trustScore: number
  kycVerified: boolean

  // Niveau 3 — Contexte
  isReplay: boolean
  messageAgeHours: number
  domainAge: number

  // Niveau 4 — Réseau
  inTrustCircle: boolean
  trustPath?: string  // "Via John que vous connaissez"

  // Résultat global
  recommendation: 'TRUST' | 'VERIFY' | 'CAUTION' | 'DANGER'
  signals: string[]
}
```

### Header email certifié BLOCKTRUST

```
À implémenter : header propriétaire dans les emails BLOCKTRUST

X-BlockTrust-Certificate: cmlhdc7v00009so42wg32077l
X-BlockTrust-Signature: [JWT ES256]
X-BlockTrust-Score: 92
X-BlockTrust-Timestamp: 2026-05-20T10:00:00Z

L'extension TrustScan lit ce header
→ Vérifie la signature contre notre API
→ Affiche le badge avec le score
```

---

## 5. BIMI SETUP BLOCKTRUST — GUIDE COMPLET

### Étape 1 — Créer le logo BIMI

```
Specs obligatoires :
- Format : SVG Tiny PS (pas SVG standard)
- Forme : Carré (1:1 ratio)
- Fond : Plein (pas transparent)
- Taille : Recommandé 500x500px

Convertir notre bouclier SVG en BIMI-compliant :
1. Ajouter fond navy #0a1628
2. Assurer le ratio 1:1
3. Tester sur https://bimigroup.org/bimi-generator/
```

### Étape 2 — Héberger le SVG

```
URL : https://blocktrust.tech/bimi-logo.svg
Requirements :
→ HTTPS obligatoire
→ Accessible publiquement
→ Pas de redirect
```

### Étape 3 — DNS Record (OVH)

```
TXT record :
Name: default._bimi.blocktrust.tech
Value: v=BIMI1; l=https://blocktrust.tech/bimi-logo.svg
TTL: 3600
```

### Étape 4 — Vérifier

```
Outil : https://mxtoolbox.com/bimi.aspx
Domaine : blocktrust.tech
```

---

## 6. SOURCES ET RÉFÉRENCES

```
RFC 7208 (SPF)    : https://tools.ietf.org/html/rfc7208
RFC 6376 (DKIM)   : https://tools.ietf.org/html/rfc6376
RFC 7489 (DMARC)  : https://tools.ietf.org/html/rfc7489
RFC 8617 (ARC)    : https://tools.ietf.org/html/rfc8617
BIMI Group        : https://bimigroup.org
mailauth (GitHub) : https://github.com/postalsys/mailauth
MXToolbox         : https://mxtoolbox.com
DMARC Analyzer    : https://www.dmarcanalyzer.com
```

---

*BLOCKTRUST Email Verification Skill — v1.0*
*Généré le 26 mai 2026*

---

## 7. ARC — DÉVELOPPEMENT COMPLET

### Pourquoi ARC est critique pour BLOCKTRUST

```
Problème réel :
70% des emails professionnels passent par :
→ Listes de diffusion (Mailchimp, Sendinblue)
→ Forwarding (secrétaire qui transfère)
→ Anti-spam corporate (re-signing)
→ Gmail/Outlook qui modifient les headers

Résultat : DKIM cassé à chaque transit
→ DMARC fail
→ Email légitime classé spam
→ Extension TrustScan voit "DKIM FAIL"
→ Faux négatif : email certifié affiché comme suspect

ARC résout ça en préservant la chaîne d'authentification.
```

### Structure des headers ARC

```
Chaque intermédiaire (MTA) ajoute 3 headers :

1. ARC-Authentication-Results (AAR)
   → Copie des résultats auth au moment du traitement
   arc-authentication-results: i=1; mx.google.com;
     dkim=pass header.d=blocktrust.tech;
     spf=pass smtp.mailfrom=blocktrust.tech;
     dmarc=pass

2. ARC-Message-Signature (AMS)
   → Signature DKIM-like du message + AAR
   arc-message-signature: i=1; a=rsa-sha256;
     c=relaxed/relaxed; d=google.com;
     bh=[body hash]; b=[signature]

3. ARC-Seal (AS)
   → Signature de l'ensemble des headers ARC
   arc-seal: i=1; a=rsa-sha256; cv=none;
     d=google.com; b=[signature]

Le champ "i" est l'instance (1, 2, 3...)
→ Chaque intermédiaire incrémente i
→ La chaîne est vérifiable bout en bout
```

### Vérification ARC dans TrustScan

```typescript
interface ArcVerificationResult {
  chainValid: boolean        // Chaîne ARC intacte
  instanceCount: number      // Nombre d'intermédiaires
  originalDkim: boolean      // DKIM valide à l'origine
  originalSpf: boolean       // SPF valide à l'origine
  lastSealDomain: string     // Dernier domaine de confiance
  trustworthy: boolean       // Résultat global
}

function verifyArcChain(emailHeaders: Headers): ArcVerificationResult {
  // Extraire toutes les instances ARC (i=1, i=2, ...)
  const instances = extractArcInstances(emailHeaders)

  if (instances.length === 0) {
    return { chainValid: false, instanceCount: 0, ... }
  }

  // Vérifier chaque seal de l'instance la plus haute vers i=1
  for (let i = instances.length; i >= 1; i--) {
    const seal = instances[i].arcSeal
    const valid = verifyArcSeal(seal, instances[i])
    if (!valid) return { chainValid: false, ... }
  }

  // Récupérer les résultats d'auth de l'instance i=1
  const originalAuth = instances[1].authResults

  return {
    chainValid: true,
    instanceCount: instances.length,
    originalDkim: originalAuth.dkim === 'pass',
    originalSpf: originalAuth.spf === 'pass',
    lastSealDomain: instances[instances.length].sealDomain,
    trustworthy: originalAuth.dkim === 'pass'
  }
}
```

### Domaines ARC de confiance (whitelist)

```typescript
// Intermédiaires connus et fiables
const TRUSTED_ARC_SEALERS = [
  'google.com',        // Gmail
  'microsoft.com',     // Outlook/Office365
  'outlook.com',       // Outlook
  'amazonses.com',     // AWS SES
  'sendgrid.net',      // SendGrid
  'mailchimp.com',     // Mailchimp
  'resend.com',        // Resend (nous !)
]

// Règle : si le dernier sealer est de confiance
// ET que la chaîne est valide
// → faire confiance même si DKIM final est cassé
function trustArcChain(result: ArcVerificationResult): boolean {
  return result.chainValid
    && result.originalDkim
    && TRUSTED_ARC_SEALERS.includes(result.lastSealDomain)
}
```

---

## 8. MAIL TRUST FLOW — FLOW COMPLET

### Flow utilisateur réel (Extension TrustScan)

```
┌─────────────────────────────────────────────────┐
│ 1. EMAIL ARRIVE DANS GMAIL                       │
│    From: olivier@brnb.fr                         │
│    Subject: "Votre devis immobilier"             │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│ 2. EXTENSION DETECTE L'EMAIL OUVERT             │
│    MutationObserver → .gD[email] sélecteur      │
│    email = "olivier@brnb.fr"                    │
│    domain = "brnb.fr"                           │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│ 3. LECTURE DES HEADERS EMAIL                    │
│    Extraire : SPF, DKIM, DMARC, ARC             │
│    (via Gmail API ou parsing DOM)               │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│ 4. APPEL API BLOCKTRUST                         │
│    GET /api/extension/verify-sender             │
│    ?email=olivier@brnb.fr                       │
│    ?domain=brnb.fr                              │
│    Authorization: bt_ext_xxxxx                  │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│ 5. TRUST ENGINE CÔTÉ SERVEUR                    │
│    → Chercher dans contacts du user             │
│    → Chercher dans Trust Circle                  │
│    → Calculer TrustScore contextuel             │
│    → Vérifier FRAUD_ALERT récentes              │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│ 6. CONTEXT VERIFICATION                         │
│    → Account age check                          │
│    → Domain age check (WHOIS)                   │
│    → IP reputation check                        │
│    → Disposable email check                     │
│    → Homograph detection                        │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│ 7. AFFICHAGE BADGE + SIGNAUX                    │
│                                                  │
│ ✓ Certifié BLOCKTRUST™                          │
│   Score: 87/100                                 │
│   ✓ Identité KYC vérifiée                      │
│   ✓ Dans votre Trust Circle                     │
│   ✓ SPF/DKIM/DMARC ✅                           │
│   ✓ Domaine actif depuis 8 ans                  │
└─────────────────────────────────────────────────┘
```

### Cas d'erreur et warnings

```
Cas 1 — Email forwarded (ARC)
→ DKIM cassé mais ARC valide
→ "✓ Certifié (email transféré - ARC valide)"
→ Badge cyan (pas vert)

Cas 2 — Nouveau contact
→ Pas dans Trust Circle
→ "? Non certifié — Premier contact"
→ Badge gris

Cas 3 — Domaine suspect
→ Créé il y a 3 jours
→ "⚠ Domaine créé récemment"
→ Badge orange + warning

Cas 4 — FRAUD_ALERT
→ Badge copié détecté
→ "🚨 ALERTE FRAUDE"
→ Badge rouge + alerte popup
```

---

*Updated: sections ARC complète + Mail Trust Flow ajoutés*
