# BLOCKTRUST TrustScan — Tests manuels extension Gmail

Version cible : **1.0.9**  
Principe : **l'envoi ne doit jamais être bloqué** — le BIS est un bonus.

## Prérequis

- Chrome (desktop), extension chargée depuis `extension/` ou zip `blocktrust-trustscan-1.0.9.zip`
- Clé API BLOCKTRUST connectée dans le popup
- Compte avec droit BIS (Premium+) pour les scénarios de signature

## Mode AUTO

| # | Scénario | Étapes | Résultat attendu |
|---|----------|--------|------------------|
| 1 | API rapide | Mode AUTO, rédiger email, cliquer Envoyer | Email part avec **un seul** bloc BIS bleu |
| 2 | API lente (>2,5 s) | Throttle réseau (DevTools → Slow 3G) ou cold start | Email part **sans** BIS, **pas de freeze** du composeur |
| 3 | API down | Couper réseau, envoyer 2 fois de suite | Chaque email part ; après 2 échecs → badge **« BIS AUTO ⚠︎ pause »**, toast discret |
| 4 | Brouillon rouvert | Rouvrir un brouillon contenant un ancien bloc BIS, envoyer | **Un seul** bloc BIS dans le corps final |
| 5 | Double-clic Envoyer | Cliquer frénétiquement sur Envoyer | **Un seul** envoi, pas de doublon ni composeur figé |

## Mode SÉLECTIF (défaut)

| # | Scénario | Étapes | Résultat attendu |
|---|----------|--------|------------------|
| 6 | Signer puis envoyer | Clic ✓ BIS → attendre « Signé » → Envoyer | Bloc BIS présent, envoi normal |
| 7 | Envoyer sans signer | Ne pas cliquer BIS, cliquer Envoyer directement | Envoi **immédiat**, sans interception |

## Cas Gmail variés

| # | Scénario | Résultat attendu |
|---|----------|------------------|
| 8 | Répondre à un email | Bouton BIS (sélectif) ou AUTO sans freeze |
| 9 | Transférer | Idem |
| 10 | Composeur plein écran | Badge AUTO en bas à gauche, ne chevauche pas les contrôles Gmail |
| 11 | 2 composeurs ouverts | Chaque fenêtre gère ses flags indépendamment |

## Tooltips lecture (gmail.js)

| # | Scénario | Résultat attendu |
|---|----------|------------------|
| 12 | Survol badge puis scroll | Tooltip bleue se ferme |
| 13 | Changement d'email ouvert | Tooltip ne reste pas figée |

## Vérification post-échec (circuit breaker)

1. Provoquer 2 échecs d'interception (réseau coupé + watchdog)
2. Vérifier badge **« BIS AUTO ⚠︎ pause »**
3. Recharger l'onglet Gmail → interception AUTO réactivée si compteur réinitialisé après envoi réussi

## Build zip

```bash
cd extension
zip -r blocktrust-trustscan-1.0.9.zip manifest.json background content popup icons
```
