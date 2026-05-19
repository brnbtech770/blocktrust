# BLOCKTRUST — Trust Engine Skill
## Architecture Intelligence de Confiance Universelle

---

## 1. VISION — LE VRAI PRODUIT BLOCKTRUST

### Ce que BLOCKTRUST n'est PAS
- Un badge
- Un QR code
- Une solution blockchain

### Ce que BLOCKTRUST EST VRAIMENT
**Un Trust Layer universel** — la couche de confiance contextuelle qui manque à Internet.

```
Identité + Réputation + Historique + Contexte + Preuve + Réseau + Interactions
= Graphe de confiance contextualisé
```

### Le Moat réel
La plupart des acteurs font :
- De l'identité (eIDAS, France Identité)
- OU de la réputation (Trustpilot)
- OU du KYC (Stripe Identity, Onfido)
- OU du mail (DMARC, BIMI)

BLOCKTRUST construit :
**Un graphe de confiance contextualisé** — personne ne fait ça.

### Pourquoi maintenant (Why Now)
Les gens utiliseront BLOCKTRUST tous les jours parce que :
- "Ça m'évite une erreur coûteuse"
- "Ça protège ma réputation"
- "Ça filtre mes échanges"
- "Ça sécurise mes paiements"
- "Ça protège mon business"

PAS "c'est sécurisé" — trop abstrait.

---

## 2. TRUST ENGINE™ — LE CERVEAU CENTRAL

### Problème actuel
Aujourd'hui BLOCKTRUST affiche :
```
✔ Certificat valide
```

### Objectif Trust Engine V2
```
✔ Certificat valide
⚠ Domaine créé il y a 3 jours
⚠ Première interaction avec cet expéditeur
⚠ Wallet jamais vu dans le réseau
⚠ Pattern proche d'une fraude détectée récemment
⚠ IP géolocalisation inhabituelle
TrustScore: 62/100 — VIGILANCE RECOMMANDÉE
```

### Architecture Trust Engine

```
ENTRÉES (signaux)
    ↓
[Signal Collector]
    ↓
[Signal Normalizer]
    ↓
[Weight Engine] — pondération dynamique
    ↓
[Decay Engine] — dégradation temporelle
    ↓
[Propagation Engine] — confiance mutualisée
    ↓
[Anti-Sybil Guard]
    ↓
[Score Aggregator]
    ↓
SORTIE : TrustScore + Alertes + Recommandation
```

### Signaux à collecter

#### Signaux identité
- Certificat actif / révoqué / expiré
- KYC vérifié / non vérifié
- Ancienneté du compte
- Cohérence des données (email, domaine, wallet)
- Nombre de vérifications reçues

#### Signaux comportementaux
- Fréquence de vérification
- Patterns d'utilisation (heure, géo, device)
- Historique des interactions
- Vitesse de création des contacts
- Ratio succès/échec vérifications

#### Signaux réseau
- Nombre de connexions Trust Circle
- Qualité du réseau (TrustScore moyen des contacts)
- Relations mutuelles vs unilatérales
- Propagation de la confiance (amis d'amis)
- Isolation dans le graphe (signe Sybil)

#### Signaux techniques
- Age du domaine email
- Réputation IP / ASN
- Email jetable / temporaire
- DMARC/SPF/DKIM pass/fail
- Device fingerprint
- Géolocalisation cohérente

#### Signaux blockchain
- Wallet vérifié / non vérifié
- Historique transactions wallet
- Age du wallet
- Cohérence réseau blockchain

### Pondération des signaux

```typescript
const SIGNAL_WEIGHTS = {
  // Identité (40%)
  kycVerified: 20,
  certificateActive: 10,
  accountAge: 5,
  dataCoherence: 5,

  // Réseau (30%)
  mutualTrustCount: 10,
  networkQuality: 10,
  trustPropagation: 10,

  // Comportement (20%)
  verificationHistory: 8,
  usagePatterns: 7,
  interactionRatio: 5,

  // Technique (10%)
  domainAge: 3,
  ipReputation: 3,
  emailAuthenticity: 4,
}
```

### Decay temporel (dégradation dans le temps)

```typescript
// Un TrustScore se dégrade si pas d'activité
function applyDecay(score: number, daysSinceActivity: number): number {
  const DECAY_RATE = 0.02 // 2% par mois d'inactivité
  const months = daysSinceActivity / 30
  return score * Math.pow(1 - DECAY_RATE, months)
}
```

### Propagation de confiance

```
A ←→ B (MUTUAL, TrustScore A=90, B=85)
B ←→ C (MUTUAL, TrustScore B=85, C=70)

A vérifie C pour la première fois :
→ C reçoit un bonus de confiance indirecte
→ "Dans le réseau de B que vous connaissez"
→ Score contextuel C = 70 + (bonus propagation)
```

### Anti-Sybil Guard

Détecter les faux réseaux de confiance :
- Cluster d'accounts créés le même jour
- Relations mutuelles sans historique d'interaction
- TrustScore uniformément haut dans un cluster isolé
- Même IP / device pour plusieurs comptes

---

## 3. CYBER FRAUD ANALYST SKILL

### Détection statique (actuel) → Détection dynamique (cible)

#### Signaux à ajouter

**IP Reputation**
```typescript
// Vérifier l'IP contre des listes noires
async function checkIpReputation(ip: string) {
  // AbuseIPDB, Spamhaus, Cloudflare Radar
  return { score: 0-100, categories: [] }
}
```

**ASN Reputation**
```typescript
// Les datacenters / VPN sont suspects
function checkAsnType(asn: string) {
  // 'hosting' | 'vpn' | 'residential' | 'mobile'
}
```

**Disposable Email Detection**
```typescript
const DISPOSABLE_DOMAINS = ['mailinator.com', 'guerrillamail.com', ...]
function isDisposableEmail(email: string): boolean
```

**Domain Age**
```typescript
async function getDomainAge(domain: string): Promise<number> {
  // WHOIS API → date création
  // < 30 jours = suspect
  // < 7 jours = très suspect
}
```

**Behavioral Anomalies**
```typescript
interface BehaviorProfile {
  typicalHours: number[]      // heures habituelles
  typicalGeo: string          // pays habituel
  typicalDevice: string       // device habituel
  verificationRate: number    // vérifications/jour
}

function detectAnomaly(current: Event, profile: BehaviorProfile): Alert[]
```

**Geo Anomalies**
```typescript
// Connexion depuis 2 pays en 1 heure = impossible travel
function detectImpossibleTravel(events: LoginEvent[]): boolean
```

**Replay Analysis**
```typescript
// Même certId vérifié 50x en 1h = suspect
function detectReplayAttack(verifications: Verification[]): boolean
```

### Pipeline fraude temps réel

```
Événement (verify/login/create)
    ↓
[Enrichissement] — IP, geo, device, domain
    ↓
[Règles statiques] — listes noires, formats
    ↓
[Règles comportementales] — anomalies
    ↓
[ML Score] — Claude Haiku analyse
    ↓
[Décision] — PASS / FLAG / BLOCK
    ↓
[Action] — log / alerte / ban
```

---

## 4. EMAIL TRUST ENGINEER SKILL

### Stack email authentification complète

**SPF (Sender Policy Framework)**
```
Vérifie que l'IP d'envoi est autorisée
v=spf1 include:resend.com -all
```

**DKIM (DomainKeys Identified Mail)**
```
Signature cryptographique du message
→ Prouve que le contenu n'a pas été modifié
```

**DMARC (Domain-based Message Authentication)**
```
Policy : none / quarantine / reject
→ Que faire si SPF ou DKIM échoue ?
p=reject → l'email est bloqué
```

**ARC (Authenticated Received Chain)**
```
Préserve l'authentification lors du forwarding
→ Critique pour les listes de diffusion
```

**BIMI (Brand Indicators for Message Identification)**
```
Affiche le logo de la marque dans Gmail/Apple Mail
→ Nécessite DMARC p=quarantine ou p=reject
→ VMC (Verified Mark Certificate) optionnel
→ Impact fort sur la confiance utilisateur
```

### Phishing heuristics

```typescript
interface PhishingSignals {
  domainSimilarity: number    // blocktrust.tech vs b1ocktrust.tech
  urgencyLanguage: boolean    // "URGENT", "IMMÉDIAT"
  suspiciousLinks: boolean    // liens raccourcis, redirections
  attachmentRisk: number      // .exe, .zip, macros
  senderMismatch: boolean     // From ≠ Reply-To
  headerAnomalies: string[]   // Received headers inhabituels
}
```

### Futur : Verified Communication Layer

BLOCKTRUST peut devenir la couche de vérification
pour TOUS les emails professionnels :

```
[Email reçu]
    ↓
[Extension Chrome TrustScan]
    ↓
[Vérification BLOCKTRUST]
    ↓
✅ Expéditeur certifié — TrustScore 92/100
   Identité vérifiée KYC
   Domaine officiel confirmé
   SPF/DKIM/DMARC ✅
   Dans votre réseau de confiance
```

---

## 5. SECURITY ARCHITECT SKILL (SENIOR)

### Threat Model BLOCKTRUST

```
Assets critiques :
- Clés privées JWT (signature certificats)
- Clé privée Polygon (ancrage blockchain)
- Données KYC utilisateurs
- TrustScores et graphe de confiance

Menaces principales :
- Compromission clé JWT → faux certificats
- Compromission clé Polygon → faux ancrages
- Vol données KYC → RGPD + réputation
- Manipulation TrustScore → Sybil attack
```

### Secrets Lifecycle

```
Génération → Stockage → Rotation → Révocation → Destruction

Aujourd'hui : secrets Vercel env vars
Cible : AWS KMS / HSM

Rotation automatique :
- JWT keys : tous les 90 jours
- Polygon key : tous les 6 mois
- API keys : révocables à la demande
```

### AWS KMS Migration (roadmap)

```typescript
// Aujourd'hui
const signed = await jose.sign(payload, privateKey)

// Avec AWS KMS
const signed = await kmsClient.sign({
  KeyId: 'arn:aws:kms:eu-west-1:...',
  Message: Buffer.from(payload),
  SigningAlgorithm: 'RSASSA_PKCS1_V1_5_SHA_256',
})
```

### Signed Audit Logs (immutables)

```typescript
interface AuditLog {
  id: string
  timestamp: string
  action: string
  userId: string
  resourceId: string
  hash: string          // SHA-256 du log précédent
  signature: string     // Signé avec clé audit
}
// Chaîne immuable — toute modification détectable
```

### Supply Chain Security

```
- npm audit automatique (CI)
- Dependabot hebdomadaire
- Vérification intégrité packages (lockfile)
- SBOM (Software Bill of Materials) — futur
- Pinning des versions critiques
```

---

## 6. GROWTH / NETWORK EFFECT STRATEGIST SKILL

### Trust Network Theory

BLOCKTRUST est un **réseau de confiance** — sa valeur croît exponentiellement avec le nombre d'utilisateurs (Metcalfe's Law).

```
Valeur réseau = n² (nombre de connexions possibles)
10 users  = 100 connexions
100 users = 10 000 connexions
1000 users = 1 000 000 connexions
```

### Growth Loops

**Loop 1 — Viral via badge**
```
Utilisateur envoie email avec badge
→ Destinataire voit le badge
→ Clique "Vérifier"
→ Découvre BLOCKTRUST
→ S'inscrit
→ Envoie des emails avec son badge
→ Loop
```

**Loop 2 — Trust Circle viral**
```
Utilisateur invite un contact
→ Contact reçoit email d'invitation
→ S'inscrit pour voir le badge de l'invitant
→ Invite ses propres contacts
→ Loop
```

**Loop 3 — B2B organisationnel**
```
1 Admin B2B s'inscrit
→ Invite son équipe (5-50 users)
→ Équipe invite leurs contacts
→ Contacts s'inscrivent
→ Loop B2B → B2C
```

### Reputation Flywheel

```
Plus de vérifications
→ Plus de données comportementales
→ Meilleur TrustScore
→ Plus de confiance accordée
→ Plus d'utilisation
→ Plus de vérifications
```

### B2B Onboarding optimisé

```
Friction minimale :
1. Admin crée l'organisation (2 min)
2. Import CSV membres (30 sec)
3. Email invitation automatique
4. Membres activent en 1 clic
5. Trust Circle partagé automatiquement
```

### Trust Propagation

```
Si A fait confiance à B (TrustScore B=90)
ET B fait confiance à C (TrustScore C=75)
ALORS quand A rencontre C pour la 1ère fois :
→ Afficher : "Dans le réseau de B"
→ TrustScore contextuel C = 75 + bonus indirect
```

---

## 7. EXTENSION & BROWSER SECURITY SPECIALIST SKILL

### Gmail Resilience

Gmail change régulièrement ses sélecteurs DOM.
Stratégie anti-breakage :

```javascript
// Multiple sélecteurs avec fallback
const SENDER_SELECTORS_2026 = [
  '.gD[email]',
  '[email].go',
  '[data-hovercard-id*="@"]',
  '.yP[email]',
  '.zF[email]',
]

// Observer les changements de structure Gmail
const observer = new MutationObserver(debounce(scan, 200))

// Fallback : si aucun sélecteur ne marche
// → alerter l'équipe via Sentry
function reportSelectorFailure() {
  Sentry.captureMessage('Gmail selector failure', 'warning')
}
```

### Permissions minimales (manifest.json)

```json
{
  "permissions": ["storage", "activeTab"],
  "host_permissions": [
    "https://mail.google.com/*",
    "https://blocktrust.tech/*"
  ]
}
```

**Ne PAS demander :**
- `tabs` (accès à tous les onglets)
- `history` (historique)
- `cookies` (cookies)
- `<all_urls>` (tous les sites)

### Chrome Policies

```
- Manifest V3 obligatoire (V2 déprécié 2025)
- Service Worker au lieu de Background Page
- Remote code execution interdit
- CSP stricte dans le popup
```

### Safari / Firefox Strategy (futur)

```
Safari Extension : même code, adapter le manifest
  → Safari Web Extension Converter
Firefox Add-on : WebExtensions API compatible
  → Tester sur Firefox 120+

Priorité : Chrome d'abord, Safari ensuite
(70% des utilisateurs pro sont sur Chrome)
```

---

## 8. DIGITAL IDENTITY / SSI EXPERT SKILL

### Landscape identité décentralisée

**DID (Decentralized Identifiers)**
```
did:web:blocktrust.tech:users:olivier
→ Identifiant universel résolvable
→ Standard W3C
```

**VC (Verifiable Credentials)**
```
{
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  "type": ["VerifiableCredential", "BlockTrustCertificate"],
  "issuer": "did:web:blocktrust.tech",
  "credentialSubject": {
    "id": "did:web:blocktrust.tech:users:olivier",
    "name": "Olivier Bernabé",
    "verified": true
  },
  "proof": { "type": "Ed25519Signature2020", ... }
}
```

**Acteurs à surveiller**
- **Atala PRISM** (Cardano) — VC sur blockchain
- **Spruce** (SpruceID) — DID + VC open source
- **Worldcoin** (World ID) — proof of personhood
- **ENS** (Ethereum Name Service) — réputation Web3
- **eIDAS 2.0** — European Digital Identity Wallet (2026)

### Positionnement BLOCKTRUST vs SSI

```
SSI : standard ouvert, interopérable
BLOCKTRUST : couche applicative sur les standards

BLOCKTRUST peut :
→ Émettre des VC compatibles W3C
→ Ancrer les DID sur Polygon
→ S'interfacer avec eIDAS 2.0
→ Exporter vers d'autres systèmes

Avantage : pas de lock-in
           compatibilité future garantie
```

### eIDAS 2.0 — Risque et Opportunité

```
Risque : l'UE crée un wallet d'identité officiel
         → potentiellement concurrent

Opportunité : BLOCKTRUST devient un layer
              complémentaire (trust social + pro)
              là où eIDAS ne va pas
              (réputation, contexte, réseau)

Timeline eIDAS 2.0 : 2026-2027
→ On a le temps de se positionner
```

---

## 9. ROADMAP PRIORITAIRE (vision Trust Layer)

### Phase 1 — Stabilisation core (maintenant)
```
✅ Trust Engine V1 (TrustScore actuel)
🔴 Trust Engine V2 (signaux dynamiques)
🔴 Extension Chrome Gmail (fonctionnelle)
🔴 Audit visuel dashboard complet
🔴 Optimisation temps connexion
```

### Phase 2 — Intelligence (1-3 mois)
```
□ Signaux IP reputation / ASN
□ Domain age checker
□ Disposable email detection
□ Behavioral anomaly detection
□ Trust propagation indirect
□ Anti-Sybil guard
□ BIMI setup (logo dans Gmail)
```

### Phase 3 — Réseau (3-6 mois)
```
□ Trust Circle viral (invitations)
□ Reputation flywheel actif
□ B2B onboarding optimisé
□ Growth loops instrumentés
□ Métriques réseau (graphe)
```

### Phase 4 — Plateforme (6-12 mois)
```
□ AWS KMS migration
□ DID / VC standards W3C
□ Safari extension
□ App mobile + NFC
□ API publique Trust Layer
□ Webhooks temps réel
□ ISO 27001
```

### Phase 5 — Écosystème (12-24 mois)
```
□ Plugin Outlook
□ Plugin Teams / Slack
□ Intégration CRM (Salesforce, HubSpot)
□ SDK mobile iOS / Android
□ Marketplace partenaires
□ Enterprise SSO / SAML
```

---

## 10. MÉTRIQUES TRUST ENGINE

### KPIs produit
```
- TrustScore moyen réseau
- Taux de fraude détectée (FRAUD_ALERT / total verif)
- Taux de faux positifs
- Précision du score (corrélation fraude réelle)
- Temps de détection (MTTD)
- Temps de résolution (MTTR)
```

### KPIs réseau
```
- Taille moyenne des Trust Circles
- Ratio connexions mutuelles / unilatérales
- Profondeur moyenne du graphe
- Taux de propagation invitations
- DAU / MAU (engagement)
```

### KPIs business
```
- MRR / ARR
- Churn rate par plan
- NPS (Net Promoter Score)
- CAC (Customer Acquisition Cost)
- LTV (Lifetime Value)
- Conversion free → paid
```

---

*BLOCKTRUST Trust Engine Skill — v1.0*
*Généré le 19 mai 2026*
*Source : analyse stratégique Olivier Bernabé / ChatGPT + architecture Claude*

---

## 11. TRUST SCORE FORMULA SPEC (SPEC CANONIQUE)

### Les 4 couches distinctes — TRUST ≠ SECURITY

```
COUCHE 1 — Identity Layer
  Qui es-tu ? (KYC, certificat, email vérifié)

COUCHE 2 — Security Layer
  Es-tu compromis ? (IP rep, device, anomalies)

COUCHE 3 — Reputation Layer
  Quelle est ta réputation ? (réseau, historique)

COUCHE 4 — Context Layer
  Dans ce contexte précis, es-tu fiable ?
  (première interaction, montant, urgence)

→ Quelqu'un peut être :
  - Sécurisé MAIS peu fiable socialement
  - Très réputé MAIS compromis techniquement
  - Certifié MAIS jamais vu dans ce contexte

→ Les 4 couches s'agrègent mais restent séparées
```

### Formule canonique GlobalTrustScore

```
GlobalTrustScore =
  IdentityScore   × 0.40
+ NetworkScore    × 0.30
+ BehaviorScore   × 0.20
+ TechnicalScore  × 0.10

Plage : 0 → 100
```

### IdentityScore (0-100)

```
KYC vérifié          → +40 points
Certificat ACTIVE    → +20 points
Email certifié       → +15 points
Téléphone certifié   → +10 points
Domaine certifié     → +15 points

Pénalités :
KYC rejeté           → -30 points
Certificat révoqué   → -50 points
FRAUD_ALERT passé    → -20 points
```

### NetworkScore (0-100)

```
Nombre contacts MUTUAL :
  0      → 0 pts
  1-5    → 20 pts
  6-20   → 40 pts
  21-50  → 60 pts
  50+    → 80 pts

Qualité réseau (TrustScore moyen contacts) :
  < 50   → 0 pts
  50-70  → 10 pts
  70-85  → 15 pts
  85+    → 20 pts

Pénalités :
Cluster isolé (suspect Sybil) → -20 pts
Toutes connexions < 7 jours   → -15 pts
```

### BehaviorScore (0-100)

```
Ancienneté compte :
  < 7 jours   → 10 pts
  7-30 jours  → 30 pts
  1-6 mois    → 60 pts
  6+ mois     → 80 pts

Activité régulière :
  Connexion hebdomadaire → +10 pts
  Vérifications actives  → +10 pts

Pénalités :
Anomalie géo (impossible travel) → -30 pts
Volume anormal vérifications     → -20 pts
Pattern bot détecté              → -40 pts
```

### TechnicalScore (0-100)

```
Domain email non jetable       → +30 pts
SPF/DKIM/DMARC pass            → +30 pts
IP non blacklistée             → +20 pts
ASN résidentiel (pas datacenter) → +20 pts

Pénalités :
Email jetable (mailinator etc.) → -50 pts
IP blacklistée                  → -40 pts
ASN VPN/datacenter suspect      → -20 pts
Domaine < 30 jours              → -30 pts
```

### Score contextuel (overlay)

```
ContextScore = GlobalTrustScore × ContextMultiplier

Contexte "Première interaction"     → × 0.85
Contexte "Dans réseau de confiance" → × 1.10
Contexte "Transaction financière"   → × 0.90
Contexte "Document sensible"        → × 0.90
Contexte "Contact habituel"         → × 1.05
```

### Decay temporel

```
Si inactif :
  Score × (1 - 0.02)^mois_inactivité

Ex: Score 80, inactif 6 mois
  = 80 × (0.98)^6 = 80 × 0.886 = 70.9
```

### Cold Start (nouveau compte)

```
Nouveau compte (0 vérifications) :
  Score initial = 30/100

Déblocage progressif :
  Email vérifié  → +10 (score 40)
  KYC vérifié    → +20 (score 60)
  1er certificat → +10 (score 70)
  1er contact    → +5  (score 75)
  KYC approuvé   → max 100 possible

Principe : on ne peut pas acheter la confiance
           il faut la gagner progressivement
```

### Anti-manipulation

```
Règle 1 — Pas de score artificiel
  Impossible d'atteindre 100 sans KYC vérifié

Règle 2 — Détection farm accounts
  Cluster de comptes avec mêmes patterns
  → Investigation automatique

Règle 3 — Rate limiting score
  Progression max : +10 points/semaine
  (évite le score gaming rapide)

Règle 4 — Auditabilité
  Chaque variation de score est loggée
  avec raison et timestamp
```

---

## 12. TRUST GRAPH MODEL (STRUCTURE MATHÉMATIQUE)

### Définitions formelles

```
G = (V, E, W) — Graphe pondéré orienté

V = ensemble des noeuds (utilisateurs + entités)
E = ensemble des arêtes (relations de confiance)
W = fonction de poids (force de la relation)
```

### Types de noeuds (Node Types)

```typescript
type NodeType =
  | 'USER'        // Utilisateur BLOCKTRUST
  | 'ENTITY'      // Contact certifié
  | 'DOMAIN'      // Domaine web
  | 'WALLET'      // Wallet crypto
  | 'EMAIL'       // Email certifié
  | 'PHONE'       // Téléphone certifié
  | 'ORG'         // Organisation B2B
```

### Types de relations (Edge Types)

```typescript
type EdgeType =
  | 'MUTUAL_TRUST'     // Confiance bidirectionnelle
  | 'UNILATERAL_TRUST' // A fait confiance à B
  | 'CERTIFIED'        // A certifie l'identité de B
  | 'MEMBER_OF'        // A est membre de l'org B
  | 'OWNS'             // A possède le domaine/wallet B
  | 'INTERACTED'       // A a vérifié B (historique)
```

### Poids des relations (Weighted)

```typescript
interface TrustEdge {
  from: string          // ID noeud source
  to: string            // ID noeud cible
  type: EdgeType
  weight: number        // 0.0 → 1.0
  createdAt: Date
  lastInteraction: Date
  interactionCount: number
  isVerified: boolean   // vérification cryptographique
}

// Calcul du poids
function edgeWeight(edge: TrustEdge): number {
  const age = daysSince(edge.createdAt)
  const recency = daysSince(edge.lastInteraction)
  const frequency = Math.log(edge.interactionCount + 1)

  return Math.min(1.0,
    (frequency * 0.4) +
    (Math.exp(-recency / 365) * 0.4) +  // decay
    (edge.isVerified ? 0.2 : 0.0)
  )
}
```

### Propagation de réputation

```
Algorithme : PageRank adapté (TrustRank)

Pour chaque noeud N :
  TrustRank(N) = (1 - d) + d × Σ(TrustRank(M) / OutDegree(M))
  
  où d = damping factor (0.85)
  M = noeuds qui pointent vers N

Interprétation :
  Un noeud est fiable si
  des noeuds fiables lui font confiance
```

### Graph Traversal (pour vérification contextuelle)

```typescript
// "Êtes-vous dans mon réseau de confiance ?"
async function getTrustPath(
  from: string,   // userId vérificateur
  to: string,     // userId vérifié
  maxDepth: number = 3
): Promise<TrustPath | null> {

  // BFS (Breadth-First Search) pondéré
  // Retourne le chemin le plus court
  // pondéré par la qualité des relations

  return {
    path: ['user_A', 'user_B', 'user_C'],
    totalWeight: 0.72,
    hops: 2,
    explanation: 'Via John que vous connaissez'
  }
}
```

---

## 13. WHY BLOCKTRUST WINS — LE MOAT CUMULATIF

### Le flywheel de confiance

```
┌─────────────────────────────────┐
│                                 │
│  Plus de vérifications          │
│          ↓                      │
│  Plus de données comportementales│
│          ↓                      │
│  TrustScore plus précis         │
│          ↓                      │
│  Plus de confiance accordée     │
│          ↓                      │
│  Plus d'utilisateurs            │
│          ↓                      │
│  Plus de vérifications ────────►│
│                                 │
└─────────────────────────────────┘
```

### Les 5 moats cumulatifs

**Moat 1 — Data Network Effect**
```
Chaque vérification enrichit le modèle
→ Plus de données = meilleur scoring
→ Impossible à copier sans les données
```

**Moat 2 — Trust Graph propriétaire**
```
Le graphe de confiance BLOCKTRUST est unique
→ Chaque relation = donnée exclusive
→ Chaque connexion renforce le réseau
```

**Moat 3 — Réputation acquise**
```
Un TrustScore élevé se gagne sur des mois
→ Switching cost élevé pour les utilisateurs
→ Perdre son score = perdre sa réputation
```

**Moat 4 — Effets de réseau B2B**
```
Une organisation s'inscrit
→ Invite toute son équipe
→ L'équipe invite ses contacts
→ Lock-in organisationnel
```

**Moat 5 — First Mover Verified Email**
```
Le premier à établir un standard de
"Verified Communication Layer" en France
→ Adoption institutionnelle possible
→ Partenariats email providers
```

### Pourquoi maintenant (Why Now)

```
1. Explosion du phishing post-COVID (+400%)
2. IA générative → deepfakes + voice cloning
3. eIDAS 2.0 → conscience identité numérique
4. Remote work → moins de vérification humaine
5. Fraude immobilière en hausse record (France)
6. Réglementation DORA (finance) → besoin trust
```

### Pourquoi BLOCKTRUST (Why Us)

```
1. Fondateur = praticien (agent immo, fraude vécue)
2. Stack technique moderne + IA-assisted
3. Architecture Trust Layer (pas juste badge)
4. Blockchain pour preuve, pas pour gimmick
5. Extension Chrome = distribution naturelle
6. B2C → B2B = land and expand
```

---

*BLOCKTRUST Trust Engine Skill — v2.0 FINAL*
*Généré le 19 mai 2026*
*Intègre : vision Trust Layer, 7 skills critiques,*
*Trust Score Spec, Trust Graph Model, Why Now/Why Us*
