# BLOCKTRUST — Skill Extension Chrome TrustScan
## Manifest V3, Gmail content script, publication

---

## 1. STRUCTURE OBLIGATOIRE

```
extension/
├── manifest.json          ← Manifest V3
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── content/
│   └── gmail.js           ← Content script Gmail
├── background/
│   └── service-worker.js  ← Service Worker (pas background.js)
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

---

## 2. MANIFEST V3 — RÈGLES

```json
{
  "manifest_version": 3,
  "name": "BLOCKTRUST TrustScan",
  "version": "1.0.0",
  "permissions": ["storage", "activeTab"],
  "host_permissions": [
    "https://mail.google.com/*",
    "https://blocktrust.tech/*"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "content_scripts": [{
    "matches": ["https://mail.google.com/*"],
    "js": ["content/gmail.js"],
    "run_at": "document_idle"
  }],
  "background": {
    "service_worker": "background/service-worker.js"
  }
}
```

### Différences MV2 → MV3
```
MV2 background.js → MV3 service_worker
MV2 browser_action → MV3 action
MV2 XMLHttpRequest → MV3 fetch()
MV2 eval() → MV3 interdit
MV2 remote code → MV3 interdit
```

---

## 3. CONTENT SCRIPT GMAIL

### Sélecteurs Gmail (stables)
```javascript
// Expéditeur dans un email ouvert
'.gD'                    // Span avec attribut email
'[email]'                // Tout élément avec attribut email
'.go'                    // Nom affiché expéditeur

// Récupérer l'email
const email = el.getAttribute('email') 
  || el.getAttribute('data-hovercard-id')

// Thread list (liste emails)
'.bA4'                   // Ligne de thread
'.zF'                    // Nom expéditeur dans liste
```

### MutationObserver pattern
```javascript
function observeGmail() {
  const observer = new MutationObserver(async (mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue
        const senders = node.querySelectorAll?.('[email], .gD') || []
        for (const el of senders) {
          if (el.dataset.btProcessed) continue
          el.dataset.btProcessed = 'true'
          await processSender(el)
        }
      }
    }
  })
  observer.observe(document.body, {
    childList: true,
    subtree: true
  })
}
// Lancer immédiatement + observer
processSendersInView()
observeGmail()
```

### Cache 1 heure
```javascript
const cache = new Map()
const CACHE_TTL = 3600000

function getCached(key) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() })
}
```

---

## 4. CHROME STORAGE API

```javascript
// Sauvegarder la clé API
chrome.storage.local.set({ apiKey: 'bt_ext_...' })

// Récupérer la clé API
chrome.storage.local.get(['apiKey'], (result) => {
  const apiKey = result.apiKey
})

// Supprimer (déconnexion)
chrome.storage.local.remove(['apiKey', 'userData'])

// Async/await pattern
async function getApiKey() {
  return new Promise(resolve => {
    chrome.storage.local.get(['apiKey'], result => {
      resolve(result.apiKey || null)
    })
  })
}
```

---

## 5. CORS DEPUIS L'EXTENSION

### Dans next.config.ts (côté serveur)
```typescript
// Autoriser les requêtes depuis extensions Chrome
const corsHeaders = {
  'Access-Control-Allow-Origin': 'chrome-extension://*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}
```

### Dans les routes API extension
```typescript
// app/api/extension/*/route.ts
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}
```

---

## 6. BADGES VISUELS DANS GMAIL

```javascript
function createBadge(status) {
  const badge = document.createElement('span')
  badge.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 1px 6px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 600;
    font-family: Inter, sans-serif;
    margin-left: 6px;
    vertical-align: middle;
    border: 1px solid;
  `
  
  const styles = {
    CERTIFIED: {
      bg: 'rgba(16,185,129,0.1)',
      border: 'rgba(16,185,129,0.4)',
      color: '#10b981',
      text: '✓ Certifié BLOCKTRUST'
    },
    IN_CONTACTS: {
      bg: 'rgba(0,212,255,0.1)',
      border: 'rgba(0,212,255,0.3)',
      color: '#00d4ff',
      text: '● Dans vos contacts'
    },
    FRAUD: {
      bg: 'rgba(239,68,68,0.15)',
      border: 'rgba(239,68,68,0.5)',
      color: '#ef4444',
      text: '⚠ Alerte fraude'
    },
    UNKNOWN: {
      bg: 'rgba(255,255,255,0.05)',
      border: 'rgba(255,255,255,0.1)',
      color: 'rgba(255,255,255,0.35)',
      text: '? Non certifié'
    }
  }
  
  const s = styles[status] || styles.UNKNOWN
  badge.style.background = s.bg
  badge.style.borderColor = s.border
  badge.style.color = s.color
  badge.textContent = s.text
  return badge
}
```

---

## 7. ICONS REQUIS

### Tailles obligatoires
```
icon16.png  → 16×16px  (favicon barre d'extensions)
icon48.png  → 48×48px  (page extensions chrome://extensions)
icon128.png → 128×128px (Chrome Web Store)
```

### Générer depuis le SVG BLOCKTRUST
```bash
# Avec ImageMagick
convert badge.svg -resize 16x16 icon16.png
convert badge.svg -resize 48x48 icon48.png
convert badge.svg -resize 128x128 icon128.png
```

---

## 8. TESTER EN DÉVELOPPEMENT

```
1. Chrome → chrome://extensions/
2. Activer "Mode développeur" (toggle haut droite)
3. "Charger l'extension non empaquetée"
4. Sélectionner le dossier extension/
5. Aller sur mail.google.com
6. Ouvrir un email → voir le badge apparaître
7. Cliquer l'icône extension → connecter la clé API
```

### Debug content script
```javascript
// Dans gmail.js
console.log('[BLOCKTRUST]', 'Extension chargée')
// Voir dans : DevTools Gmail → Console → filter "BLOCKTRUST"
```

---

## 9. PUBLICATION CHROME WEB STORE

### Prérequis
```
1. Compte développeur Chrome Web Store (5$ unique)
   → https://chrome.google.com/webstore/devconsole
2. Extension packagée en .zip (dossier extension/)
3. Screenshots : 1280×800 ou 640×400 (min 1, max 5)
4. Icône store : 128×128px
5. Description FR + EN
6. Politique de confidentialité URL
```

### Créer le .zip
```bash
cd extension/
zip -r ../blocktrust-trustscan.zip . \
  --exclude "*.DS_Store" \
  --exclude "*.git*"
```

### Délai de review Google
```
Première soumission : 1-3 semaines
Mises à jour : 2-3 jours ouvrés
```

### Politique de confidentialité requise
```
Doit mentionner :
- Données collectées (email expéditeur)
- Utilisation (vérification via API BLOCKTRUST)
- Stockage (clé API en chrome.storage.local)
- Pas de vente de données
URL : https://blocktrust.tech/privacy
```

---

## 10. ANTI-PATTERNS

```javascript
// ❌ eval() — interdit en MV3
eval('code...')

// ❌ Remote scripts — interdits
<script src="https://external.com/script.js">

// ❌ Accès DOM sans vérification
document.querySelector('.gD').textContent // peut être null

// ✅ Toujours vérifier
const el = document.querySelector('.gD')
if (!el) return

// ❌ Fetch sans timeout
await fetch(url)

// ✅ Fetch avec timeout
const controller = new AbortController()
setTimeout(() => controller.abort(), 5000)
await fetch(url, { signal: controller.signal })
```

*Document généré le 7 mai 2026 — BLOCKTRUST Chrome Extension Skill*
