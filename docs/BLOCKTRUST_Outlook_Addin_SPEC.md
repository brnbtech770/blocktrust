# BLOCKTRUST TrustScan — Office Add-in Outlook (Phase 1)

**Produit :** BLOCKTRUST™ TrustScan for Outlook  
**ID produit :** `blocktrust-trustscan-outlook`  
**Version :** 1.0.0  
**Éditeur :** BRNB TECH SAS — https://blocktrust.tech  
**API :** `GET /api/extension/verify-sender` (identique à l’extension Chrome)

---

## Objectif Phase 1

Vérifier l’identité des expéditeurs dans Outlook (Web, Microsoft 365, Outlook.com) via un task pane déclenché depuis le ruban, en réutilisant la clé API extension (`bt_ext_…`) et l’API TrustScan existante.

---

## Architecture

```
Outlook (mailRead)
  └── Ruban « Vérifier l'expéditeur »
        └── Task pane → https://blocktrust.tech/outlook/taskpane
              ├── Office.js (CDN Microsoft)
              ├── localStorage bt_outlook_api_key
              └── GET /api/extension/verify-sender?email=…&bisId=…
                    Authorization: Bearer <apiKey>
```

---

## Manifest

- **Fichier :** `public/outlook/manifest.json` (unified manifest JSON v1.17)
- **URL sideload :** `https://blocktrust.tech/outlook/manifest.json`
- **Task pane :** `https://blocktrust.tech/outlook/taskpane`
- **Permission :** `MailboxItem.Read.User` (lecture de l’élément courant)
- **Contexte ruban :** `mailRead`

---

## Flux task pane

1. `Office.onReady()` — vérifier `Office.context.mailbox.item`
2. Expéditeur : `item.from.emailAddress`
3. Corps email : `item.body.getAsync(Office.CoercionType.Text)` → regex BIS  
   `/blocktrust\.tech\/verify\/bis\/([a-z0-9]+)/i`
4. Clé API : `localStorage.getItem('bt_outlook_api_key')`
5. Appel API verify-sender
6. Affichage selon statut (CERTIFIED, UNKNOWN, FRAUD, bisMissingAlert, erreur)

---

## États UI

| État | Condition |
|------|-----------|
| Non connecté | Pas de clé API |
| Chargement | Appel API en cours |
| Certifié | `status === CERTIFIED` sans alerte BIS manquante |
| Non vérifié | `status === UNKNOWN` |
| Alerte compromission | `bisMissingAlert === true` |
| Fraude | `status === FRAUD` |
| Erreur | Échec réseau / 401 / 429 |

---

## CORS

Origines HTTPS autorisées (en plus de Chrome / Gmail) :

- `https://outlook.office.com`
- `https://outlook.office365.com`
- `https://outlook.live.com`

---

## Clé API

- **Une seule clé** par compte BLOCKTRUST (`bt_ext_…`)
- Générée sur `/dashboard/extension`
- Utilisable pour Chrome TrustScan **et** Outlook TrustScan

---

## Installation sideload (Phase 1)

1. Ouvrir Outlook Web (`outlook.office.com`)
2. Paramètres → Gérer les compléments → Mes compléments
3. Ajouter un complément personnalisé → depuis une URL
4. Coller : `https://blocktrust.tech/outlook/manifest.json`
5. Ouvrir un email → ruban BLOCKTRUST → « Vérifier l'expéditeur »

Publication Microsoft AppSource : Phase 2.

---

## Fichiers

| Fichier | Rôle |
|---------|------|
| `public/outlook/manifest.json` | Manifest Office Add-in |
| `public/outlook/assets/icon-*.png` | Icônes ruban |
| `app/outlook/layout.tsx` | Layout parent minimal |
| `app/outlook/taskpane/layout.tsx` | Layout task pane + Office.js |
| `app/outlook/taskpane/page.tsx` | Page task pane |
| `app/outlook/taskpane/OutlookTaskpaneClient.tsx` | UI client |
| `lib/extension-cors.ts` | CORS Outlook |
| `app/components/dashboard/ExtensionOutlookPanel.tsx` | Instructions dashboard |

---

*BLOCKTRUST™ — BRNB TECH SAS — Juin 2026*
