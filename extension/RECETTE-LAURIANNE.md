# BLOCKTRUST™ — Recette Laurianne (≈ 15 min)

**Compte test :** laurianne@winter-keys.com  
**Extension :** TrustScan pour Gmail v1.1.0 (Chrome Web Store ou rechargement local)  
**Prérequis :** clé API `bt_ext_…` connectée dans la popup extension

---

## 1. Connexion extension (2 min)

1. Ouvrir [Gmail](https://mail.google.com/) avec `laurianne@winter-keys.com`.
2. Cliquer l’icône **BLOCKTRUST TrustScan pour Gmail** → coller la clé API → **Connecter**.
3. Vérifier : statut **Connecté**, plan et TrustScore affichés.

**OK si :** popup verte « Connecté », pas d’erreur 401.

---

## 2. Badge expéditeur — lecture email (2 min)

1. Ouvrir un email **reçu** (pas le composeur).
2. Survoler le badge à côté de l’expéditeur (certifié ou « ? Non vérifié »).
3. Lire la tooltip ; si lien présent, cliquer dessus.

**OK si :** tooltip reste **≥ 5 secondes**, reste ouverte tant que la souris est dessus, lien cliquable.

---

## 3. BIS — email sans badge actif (3 min)

1. Nouveau message depuis un compte Gmail **sans** badge BLOCKTRUST actif sur cet email expéditeur.
2. Vérifier qu’**aucun bouton BIS** n’apparaît dans la barre d’outils.
3. Vérifier le texte discret : *« BIS indisponible — aucun badge actif sur cet email »*.
4. Envoyer un email test → l’envoi doit être **normal**, sans interception.

**OK si :** pas de BIS, envoi Gmail fluide.

---

## 4. BIS — email avec badge actif (3 min)

1. Composer depuis l’email qui a un **badge ACTIVE** BLOCKTRUST.
2. Mode extension : **Sélectif** (popup → Signature BIS).
3. Vérifier le bouton **✓ BIS** dans le composeur.
4. Rédiger un message, cliquer **✓ BIS**, puis **Envoyer**.

**OK si :** signature insérée, email parti une seule fois.

---

## 5. Réponse inline — layout Gmail (2 min)

1. **Répondre** à un email (composeur inline, pas popup).
2. Vérifier : bouton BIS **compact** (≈ 24 px), **pas de chevauchement** avec Envoyer.
3. Cliquer **Envoyer** sans friction.

**OK si :** barre d’outils Gmail intacte, envoi facile.

---

## 6. Dashboard — ajouter un contact (3 min)

1. [blocktrust.tech/dashboard](https://blocktrust.tech/dashboard) → **Ajouter un contact**.
2. Remplir un **Particulier** (prénom, nom, email **tiers** — pas votre email compte).
3. Valider → message de succès contact (pas « badge » ou « certificat »).

**OK si :** redirection contacts avec succès ; **aucun certificat** créé pour ce contact.

---

## 7. Doublon contact (1 min)

1. Réessayer d’ajouter le **même email** contact.
2. Message attendu : *« Ce contact existe déjà dans votre carnet »* (pas message badge).

---

## 8. Instructions Outlook (1 min — lecture)

1. Dashboard → **Extension** → section Outlook.
2. Vérifier les 3 variantes : **Outlook Web (recommandé)**, Mac, Windows.

**OK si :** instructions claires, note « phase de test » + recommandation Gmail Chrome.

---

## En cas de problème

| Symptôme | Action |
|----------|--------|
| Extension ancienne | Chrome → `chrome://extensions` → **Recharger** ou installer v1.1.0 |
| BIS sur mauvais email | Vérifier quel email a le badge ACTIVE dans le dashboard |
| Contact = message badge | Hard refresh dashboard (Cmd+Shift+R) |
| Tooltip disparaît vite | Confirmer version **1.1.0** dans `chrome://extensions` |

---

**Signaler à Olivier :** numéro du scénario en échec + capture écran + email expéditeur Gmail utilisé.
