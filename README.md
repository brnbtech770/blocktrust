# BlockTrust MVP

> Plateforme de certification et vérification d'authenticité pour les entreprises  
> Stack: **Next.js 16**, **Prisma**, **PostgreSQL**, **JWT (ES256)**, **QR Codes**

---

## 🎯 Vue d'ensemble

BlockTrust est une plateforme permettant aux entreprises de :
- Créer et gérer des certificats de confiance
- Générer des signatures JWT pour authentifier leurs emails
- Vérifier l'authenticité des communications via des badges et QR codes
- Suivre les vérifications et détecter les tentatives de falsification

## 🚀 Technologies

- **Framework**: Next.js 16.1.1 (App Router)
- **Base de données**: PostgreSQL avec Prisma ORM
- **Authentification**: JWT avec ES256 (clés ECDSA)
- **UI**: React 19, Tailwind CSS 4
- **QR Codes**: Bibliothèque `qrcode`

## 📁 Structure du projet

```
blocktrust-mvp/
├── app/
│   ├── api/
│   │   ├── entities/
│   │   │   └── route.ts          # CRUD des entités
│   │   └── v2/
│   │       ├── issue/
│   │       │   └── route.ts      # Génération de signatures JWT
│   │       └── verify/
│   │           └── route.ts      # Vérification de signatures
│   ├── badge/
│   │   └── [id]/
│   │       └── page.tsx          # Page badge avec QR code
│   ├── components/
│   │   └── QRCode.tsx            # Composant QR code
│   ├── dashboard/
│   │   ├── create/
│   │   │   └── page.tsx          # Formulaire création entité
│   │   └── page.tsx              # Dashboard principal
│   ├── verify/
│   │   ├── [id]/
│   │   │   └── page.tsx          # Vérification par ID/SIRET
│   │   └── page.tsx              # Vérification par token JWT
│   ├── lib/
│   │   └── db.ts                 # Client Prisma
│   └── page.tsx                  # Page d'accueil
├── lib/
│   └── v2/
│       ├── context.ts            # Canonicalisation et hash des contextes
│       └── jwt.ts                # Signatures et vérification JWT
├── prisma/
│   ├── schema.prisma             # Schéma de base de données
│   ├── migrations/               # Migrations Prisma
│   └── seed.js                   # Script de seed
└── README.md
```

## 🗄️ Modèle de données

### User
- Informations utilisateur (email, nom, plan)

### Entity
- Entité certifiée (nom légal, SIRET, email, site web)
- Statuts: `kycStatus` (PENDING/APPROVED/REJECTED)
- Niveaux: `validationLevel` (BRONZE/SILVER/GOLD)

### Certificate
- Certificat lié à une entité
- Statuts: PENDING/APPROVED/REJECTED
- Niveaux: BRONZE/SILVER/GOLD

### Signature (V2)
- Métadonnées de signature JWT
- `jti`: Identifiant unique du token
- `ctxHash`: Hash du contexte signé
- `expiresAt`: Date d'expiration
- `revoked`: Statut de révocation

### VerificationEvent
- Historique des vérifications
- IP, User-Agent, verdict (VALID/TAMPERED/REVOKED/etc.)

## 🔐 API V2 - Signatures JWT

### POST `/api/v2/issue`

Génère une signature JWT pour un contexte email.

**Request:**
```json
{
  "entityId": "string",
  "certificateId": "string",
  "context": {
    "from": "contact@example.com",
    "to": "client@example.com",
    "subject": "Sujet de l'email",
    "date": "2024-01-15T10:00:00Z",
    "body": "Corps de l'email (optionnel)"
  },
  "expiresInSeconds": 3600
}
```

**Response:**
```json
{
  "token": "eyJ...",
  "verifyUrl": "http://localhost:3000/verify?token=...",
  "signatureId": "uuid"
}
```

### POST `/api/v2/verify`

Vérifie une signature JWT.

**Request:**
```json
{
  "token": "eyJ...",
  "context": {
    "from": "contact@example.com",
    "to": "client@example.com",
    "subject": "Sujet de l'email",
    "date": "2024-01-15T10:00:00Z",
    "body": "Corps de l'email (optionnel)"
  }
}
```

**Response:**
```json
{
  "verdict": "VALID" | "VALID_WITH_WARNING" | "TAMPERED" | "REVOKED" | "EXPIRED" | "INVALID",
  "reason": "string (optionnel)",
  "entityId": "string",
  "certificateId": "string",
  "jti": "string"
}
```

## 🛠️ Installation et configuration

### Prérequis

- Node.js 20+
- PostgreSQL
- macOS (ou Linux/Windows)

### 1. Installation des dépendances

```bash
npm install
```

### 2. Configuration de la base de données

Créer un fichier `.env` à la racine :

```env
# Base de données
DATABASE_URL="postgresql://user:password@localhost:5432/blocktrust"
DIRECT_URL="postgresql://user:password@localhost:5432/blocktrust"

# JWT (clés ECDSA ES256)
BLOCKTRUST_JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
BLOCKTRUST_JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Génération des clés JWT (ES256)

```bash
# Générer une paire de clés ECDSA
openssl ecparam -genkey -name prime256v1 -noout -out private-key.pem
openssl ec -in private-key.pem -pubout -out public-key.pem

# Convertir en format PKCS8 pour la clé privée
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in private-key.pem -out private-key-pkcs8.pem
```

Copier le contenu de `private-key-pkcs8.pem` dans `BLOCKTRUST_JWT_PRIVATE_KEY` et `public-key.pem` dans `BLOCKTRUST_JWT_PUBLIC_KEY` (avec `\n` pour les retours à la ligne).

### 4. Initialisation de la base de données

```bash
# Générer le client Prisma
npx prisma generate

# Appliquer les migrations
npx prisma migrate deploy

# (Optionnel) Seed la base de données
npm run seed
```

### 5. Lancement du serveur de développement

```bash
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

## 📝 Scripts disponibles

- `npm run dev` - Lance le serveur de développement
- `npm run build` - Build de production
- `npm run start` - Lance le serveur de production
- `npm run lint` - Vérifie le code avec ESLint
- `npm run seed` - Seed la base de données avec des données de démo

## 🎨 Fonctionnalités implémentées

### ✅ Dashboard
- Affichage des entités et certificats
- Statistiques (certificats actifs, vérifications)
- Navigation vers création, vérification, badges

### ✅ Création d'entités
- Formulaire de création avec validation
- Création automatique d'un certificat associé
- Gestion des erreurs (SIRET unique)

### ✅ Badges et QR codes
- Génération de badges visuels
- QR codes pour vérification rapide
- Affichage des informations de certification

### ✅ Vérification
- Vérification par ID/SIRET (page publique)
- Vérification par token JWT (API V2)
- Détection de falsification (hash mismatch)
- Détection de replay (changement IP/UA)
- Gestion de l'expiration et révocation

### ✅ API V2 - Signatures JWT
- Génération de tokens signés avec ES256
- Canonicalisation des contextes email
- Vérification cryptographique
- Historique des vérifications

## 🔒 Sécurité

- **JWT ES256**: Signatures cryptographiques avec clés ECDSA
- **Hash de contexte**: Protection contre la falsification
- **Anti-replay**: Détection des vérifications suspectes
- **Expiration**: Tokens avec durée de vie limitée
- **Révocation**: Support de la révocation de signatures

## 🚧 Prochaines étapes

- [ ] Authentification utilisateur (Supabase Auth ou NextAuth)
- [ ] Intégration email (plugin/extension)
- [ ] Système de paiement (Stripe)
- [ ] API REST complète
- [ ] Tests unitaires et d'intégration
- [ ] Documentation API (OpenAPI/Swagger)
- [ ] Dashboard admin
- [ ] Export de données
- [ ] Notifications email

## 📄 Licence

Propriétaire - Tous droits réservés

---

**Développé avec ❤️ pour BlockTrust**
