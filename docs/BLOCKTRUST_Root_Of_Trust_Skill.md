# BLOCKTRUST — Root of Trust Skill
## Polygon Anchoring · Root Certificates · Derived Credentials · Revocation

---

## 1. VISION

```
BLOCKTRUST est une Root of Trust numérique :
→ Ancrage immuable sur Polygon (preuve cryptographique)
→ Certificats dérivés (émis depuis la racine)
→ Chaîne de confiance vérifiable par tous
→ Révocation publique et traçable
```

**Principe fondamental :**
```
Root (BLOCKTRUST) → Certificat (User) → Signature (Message)
                                       ↓
                              Vérifiable par tous
                              sans avoir besoin de BLOCKTRUST
```

---

## 2. ARCHITECTURE ACTUELLE

### Stack cryptographique

```
Algorithme signatures : ES256 (ECDSA P-256)
Hash : SHA-256
JWT library : jose (panva/jose)
Blockchain : Polygon Mainnet (Chain ID 137)
Provider : Alchemy RPC
Burn address : 0x000000000000000000000000000000000000dEaD
```

### Flux de certification

```
1. User crée un certificat
   → Prisma : Certificate { status: PENDING }

2. Signature ES256 créée
   → jose.sign(payload, BLOCKTRUST_JWT_PRIVATE_KEY)
   → Stockée dans Signature { jti, token, purpose: 'badge' }

3. Ancrage Polygon
   → Hash SHA-256 du certificat calculé
   → Transaction envoyée vers burn address
   → blockchainTxHash stocké
   → blockchainStatus: ANCHORED

4. Vérification publique
   → /verify?certId=[publicId]
   → Récupère la signature
   → Vérifie avec BLOCKTRUST_JWT_PUBLIC_KEY
   → Vérifie l'ancrage Polygon via PolygonScan
```

### Clés cryptographiques

```
BLOCKTRUST_JWT_PRIVATE_KEY :
→ Clé privée ES256 (PKCS8)
→ Stockée dans Vercel (Sensitive)
→ Utilisée pour signer les badges
→ NE JAMAIS exposer

BLOCKTRUST_JWT_PUBLIC_KEY :
→ Clé publique ES256 (SPKI)
→ Peut être publiée publiquement
→ Utilisée pour vérifier les badges
→ Disponible sur /api/v2/verify

Rotation des clés (roadmap) :
→ Tous les 90 jours
→ Avec période de transition (ancien certificats restent valides)
→ Migration vers AWS KMS (long terme)
```

---

## 3. ANCRAGE POLYGON — DÉTAIL TECHNIQUE

### Pourquoi Polygon

```
Ethereum :  ~15$/transaction → trop cher
Bitcoin :   ~5$/transaction → trop cher
Polygon :   ~0.001$/transaction → idéal
Solana :    Rapide mais moins décentralisé

Choix Polygon :
✅ EVM compatible (outils Ethereum)
✅ Coût négligeable (~0.001€)
✅ Décentralisé et sécurisé
✅ PolygonScan pour vérification publique
✅ MATIC facilement acquis
```

### Transaction d'ancrage

```typescript
// Données ancrées sur Polygon
const anchorPayload = {
  certificateId: cert.publicId,
  entityHash: sha256(entity.email + entity.name),
  signatureJti: signature.jti,
  timestamp: new Date().toISOString(),
  version: '2.0'
}

// Hash SHA-256 du payload
const dataHash = sha256(JSON.stringify(anchorPayload))

// Transaction vers burn address
const tx = await wallet.sendTransaction({
  to: '0x000000000000000000000000000000000000dEaD',
  value: 0,
  data: '0x' + dataHash, // Hash dans le data field
  gasLimit: 21000 + dataHash.length * 68
})

// Stockage du txHash
await prisma.certificate.update({
  where: { id: cert.id },
  data: {
    blockchainTxHash: tx.hash,
    blockchainStatus: 'ANCHORED',
    blockchainNetwork: 'polygon-mainnet'
  }
})
```

### Vérification publique Polygon

```
Toute personne peut vérifier un certificat BLOCKTRUST :
1. Récupérer le blockchainTxHash depuis /verify
2. Aller sur https://polygonscan.com/tx/[txHash]
3. Voir le data field → Hash SHA-256
4. Recalculer le hash localement
5. Comparer → Preuve d'authenticité

Avantage : BLOCKTRUST peut disparaître,
           les preuves restent sur Polygon
```

---

## 4. CERTIFICATS DÉRIVÉS — ARCHITECTURE CIBLE

### Hiérarchie de confiance

```
Root Certificate BLOCKTRUST
    │
    ├── Certificat Utilisateur (User Certificate)
    │       │
    │       ├── Credential Email
    │       ├── Credential Domaine
    │       └── Credential Wallet
    │
    └── Certificat Organisation (Org Certificate)
            │
            ├── Credential Membre 1
            └── Credential Membre 2
```

### W3C Verifiable Credentials (roadmap)

```json
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://blocktrust.tech/contexts/v1"
  ],
  "type": ["VerifiableCredential", "BlockTrustIdentity"],
  "issuer": "did:web:blocktrust.tech",
  "issuanceDate": "2026-05-20T10:00:00Z",
  "credentialSubject": {
    "id": "did:web:blocktrust.tech:users:olivier",
    "name": "Olivier Bernabé",
    "email": "brnbtech@gmail.com",
    "trustScore": 92,
    "kycVerified": true,
    "certifiedEmails": ["brnbtech@gmail.com", "brnbimmo@gmail.com"]
  },
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2026-05-20T10:00:00Z",
    "verificationMethod": "did:web:blocktrust.tech#key-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "..."
  }
}
```

---

## 5. REVOCATION REGISTRY

### Mécanisme actuel

```
Révocation en DB :
→ certificate.status = 'REVOKED'
→ certificate.revokedAt = now()
→ Propagation immédiate via API

Problème :
Si BLOCKTRUST DB est down → impossible de vérifier la révocation
```

### Révocation sur Polygon (cible)

```
Revocation Registry Contract :
→ Smart contract Polygon
→ Mapping certId → bool (revoked)
→ Toute vérification check le contract en temps réel

Avantage :
→ Décentralisé (pas dépendant de notre DB)
→ Immuable et traçable
→ Vérifiable par tous sans BLOCKTRUST

Timeline : Phase 4 (après levée de fonds)
```

### Revocation Status List (W3C standard)

```
Standard W3C StatusList2021 :
→ Bitstring de 16KB couvrant 131K certificats
→ Mis à jour régulièrement
→ Cacheable par les vérificateurs

Avantage vs Polygon pour révocation :
→ Plus rapide (pas de transaction)
→ Moins coûteux
→ Standard W3C

BLOCKTRUST peut implémenter les deux :
→ StatusList2021 pour révocations rapides
→ Polygon pour preuves permanentes
```

---

## 6. ROTATION DES CLÉS — PROCÉDURE

```
Procédure de rotation (tous les 90 jours) :

1. Générer nouvelle paire ES256
   openssl ecparam -name prime256v1 -genkey -noout -out new-private.pem
   openssl ec -in new-private.pem -pubout -out new-public.pem

2. Période de transition (30 jours)
   → Nouvelle clé signe les nouveaux certificats
   → Ancienne clé reste valide pour les certificats existants
   → kid (Key ID) dans le JWT header identifie la clé

3. Migration Vercel
   → BLOCKTRUST_JWT_PRIVATE_KEY_NEW → BLOCKTRUST_JWT_PRIVATE_KEY
   → Conserver l'ancienne clé dans BLOCKTRUST_JWT_PRIVATE_KEY_LEGACY

4. Mise à jour JWKS endpoint
   GET /api/v2/jwks.json
   → Expose les clés publiques actives
   → Standard OIDC/OAuth2
```

---

## 7. AWS KMS — MIGRATION ROADMAP

```
Pourquoi AWS KMS :
→ Clés privées jamais extractibles
→ HSM (Hardware Security Module)
→ Audit trail complet
→ Rotation automatique

Migration :

Étape 1 (maintenant) :
→ Clés dans Vercel env vars (actuel)
→ Risque : exposition si Vercel compromis

Étape 2 (6 mois) :
→ Clés dans AWS KMS
→ Signature via API KMS (pas d'extraction)
→ Coût : ~0.03$ par 10K signatures

Étape 3 (12 mois) :
→ Clés dans HSM dédié
→ Certification FIPS 140-2
→ Requis pour certifications ISO 27001 / SOC 2
```

---

*BLOCKTRUST Root of Trust Skill — v1.0*
*Généré le 26 mai 2026*

---

## 8. TRUST DELEGATION MODEL

### Qui peut certifier quoi ?

```
BLOCKTRUST (Root)
    │ peut certifier
    ▼
Utilisateur vérifié (KYC)
    │ peut certifier
    ├── Ses propres emails/domaines
    ├── Ses contacts (via Trust Circle)
    └── Son organisation (si Admin)
            │ peut certifier
            ├── Les membres de l'équipe
            ├── Les domaines de l'entreprise
            └── Les entrées du Vault partagé
```

### Matrice des droits de certification

```typescript
type CertificationRight = {
  subject: 'EMAIL' | 'DOMAIN' | 'WALLET' | 'PHONE' | 'MEMBER'
  canCertify: boolean
  requiresKYC: boolean
  requiresAdmin: boolean
  maxCount: number
}

const DELEGATION_MATRIX: Record<string, CertificationRight[]> = {
  'PERSONAL_USER': [
    { subject: 'EMAIL', canCertify: true, requiresKYC: false, maxCount: 1 },
    { subject: 'PHONE', canCertify: true, requiresKYC: false, maxCount: 1 },
    { subject: 'DOMAIN', canCertify: false, requiresKYC: true, maxCount: 0 },
  ],
  'KYC_USER': [
    { subject: 'EMAIL', canCertify: true, requiresKYC: true, maxCount: 5 },
    { subject: 'DOMAIN', canCertify: true, requiresKYC: true, maxCount: 3 },
    { subject: 'WALLET', canCertify: true, requiresKYC: true, maxCount: 5 },
  ],
  'ORG_ADMIN': [
    { subject: 'MEMBER', canCertify: true, requiresAdmin: true, maxCount: -1 },
    { subject: 'DOMAIN', canCertify: true, requiresAdmin: true, maxCount: -1 },
    { subject: 'EMAIL', canCertify: true, requiresAdmin: true, maxCount: -1 },
  ],
  'BLOCKTRUST_ADMIN': [
    // Peut tout certifier et révoquer
    { subject: 'EMAIL', canCertify: true, requiresAdmin: true, maxCount: -1 },
    { subject: 'DOMAIN', canCertify: true, requiresAdmin: true, maxCount: -1 },
    { subject: 'MEMBER', canCertify: true, requiresAdmin: true, maxCount: -1 },
    // Peut révoquer n'importe quel certificat
  ],
}
```

### Délégation organisation → membres

```
Flow :
1. Admin org crée le Vault partagé
2. Invite les membres (email)
3. Membres acceptent → leur compte lié à l'org
4. Admin peut :
   → Ajouter/retirer des membres
   → Certifier les emails pro des membres
   → Partager le Trust Circle org avec les membres
   → Révoquer les accès d'un membre (départ)

Révocation membre (départ employé) :
→ Retirer de l'organisation
→ Certificats org invalides pour cet email
→ Trust Circle org retiré
→ Emails pro certifiés révoqués si domaine org
```

---

## 9. RÉCUPÉRATION DE COMPTE

### Scénarios de perte d'accès

```
Scénario 1 — Email compromis
Problème : L'attaquant contrôle l'email
→ Peut recevoir les magic links
→ Peut réinitialiser le mot de passe

Procédure BLOCKTRUST :
1. Contacter privacy@blocktrust.tech immédiatement
2. Fournir preuve d'identité (pièce d'identité)
3. Vérification manuelle par l'équipe
4. Suspension temporaire du compte
5. Nouveau compte avec KYC re-vérifié
6. Transfert des certificats si possible
```

```
Scénario 2 — Compte hacké (session volée)
Problème : Attaquant a une session active

Procédure automatique BLOCKTRUST :
→ Bouton "Déconnecter toutes les sessions" dans paramètres
→ Invalide tous les JWT actifs (rotation du secret)
→ Envoie un email d'alerte
→ Log de sécurité créé

Procédure manuelle :
→ admin peut invalider toutes les sessions d'un user
→ Via /admin/users/[id] → "Forcer déconnexion"
```

```
Scénario 3 — Perte d'accès à l'email
Problème : Email inaccessible (provider down, oublié...)

Procédure BLOCKTRUST :
→ Pas de magic link possible
→ Credentials (email + mot de passe) si configuré
→ Sinon : vérification KYC physique
→ L'équipe peut lier un nouvel email après vérification

Recommandation produit :
→ Encourager les users à configurer un email de secours
→ "Email de récupération" dans les paramètres
```

```
Scénario 4 — Wallet crypto perdu
Problème : Clé privée wallet perdue

Procédure BLOCKTRUST :
→ Le wallet est certifié mais n'est pas requis pour l'accès
→ L'utilisateur peut supprimer le wallet certifié
→ Certifier un nouveau wallet après KYC
→ L'historique blockchain reste (immuable)
→ Les anciens certificats pointant vers l'ancien wallet
   peuvent être re-émis pointant vers le nouveau
```

### Politique de récupération

```
Délais de réponse :
→ Urgence (compte actif compromis) : 4 heures
→ Standard (accès perdu) : 24-48 heures
→ Vérification KYC manuelle : 3-5 jours ouvrés

Preuves acceptées :
→ Pièce d'identité officielle
→ Justificatif de domicile < 3 mois
→ Selfie avec document
→ Pour entreprises : Kbis < 3 mois

Contact : security@blocktrust.tech
          Objet : [URGENT] Récupération compte [email]
```

---

*Updated: Trust Delegation Model + Account Recovery ajoutés*
