# BLOCKTRUST TrustScan — Tests manuels v1.0.9

Principe : **l'envoi ne doit jamais être bloqué** — le BIS est un bonus.

## Prérequis

- Chrome desktop, extension v1.0.9 (`extension/` ou `blocktrust-trustscan-1.0.9.zip`)
- Clé API connectée dans le popup
- Compte Premium+ pour les scénarios BIS

## 8 scénarios obligatoires

| # | Scénario | Étapes | Résultat attendu |
|---|----------|--------|------------------|
| 1 | AUTO + API rapide | Mode AUTO, rédiger, Envoyer | Email part avec **un seul** bloc BIS |
| 2 | AUTO + API lente (>2,5 s) | Throttle réseau (Slow 3G) | Email part **sans** BIS, composeur **non figé** |
| 3 | AUTO + API down | Couper réseau, envoyer 2× | Emails partent ; après 2 échecs → **BIS AUTO ⚠︎ pause** |
| 4 | Brouillon rouvert | Rouvrir brouillon avec ancien bloc BIS | **Un seul** bloc après envoi |
| 5 | Double-clic Envoyer | Clics frénétiques sur Envoyer | **Un seul** envoi, pas de doublon |
| 6 | Sélectif | Signer (✓ BIS) puis Envoyer ; ou Envoyer sans signer | Les deux cas OK, **pas d'interception** Envoyer |
| 7 | 2 composeurs | Répondre + nouveau message en parallèle | **Un seul** bouton ✓ BIS par composeur |
| 8 | Officiels certifiés | Ouvrir email de `brnbtech@gmail.com` | Badge **✓ Compte officiel BLOCKTRUST™** pour **tous** les viewers |
| 9 | Intégrité hash BIS | Pré-signature warm-up, puis taper du texte, Envoyer | Email part ; `/verify/bis/[id]` valide le **contenu final** (ou envoi sans BIS si timeout) |

## Régressions à vérifier

- **Composeur jamais scanné** : pas de chip « ? Non vérifié » dans le corps d'un brouillon
- **Tooltip** : se ferme au scroll, clic extérieur, Escape, mouseleave (200 ms), auto 8 s max
- **Bouton BIS** : jamais dupliqué dans la barre d'outils

## Build zip

```bash
cd extension
zip -r blocktrust-trustscan-1.0.9.zip manifest.json background content popup icons
```
