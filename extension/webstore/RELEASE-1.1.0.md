# Chrome Web Store — TrustScan pour Gmail v1.1.0

## Fichier à uploader

```
extension/dist/blocktrust-trustscan-gmail-1.1.0.zip
```

Génération : `npm run extension:pack`

---

## Version

| Champ | Valeur |
|-------|--------|
| Nom fiche store | **BLOCKTRUST TrustScan pour Gmail** |
| Version | **1.1.0** |
| Version précédente store | 1.0.9 (ou dernière publiée) |

---

## Notes de version (français — coller dans le dashboard)

```
v1.1.0 — Juillet 2026

• BIS : la signature n’est proposée que si votre adresse Gmail expéditrice possède un badge BLOCKTRUST actif
• Tooltips expéditeur : lecture confortable (5 s minimum, liens cliquables)
• Composeur Gmail : bouton BIS compact en réponse/transfert inline (ne gêne plus Envoyer)
• Badge BIS AUTO : affiché uniquement en composeur plein écran / popup
• Stabilité et corrections diverses
```

## Release notes (English — optional)

```
v1.1.0 — July 2026

• BIS signing only when the sender Gmail address has an active BLOCKTRUST badge
• Improved sender tooltips (5s minimum, clickable links)
• Compact BIS button in inline reply/forward compose
• BIS AUTO badge only in popup/full-screen compose
• Stability fixes
```

---

## Visuels store (déjà dans `extension/webstore/`)

| Asset | Fichier |
|-------|---------|
| Capture principale | `screenshot.png` |
| Promo petite | `promo-small.png` / `promo-small-128.png` |
| Promo grande | `promo-large.png` / `promo-large-128.png` |
| Source capture Gmail | `_source/gmail-trustscan-capture.jpg` |

Regénérer capture si besoin : `node scripts/prepare-webstore-screenshot.js`

---

## Checklist soumission

- [ ] Zip v1.1.0 uploadé (pas de dossier parent dans le zip)
- [ ] Notes de version FR collées
- [ ] Politique de confidentialité : https://blocktrust.tech/privacy
- [ ] Site : https://blocktrust.tech
- [ ] Permissions justifiées : `storage`, `activeTab`, `mail.google.com`, `blocktrust.tech`
- [ ] Tester install depuis le brouillon store sur un compte test avant publication

---

## Après publication

Les utilisateurs existants reçoivent la mise à jour automatiquement (24–48 h).  
Pour test immédiat : mode développeur → charger `extension/dist/blocktrust-trustscan-1.1.0/`.
