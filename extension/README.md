# BLOCKTRUST™ TrustScan — Extension Chrome (V1)

Extension Manifest V3 pour vérifier les expéditeurs Gmail via l’API BLOCKTRUST (`/api/extension/verify-sender`).

## Prérequis

- Un compte BLOCKTRUST avec une **clé API extension** (`bt_ext_…`) générée depuis  
  [Paramètres — Tableau de bord](https://blocktrust.tech/dashboard/settings).

## Installation en mode développeur

1. Ouvrez Chrome → **Extensions** (`chrome://extensions/`).
2. Activez **Mode développeur** (en haut à droite).
3. Cliquez **Charger l’extension non empaquetée**.
4. Sélectionnez le dossier **`extension/`** à la racine de ce dépôt (celui qui contient `manifest.json`).
5. L’icône BLOCKTRUST TrustScan apparaît dans la barre d’outils.

## Configuration

1. Cliquez sur l’icône de l’extension.
2. Collez votre clé **`bt_ext_...`** (générée une fois dans les paramètres compte).
3. Cliquez **Connecter**. Les infos profil (plan, TrustScore, contacts) sont chargées via `GET /api/extension/me`.

## Test sur Gmail

1. Assurez-vous d’être connecté dans la popup.
2. Ouvrez [Gmail](https://mail.google.com/) et un message.
3. Le script de contenu tente d’afficher un **badge** à côté de l’expéditeur selon la réponse API  
   (certifié, dans vos contacts, alerte, non certifié).

### Signatures BIS (Phase 2a — v1.0.4+)

- Scan du corps de l’email ouvert pour un lien `blocktrust.tech/verify/bis/[id]`.
- Un seul appel API : `GET /api/extension/verify-sender?email=…&domain=…&bisId=…`
- Badge enrichi : **BIS Niveau N — Signé** (signature valide) ou orange si expirée/invalide.
- **Alerte** : expéditeur certifié qui signe habituellement ses interactions BIS mais email sans lien → avertissement dans la tooltip.

> Phase 2b (header `X-BlockTrust-Signature`) nécessitera des permissions Gmail supplémentaires — hors scope v1.0.4.

> L’UI Gmail change souvent : les sélecteurs dans `content/gmail.js` pourront nécessiter des ajustements.

## Fichiers

| Fichier | Rôle |
|--------|------|
| `manifest.json` | Manifest V3, permissions, content script Gmail |
| `popup/*` | UI configuration (clé API, état connexion) |
| `content/gmail.js` | Détection expéditeurs + appel API |
| `background/service-worker.js` | Worker MV3 minimal |
| `icons/*.png` | Icônes placeholder (à remplacer pour le store) |

## Hébergement API

Par défaut : **`https://blocktrust.tech`**. Pour un autre environnement, modifiez `API_BASE` dans :

- `content/gmail.js`
- `popup/popup.js`

et ajoutez l’origine dans `host_permissions` du `manifest.json`.

## Soumission Chrome Web Store

Remplacer les PNG placeholder par des icônes finales (16 / 48 / 128), compléter la fiche produit et respecter les [politiques des extensions](https://developer.chrome.com/docs/webstore/program-policies/).
