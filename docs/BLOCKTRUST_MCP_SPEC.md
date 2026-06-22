# BLOCKTRUST — Serveur MCP (Model Context Protocol)
## Spécification Technique v2.0

**Date : 21 juin 2026**
**Statut : Prêt pour implémentation**

---

## 1. VISION

BlockTrust comme **infrastructure de confiance pour les agents IA**.

Tout assistant IA connecté au MCP BlockTrust peut :
- **Vérifier** l'identité d'un contact, d'un domaine, d'un site web
- **Vérifier** qu'une interaction est signée (BIS)
- **Signer** une interaction au nom de l'utilisateur
- **Gérer** les contacts, le Trust Circle et le Vault
- **Détecter** le phishing et le typosquatting automatiquement

Positionnement : **le Trust Layer pour l'ère des agents IA.**

---

## 2. ARCHITECTURE

### Type : MCP Server SSE (Server-Sent Events)
- Endpoint : https://blocktrust.tech/mcp/sse
- Transport : SSE (standard MCP)
- Auth : clé API bt_ext_... (même que les extensions Chrome/Outlook)
- Format : JSON-RPC 2.0 (standard MCP)
- Rate limit : 60 req/min par clé API (Upstash)

### Flux
```
Agent IA (Claude, GPT, etc.)
  → Connexion SSE à https://blocktrust.tech/mcp/sse
  → Auth via header Authorization: Bearer bt_ext_...
  → L'agent découvre les 15 tools (tools/list)
  → L'utilisateur pose une question / donne un ordre
  → L'agent appelle le tool BlockTrust approprié
  → BlockTrust répond avec les données
  → L'agent formule la réponse à l'utilisateur
```

### API réutilisée (EXISTANTE — pas de nouvelle logique métier sauf typosquatting)
```
verify_identity         → /api/extension/verify-sender
verify_domain           → Trust Engine (domain-age RDAP, disposable) + Entity lookup
verify_website          → Entity.domain + Entity.website + typosquatting
verify_interaction      → /api/bis/verify/[id]
sign_interaction        → /api/bis/sign
get_trust_score         → Trust Engine V2
list_trusted_domains    → Trust Circle + Entity.domain
check_domain_reputation → Trust Engine (RDAP, SPF, disposable, typosquatting)
add_contact             → /api/extension/add-contact (existe)
search_contacts         → /api/contacts ou Entity query
list_contacts           → Entity query par userId
add_to_trust_circle     → /api/trust-circle
list_trust_circle       → /api/trust-circle
store_in_vault          → /api/vault
search_vault            → /api/vault
```

---

## 3. LES 15 TOOLS MCP

---

### ═══ BLOC A — VÉRIFICATION (8 outils, publics ou auth) ═══

---

### Tool 1 — verify_identity
**Vérifier l'identité d'un contact par email**

```json
{
  "name": "verify_identity",
  "description": "Vérifie si une adresse email est certifiée BLOCKTRUST. Retourne l'identité, le TrustScore, les signaux de confiance et le statut d'ancrage blockchain. Utiliser quand un utilisateur demande si un contact email est fiable, certifié, ou de confiance.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "email": { "type": "string", "description": "L'adresse email à vérifier" }
    },
    "required": ["email"]
  }
}
```

Réponse certifié :
```json
{
  "verified": true,
  "verdict": "CERTIFIED",
  "entityName": "Jean DUPONT",
  "email": "jean@cabinet-dupont.fr",
  "domain": "cabinet-dupont.fr",
  "website": "https://www.cabinet-dupont.fr",
  "trustScore": 87,
  "trustLevel": "TRUST",
  "kycStatus": "VERIFIED",
  "anchored": true,
  "polygonTxHash": "0xabc...",
  "signals": [
    { "name": "Identité vérifiée", "status": true },
    { "name": "Ancrage blockchain", "status": true },
    { "name": "Domaine vérifié", "status": true },
    { "name": "Réseau de confiance", "status": true, "detail": "12 contacts certifiés" }
  ],
  "certifiedSince": "2026-03-15",
  "bisCapable": true,
  "senderUsuallySignsBis": true,
  "verifyUrl": "https://blocktrust.tech/verify?certId=xxx"
}
```

Non certifié :
```json
{
  "verified": false,
  "verdict": "UNKNOWN",
  "email": "inconnu@random.com",
  "domain": "random.com",
  "trustScore": 0,
  "trustLevel": "DANGER",
  "message": "Aucun badge BLOCKTRUST associé à cet email. Soyez prudent."
}
```

---

### Tool 2 — verify_domain
**Vérifier si un domaine est certifié et de confiance**

```json
{
  "name": "verify_domain",
  "description": "Vérifie si un nom de domaine est associé à des entités certifiées BLOCKTRUST. Retourne le nombre d'entités, l'âge du domaine, le TrustScore moyen et les sites web associés. Utiliser quand un utilisateur demande si un domaine ou une organisation est de confiance.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "domain": { "type": "string", "description": "Le nom de domaine (ex: cabinet-dupont.fr)" }
    },
    "required": ["domain"]
  }
}
```

Réponse :
```json
{
  "certified": true,
  "domain": "cabinet-dupont.fr",
  "entityCount": 3,
  "entities": [
    { "name": "Jean DUPONT", "email": "jean@cabinet-dupont.fr", "trustScore": 87, "role": "Notaire" },
    { "name": "Marie MARTIN", "email": "marie@cabinet-dupont.fr", "trustScore": 82, "role": "Clerc" },
    { "name": "Cabinet Dupont", "email": "contact@cabinet-dupont.fr", "trustScore": 91, "type": "BUSINESS" }
  ],
  "domainAge": "8 ans",
  "domainCreated": "2018-02-14",
  "disposable": false,
  "trustScoreAvg": 86.7,
  "anchored": true,
  "website": "https://www.cabinet-dupont.fr",
  "websiteCertified": true
}
```

Non certifié :
```json
{
  "certified": false,
  "domain": "cabinet-dup0nt.fr",
  "entityCount": 0,
  "domainAge": "2 mois",
  "disposable": false,
  "warning": "Ce domaine n'est associé à aucune entité certifiée. Le domaine certifié le plus proche est cabinet-dupont.fr.",
  "similarCertifiedDomains": ["cabinet-dupont.fr"]
}
```

---

### Tool 3 — verify_website
**Vérifier si un site web est légitime et certifié**

```json
{
  "name": "verify_website",
  "description": "Vérifie si un site web appartient à une entité certifiée BLOCKTRUST. Détecte les sites de phishing et le typosquatting. Utiliser quand un utilisateur demande si un lien ou un site est sûr avant de cliquer.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "url": { "type": "string", "description": "L'URL ou le domaine du site (ex: https://www.cabinet-dupont.fr)" }
    },
    "required": ["url"]
  }
}
```

Site certifié :
```json
{
  "legitimate": true,
  "url": "https://www.cabinet-dupont.fr",
  "domain": "cabinet-dupont.fr",
  "owner": {
    "entityName": "Cabinet Dupont",
    "email": "contact@cabinet-dupont.fr",
    "trustScore": 91,
    "anchored": true
  },
  "domainAge": "8 ans",
  "certifiedSince": "2026-03-15",
  "message": "Ce site est certifié BLOCKTRUST. Le propriétaire est vérifié et ancré blockchain."
}
```

Site suspect (typosquatting) :
```json
{
  "legitimate": false,
  "url": "https://cabinet-dup0nt.fr",
  "domain": "cabinet-dup0nt.fr",
  "phishingRisk": "HIGH",
  "typosquatting": {
    "detected": true,
    "similarTo": "cabinet-dupont.fr",
    "technique": "Substitution de caractère (o → 0)",
    "certifiedOriginal": true
  },
  "message": "ATTENTION — Ce domaine ressemble à cabinet-dupont.fr (certifié) mais utilise un '0' au lieu d'un 'o'. Possible tentative de phishing.",
  "certifiedAlternative": {
    "domain": "cabinet-dupont.fr",
    "website": "https://www.cabinet-dupont.fr",
    "verifyUrl": "https://blocktrust.tech/verify?certId=xxx"
  }
}
```

---

### Tool 4 — verify_interaction
**Vérifier une signature BIS**

```json
{
  "name": "verify_interaction",
  "description": "Vérifie une signature d'interaction BLOCKTRUST (BIS). Confirme qu'un email, document ou paiement provient bien de l'identité certifiée. Utiliser quand un utilisateur a reçu un lien de vérification BIS.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "bisId": { "type": "string", "description": "L'identifiant de la signature BIS" }
    },
    "required": ["bisId"]
  }
}
```

Réponse :
```json
{
  "valid": true,
  "bisLevel": 3,
  "bisLevelLabel": "Interaction signée et vérifiée",
  "sender": { "email": "jean@cabinet-dupont.fr", "entityName": "Jean DUPONT", "trustScore": 87 },
  "recipient": "client@example.com",
  "interactionType": "CONTRACT",
  "contextLabel": "Mandat de vente — 15 rue de la Paix",
  "signedAt": "2026-06-20T14:30:00Z",
  "expiresAt": "2026-06-27T14:30:00Z",
  "certificateStatus": "ACTIVE",
  "contentHashVerified": true,
  "verifyUrl": "https://blocktrust.tech/verify/bis/xxx"
}
```

---

### Tool 5 — sign_interaction
**Signer une interaction avec le badge de l'utilisateur**

```json
{
  "name": "sign_interaction",
  "description": "Crée une signature BIS pour une interaction. L'utilisateur doit avoir un badge certifié et ancré. Le contenu n'est JAMAIS transmis — seul le hash SHA-256 est utilisé. Utiliser quand l'utilisateur veut signer un email, document, contrat ou paiement.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "recipientEmail": { "type": "string", "description": "L'email du destinataire" },
      "interactionType": { "type": "string", "enum": ["EMAIL", "DOCUMENT", "PAYMENT_REQUEST", "CONTRACT", "MARKETPLACE"], "description": "Le type d'interaction" },
      "contextLabel": { "type": "string", "description": "Description du contexte (ex: 'Facture Q2')" },
      "contentHash": { "type": "string", "description": "Hash SHA-256 du contenu (calculé côté client)" }
    },
    "required": ["recipientEmail", "interactionType", "contentHash"]
  }
}
```

Réponse :
```json
{
  "success": true,
  "signatureId": "xxx",
  "bisLevel": 3,
  "verifyUrl": "https://blocktrust.tech/verify/bis/xxx",
  "expiresAt": "2026-06-28T14:30:00Z",
  "message": "Interaction signée. Partagez le lien de vérification avec votre destinataire."
}
```

---

### Tool 6 — get_trust_score
**Obtenir le TrustScore détaillé d'un contact**

```json
{
  "name": "get_trust_score",
  "description": "Retourne le TrustScore détaillé d'un contact avec les sous-scores et l'activité BIS. Utiliser quand l'utilisateur veut évaluer le niveau de confiance d'un contact.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "email": { "type": "string", "description": "L'email du contact" }
    },
    "required": ["email"]
  }
}
```

Réponse :
```json
{
  "email": "jean@cabinet-dupont.fr",
  "entityName": "Jean DUPONT",
  "trustScore": 87,
  "trustLevel": "TRUST",
  "recommendation": "Confiance élevée — signaux cohérents et vérifiés.",
  "subScores": {
    "identity": { "score": 95, "weight": 0.4, "detail": "KYC vérifié, ancrage Polygon" },
    "network": { "score": 82, "weight": 0.3, "detail": "12 contacts certifiés, Trust Circle actif" },
    "behavior": { "score": 78, "weight": 0.2, "detail": "8 signatures BIS réussies" },
    "technical": { "score": 90, "weight": 0.1, "detail": "Domaine 8 ans, SPF/DKIM valides" }
  },
  "bisActivity": { "totalSigned": 47, "totalVerified": 38, "lastSignedAt": "2026-06-20T14:30:00Z" }
}
```

---

### Tool 7 — list_trusted_domains
**Lister les domaines de confiance du réseau de l'utilisateur**

```json
{
  "name": "list_trusted_domains",
  "description": "Liste les domaines et sites web certifiés dans le Trust Circle de l'utilisateur. Utiliser quand l'utilisateur demande quels sont ses partenaires de confiance.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "limit": { "type": "number", "description": "Nombre max de résultats (défaut: 20)" }
    }
  }
}
```

Réponse :
```json
{
  "totalDomains": 8,
  "domains": [
    { "domain": "cabinet-dupont.fr", "website": "https://www.cabinet-dupont.fr", "entityCount": 3, "trustScoreAvg": 86.7, "relationship": "MUTUAL" },
    { "domain": "banque-xyz.fr", "website": "https://www.banque-xyz.fr", "entityCount": 12, "trustScoreAvg": 92.1, "relationship": "UNILATERAL" }
  ]
}
```

---

### Tool 8 — check_domain_reputation
**Analyser la réputation d'un domaine**

```json
{
  "name": "check_domain_reputation",
  "description": "Analyse la réputation d'un domaine : âge, disposable, typosquatting, SPF/DKIM. Utiliser quand l'utilisateur veut savoir si un domaine est suspect.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "domain": { "type": "string", "description": "Le domaine à analyser" }
    },
    "required": ["domain"]
  }
}
```

Réponse :
```json
{
  "domain": "cabinet-dup0nt.fr",
  "certified": false,
  "domainAge": "2 mois",
  "disposable": false,
  "typosquatting": { "detected": true, "similarTo": "cabinet-dupont.fr", "technique": "Substitution (o→0)" },
  "spf": false, "dkim": false, "dmarc": false,
  "riskLevel": "HIGH",
  "riskFactors": ["Domaine très récent", "Typosquatting d'un domaine certifié", "Pas de SPF/DKIM/DMARC"],
  "recommendation": "DANGER — Ne pas interagir. Le domaine légitime est cabinet-dupont.fr."
}
```

---

### ═══ BLOC B — GESTION CONTACTS (3 outils, auth requise) ═══

---

### Tool 9 — add_contact
**Ajouter un contact dans le réseau de l'utilisateur**

```json
{
  "name": "add_contact",
  "description": "Ajoute un contact au réseau BLOCKTRUST de l'utilisateur. Si le contact est déjà certifié, ses informations de certification sont automatiquement liées. Utiliser quand l'utilisateur veut enregistrer un nouveau contact.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "email": { "type": "string", "description": "L'email du contact" },
      "name": { "type": "string", "description": "Le nom complet du contact" },
      "label": { "type": "string", "description": "Label ou rôle (ex: 'Notaire', 'Fournisseur', 'Client')" },
      "phone": { "type": "string", "description": "Numéro de téléphone (optionnel)" },
      "domain": { "type": "string", "description": "Domaine professionnel (optionnel, ex: cabinet-dupont.fr)" },
      "website": { "type": "string", "description": "Site web (optionnel)" },
      "notes": { "type": "string", "description": "Notes libres (optionnel)" }
    },
    "required": ["email", "name"]
  }
}
```

Réponse :
```json
{
  "success": true,
  "contactId": "xxx",
  "name": "Jean DUPONT",
  "email": "jean@cabinet-dupont.fr",
  "certified": true,
  "trustScore": 87,
  "message": "Contact ajouté. Jean DUPONT est certifié BLOCKTRUST (TrustScore 87/100).",
  "suggestion": "Vous pouvez l'ajouter à votre Trust Circle pour être alerté en cas de compromission."
}
```

Contact non certifié :
```json
{
  "success": true,
  "contactId": "xxx",
  "name": "Pierre MARTIN",
  "email": "pierre@inconnu.com",
  "certified": false,
  "message": "Contact ajouté. Pierre MARTIN n'est pas encore certifié BLOCKTRUST.",
  "inviteUrl": "https://blocktrust.tech/auth/register?ref=xxx"
}
```

---

### Tool 10 — search_contacts
**Chercher dans ses contacts**

```json
{
  "name": "search_contacts",
  "description": "Recherche dans les contacts BLOCKTRUST de l'utilisateur par nom, email, domaine, label ou secteur. Utiliser quand l'utilisateur cherche un contact spécifique ou veut filtrer ses contacts.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "Terme de recherche (nom, email, domaine, label)" },
      "certifiedOnly": { "type": "boolean", "description": "Filtrer uniquement les contacts certifiés (défaut: false)" },
      "limit": { "type": "number", "description": "Nombre max de résultats (défaut: 20)" }
    },
    "required": ["query"]
  }
}
```

Réponse :
```json
{
  "totalResults": 3,
  "contacts": [
    {
      "name": "Jean DUPONT",
      "email": "jean@cabinet-dupont.fr",
      "domain": "cabinet-dupont.fr",
      "website": "https://www.cabinet-dupont.fr",
      "label": "Notaire",
      "certified": true,
      "trustScore": 87,
      "inTrustCircle": true,
      "relationship": "MUTUAL",
      "lastInteraction": "2026-06-20"
    }
  ]
}
```

---

### Tool 11 — list_contacts
**Lister tous les contacts avec leur statut**

```json
{
  "name": "list_contacts",
  "description": "Liste tous les contacts de l'utilisateur avec leur statut de certification, TrustScore et appartenance au Trust Circle. Utiliser quand l'utilisateur veut voir l'ensemble de son réseau.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "certifiedOnly": { "type": "boolean", "description": "Filtrer les contacts certifiés uniquement" },
      "sortBy": { "type": "string", "enum": ["name", "trustScore", "lastInteraction", "certifiedSince"], "description": "Tri (défaut: name)" },
      "limit": { "type": "number", "description": "Nombre max (défaut: 50)" },
      "offset": { "type": "number", "description": "Offset pour pagination (défaut: 0)" }
    }
  }
}
```

Réponse :
```json
{
  "total": 47,
  "contacts": [
    {
      "name": "Jean DUPONT", "email": "jean@cabinet-dupont.fr",
      "domain": "cabinet-dupont.fr", "website": "https://www.cabinet-dupont.fr",
      "label": "Notaire", "certified": true, "trustScore": 87,
      "inTrustCircle": true, "bisCapable": true
    }
  ],
  "stats": { "total": 47, "certified": 32, "inTrustCircle": 12, "uncertified": 15 }
}
```

---

### ═══ BLOC C — TRUST CIRCLE (2 outils, auth requise) ═══

---

### Tool 12 — add_to_trust_circle
**Ajouter un contact au Trust Circle**

```json
{
  "name": "add_to_trust_circle",
  "description": "Ajoute un contact certifié au Trust Circle de l'utilisateur. Le Trust Circle est le réseau fermé de contacts de confiance — toute compromission d'un membre déclenche une alerte. L'utilisateur doit avoir un plan Premium ou supérieur.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "email": { "type": "string", "description": "L'email du contact à ajouter" },
      "relationship": { "type": "string", "enum": ["MUTUAL", "UNILATERAL", "MANUAL"], "description": "Type de relation (MUTUAL = les deux parties se font confiance, UNILATERAL = confiance unilatérale, MANUAL = ajout sans vérification)" }
    },
    "required": ["email"]
  }
}
```

Réponse :
```json
{
  "success": true,
  "email": "jean@cabinet-dupont.fr",
  "entityName": "Jean DUPONT",
  "relationship": "MUTUAL",
  "trustScore": 87,
  "message": "Jean DUPONT ajouté à votre Trust Circle. Relation mutuelle — vous serez alerté en cas de compromission.",
  "trustCircleSize": 13
}
```

Erreur (plan insuffisant) :
```json
{
  "success": false,
  "error": "Le Trust Circle est disponible à partir du plan Premium.",
  "upgradeUrl": "https://blocktrust.tech/pricing"
}
```

---

### Tool 13 — list_trust_circle
**Lister les membres du Trust Circle**

```json
{
  "name": "list_trust_circle",
  "description": "Liste les membres du Trust Circle de l'utilisateur avec leur TrustScore, type de relation et statut. Utiliser quand l'utilisateur veut voir ses contacts de confiance.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "limit": { "type": "number", "description": "Nombre max (défaut: 50)" }
    }
  }
}
```

Réponse :
```json
{
  "totalMembers": 12,
  "members": [
    {
      "entityName": "Jean DUPONT", "email": "jean@cabinet-dupont.fr",
      "domain": "cabinet-dupont.fr", "website": "https://www.cabinet-dupont.fr",
      "trustScore": 87, "relationship": "MUTUAL",
      "certificateStatus": "ACTIVE", "addedAt": "2026-04-15",
      "lastBisInteraction": "2026-06-20"
    }
  ],
  "stats": { "mutual": 8, "unilateral": 3, "manual": 1 }
}
```

---

### ═══ BLOC D — VAULT (2 outils, auth requise) ═══

---

### Tool 14 — store_in_vault
**Stocker une donnée sensible dans le Vault**

```json
{
  "name": "store_in_vault",
  "description": "Stocke une donnée sensible (RIB, IBAN, contrat, clé, identifiant) dans le Vault chiffré BLOCKTRUST de l'utilisateur. La donnée peut être associée à un contact certifié pour faciliter la vérification croisée. Utiliser quand l'utilisateur veut sauvegarder une information sensible de façon sécurisée.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "label": { "type": "string", "description": "Nom de l'entrée (ex: 'RIB Fournisseur ABC', 'Contrat location')" },
      "type": { "type": "string", "enum": ["RIB", "IBAN", "CONTRACT", "IDENTITY", "CREDENTIAL", "OTHER"], "description": "Type de donnée" },
      "value": { "type": "string", "description": "La donnée à stocker (sera chiffrée)" },
      "associatedEmail": { "type": "string", "description": "Email du contact associé (optionnel — pour vérification croisée)" },
      "notes": { "type": "string", "description": "Notes complémentaires (optionnel)" },
      "expiresAt": { "type": "string", "description": "Date d'expiration ISO (optionnel)" }
    },
    "required": ["label", "type", "value"]
  }
}
```

Réponse :
```json
{
  "success": true,
  "vaultEntryId": "xxx",
  "label": "RIB Fournisseur ABC",
  "type": "RIB",
  "associatedContact": {
    "email": "compta@fournisseur-abc.com",
    "certified": true,
    "trustScore": 82
  },
  "storedAt": "2026-06-21T15:00:00Z",
  "message": "RIB stocké dans votre vault, associé à fournisseur-abc.com (certifié, TrustScore 82)."
}
```

---

### Tool 15 — search_vault
**Chercher dans le Vault**

```json
{
  "name": "search_vault",
  "description": "Recherche dans le Vault chiffré de l'utilisateur par label, type ou contact associé. Peut être utilisé pour vérifier si une donnée (ex: RIB) correspond à ce qui est stocké — détecte les tentatives de fraude au faux RIB. Utiliser quand l'utilisateur cherche une information stockée ou veut comparer une donnée reçue avec ce qui est enregistré.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "Terme de recherche (label, email associé, type)" },
      "type": { "type": "string", "enum": ["RIB", "IBAN", "CONTRACT", "IDENTITY", "CREDENTIAL", "OTHER"], "description": "Filtrer par type (optionnel)" },
      "associatedEmail": { "type": "string", "description": "Filtrer par contact associé (optionnel)" },
      "compareValue": { "type": "string", "description": "Valeur à comparer avec l'entrée stockée — si différente, alerte fraude potentielle (optionnel)" }
    },
    "required": ["query"]
  }
}
```

Réponse normale :
```json
{
  "totalResults": 1,
  "entries": [
    {
      "vaultEntryId": "xxx",
      "label": "RIB Fournisseur ABC",
      "type": "RIB",
      "value": "FR76 3000 1234 5678 9012 3456 789",
      "associatedContact": {
        "email": "compta@fournisseur-abc.com",
        "certified": true,
        "trustScore": 82
      },
      "storedAt": "2026-06-15",
      "notes": "Validé par téléphone le 15/06"
    }
  ]
}
```

Réponse avec alerte fraude (compareValue ≠ valeur stockée) :
```json
{
  "totalResults": 1,
  "entries": [...],
  "fraudAlert": {
    "detected": true,
    "severity": "CRITICAL",
    "message": "ATTENTION — Le RIB reçu ne correspond PAS au RIB stocké dans votre vault pour ce fournisseur.",
    "storedValue": "FR76 3000 1234 5678 9012 3456 789",
    "receivedValue": "FR76 9999 8888 7777 6666 5555 444",
    "difference": "IBAN complètement différent — possible fraude au faux RIB.",
    "recommendation": "Ne procédez PAS au virement. Contactez votre fournisseur par téléphone pour vérifier.",
    "associatedContactBis": {
      "email": "compta@fournisseur-abc.com",
      "usuallySignsBis": true,
      "thisInteractionSigned": false,
      "alert": "Ce contact signe habituellement ses interactions. L'email avec le nouveau RIB n'est PAS signé."
    }
  }
}
```

---

## 4. IMPLÉMENTATION TECHNIQUE

### Structure des fichiers
```
app/mcp/
  sse/route.ts                      → Endpoint SSE principal (MCP transport)
  page.tsx                          → Page documentation publique /mcp
lib/mcp/
  server.ts                         → MCP Server (tools/list, tools/call, dispatch)
  auth.ts                           → Auth par clé API bt_ext_...
  types.ts                          → Types MCP (JSON-RPC, Tool, ToolResult)
  tools/
    verify-identity.ts              → Tool 1
    verify-domain.ts                → Tool 2
    verify-website.ts               → Tool 3
    verify-interaction.ts           → Tool 4
    sign-interaction.ts             → Tool 5
    get-trust-score.ts              → Tool 6
    list-trusted-domains.ts         → Tool 7
    check-domain-reputation.ts      → Tool 8
    add-contact.ts                  → Tool 9
    search-contacts.ts              → Tool 10
    list-contacts.ts                → Tool 11
    add-to-trust-circle.ts          → Tool 12
    list-trust-circle.ts            → Tool 13
    store-in-vault.ts               → Tool 14
    search-vault.ts                 → Tool 15
  helpers/
    typosquatting.ts                → Détection typosquatting (Levenshtein + homoglyphs)
    sanitize.ts                     → Réexport de sanitizeDisplayText
```

### Dépendance
```
npm install @modelcontextprotocol/sdk
```

### Auth
- Clé API bt_ext_... (même que Chrome/Outlook)
- Hash SHA-256 vérifié en DB (User.extensionApiKeyHash)
- Rate limit : 60 req/min par clé (Upstash, clé bt:mcp:{hash})
- Tools lecture (verify, list, search) : accessibles à tous les plans
- Tools écriture contacts : accessibles à tous les plans
- Tools Trust Circle : Premium+ uniquement
- Tools Vault : Premium+ uniquement (ou B2B)
- Tool sign_interaction : plan payant + certificat ancré

### Sécurité
- Sanitization : sanitizeDisplayText sur TOUTES les données sortantes
- Vault : données chiffrées at rest, déchiffrées uniquement pour le propriétaire
- compareValue (search_vault) : comparaison en mémoire, jamais loggée
- CORS : pas nécessaire (MCP = SSE server-to-server, pas browser)

---

## 5. CAS D'USAGE ANTI-FRAUDE (le plus puissant)

### Scénario : Fraude au faux RIB via MCP

```
1. L'utilisateur stocke le RIB de son fournisseur dans le Vault
   → store_in_vault("RIB Fournisseur ABC", "RIB", "FR76 3000...",
     associatedEmail: "compta@fournisseur-abc.com")

2. Un pirate compromet la boîte email du fournisseur

3. Le pirate envoie : "Nouveau RIB, merci de mettre à jour : FR76 9999..."

4. L'utilisateur demande à Claude :
   "Mon fournisseur ABC m'envoie un nouveau RIB : FR76 9999 8888..."

5. Claude appelle automatiquement :
   → search_vault(query: "RIB fournisseur ABC",
     compareValue: "FR76 9999 8888...")
   → verify_identity("compta@fournisseur-abc.com")

6. Claude répond :
   "⚠ ALERTE CRITIQUE — 3 signaux de fraude détectés :
    1. Le RIB reçu (FR76 9999...) est DIFFÉRENT du RIB stocké (FR76 3000...)
    2. L'email de notification n'est PAS signé BIS
    3. Ce fournisseur signe habituellement ses interactions
    → Ne procédez PAS au virement. Appelez votre fournisseur
      pour confirmer le changement de RIB."

7. Fraude évitée. Le pirate avait accès à la boîte email mais PAS
   à la clé BIS ni au Vault BlockTrust.
```

---

## 6. PUBLICATION & DISTRIBUTION

### Registre MCP Anthropic
```
Nom         : BLOCKTRUST TrustScan
URL         : https://blocktrust.tech/mcp/sse
Description : "Vérifiez l'identité de vos contacts, la légitimité des domaines
               et sites web, gérez votre réseau de confiance et détectez la fraude
               — directement depuis votre assistant IA."
Catégorie   : Sécurité / Identité / Anti-fraude
```

### Compatibilité
```
Claude.ai / Claude Code / Claude Desktop → MCP natif SSE
GPT / ChatGPT → wrapper OpenAPI (Phase 3)
Autres agents MCP-compatibles → SSE standard
```

---

## 7. ROADMAP MCP

```
Phase 1 (maintenant) : 15 tools, SSE, auth bt_ext_..., documentation /mcp
Phase 2 : Publication registre Anthropic → apparition dans le catalogue Claude.ai
Phase 3 : Wrapper OpenAPI pour GPT/ChatGPT
Phase 4 : Monitoring MCP (usage par tool, conversion, taux de fraude détectée)
Phase 5 : Tools avancés (batch verify, webhook notifications, Trust Graph query, import CSV contacts)
```
