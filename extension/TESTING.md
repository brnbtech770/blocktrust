# BLOCKTRUST TrustScan — Tests manuels v1.1.0

Principe : **l'envoi ne doit jamais être bloqué** — le BIS est un bonus.

## Prérequis

- Chrome desktop, extension v1.1.0 (`extension/` ou `npm run extension:pack`)
- Clé API connectée dans le popup
- Compte Premium+ pour les scénarios BIS
- **Badge ACTIVE** sur l'email Gmail expéditeur pour les scénarios BIS

## 9 scénarios obligatoires

| # | Scénario | Étapes | Résultat attendu |
|---|----------|--------|------------------|
| 1 | AUTO + API rapide | Mode AUTO, badge actif sur expéditeur, rédiger, Envoyer | Email part avec **un seul** bloc BIS |
| 2 | AUTO + API lente (>2,5 s) | Throttle réseau (Slow 3G) | Email part **sans** BIS, composeur **non figé** |
| 3 | AUTO + API down | Couper réseau, envoyer 2× | Emails partent ; après 2 échecs → **BIS AUTO ⚠︎ pause** |
| 4 | Brouillon rouvert | Rouvrir brouillon avec ancien bloc BIS | **Un seul** bloc après envoi |
| 5 | Double-clic Envoyer | Clics frénétiques sur Envoyer | **Un seul** envoi, pas de doublon |
| 6 | Sélectif | Signer (✓ BIS) puis Envoyer ; ou Envoyer sans signer | Les deux cas OK, **pas d'interception** Envoyer |
| 7 | 2 composeurs | Répondre + nouveau message en parallèle | **Un seul** bouton ✓ BIS par composeur |
| 8 | Officiels certifiés | Ouvrir email de `brnbtech@gmail.com` | Badge **✓ Compte officiel BLOCKTRUST™** pour **tous** les viewers |
| 9 | Intégrité hash BIS | Pré-signature warm-up, puis taper du texte, Envoyer | Email part ; `/verify/bis/[id]` valide le **contenu final** (ou envoi sans BIS si timeout) |
| 10 | Sans badge expéditeur | Composer depuis email **sans** badge ACTIVE | Pas de bouton BIS ; message « BIS indisponible — aucun badge actif sur cet email » |

## Régressions à vérifier

- **Composeur jamais scanné** : pas de chip « ? Non vérifié » dans le corps d'un brouillon
- **Tooltip** : min 5 s, mouseleave 800 ms, auto-dismiss 15 s, liens cliquables
- **Bouton BIS inline** : compact (~24 px), pas de chevauchement avec Envoyer
- **Bouton BIS** : jamais dupliqué dans la barre d'outils

## Build zip

```bash
npm run extension:pack
# → extension/dist/blocktrust-trustscan-1.1.0.zip
```
