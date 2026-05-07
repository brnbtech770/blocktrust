# BLOCKTRUST — Skill Design System
## Charte visuelle, composants, badge SVG, animations

---

## 1. PALETTE DE COULEURS

```typescript
// tailwind.config.ts — couleurs custom
colors: {
  'bt-navy':    '#0a1628',  // Fond principal
  'bt-navy-2':  '#060d1a',  // Fond profond
  'bt-navy-3':  '#0d1f3c',  // Cards, sections
  'bt-cyan':    '#00d4ff',  // Accent principal, CTAs
  'bt-gold':    '#BDA76B',  // Accent premium, bordures
  'bt-red':     '#E05252',  // Danger, fraude, alertes
  'bt-green':   '#10b981',  // Succès, valide
  'bt-orange':  '#f59e0b',  // Avertissement, expiré
}

// Opacités courantes
// text-white/80  → titres secondaires
// text-white/60  → corps de texte
// text-white/40  → sous-textes
// text-white/20  → placeholders, hints
// border-white/10 → bordures subtiles
```

---

## 2. TYPOGRAPHIE

```typescript
// Polices
font-syne  → Titres, wordmarks, accents (font-bold)
font-sans  → Inter — Corps de texte standard
font-mono  → IBM Plex Mono — Données techniques, hashes, IDs

// Hiérarchie titres
h1 → text-3xl sm:text-4xl font-syne font-bold text-white
h2 → text-2xl sm:text-3xl font-syne font-bold text-white
h3 → text-lg font-syne font-semibold text-white
h4 → text-base font-syne font-semibold text-white/80

// Corps
p  → text-sm text-white/60 leading-relaxed
small → text-xs text-white/40

// Labels de section (eyebrow)
.neon-cyan → text-xs uppercase tracking-widest 
             font-semibold text-bt-cyan
.neon-gold → text-xs uppercase tracking-widest 
             font-semibold text-bt-gold
.neon-red  → text-xs uppercase tracking-widest 
             font-semibold text-bt-red
```

---

## 3. COMPOSANTS CARDS

### Card standard
```tsx
<div className="bg-[#0d1f3c] border border-white/10 
  rounded-xl p-6 hover:border-white/20 transition">
  {/* Contenu */}
</div>
```

### Card avec accent cyan
```tsx
<div className="bg-[#00d4ff]/5 border border-[#00d4ff]/20 
  rounded-xl p-6">
  {/* Contenu */}
</div>
```

### Card avec accent gold (premium)
```tsx
<div className="bg-[#BDA76B]/5 border border-[#BDA76B]/20 
  rounded-xl p-6">
  {/* Contenu */}
</div>
```

### Card danger/fraude
```tsx
<div className="bg-[#E05252]/5 border border-[#E05252]/20 
  rounded-xl p-6">
  {/* Contenu */}
</div>
```

---

## 4. BOUTONS

### Bouton primaire (cyan)
```tsx
<button className="px-6 py-3 bg-[#00d4ff] text-[#0a1628] 
  font-semibold text-sm rounded-lg hover:bg-[#00d4ff]/90 
  transition-all duration-200 flex items-center gap-2">
  <IconName className="w-4 h-4" />
  Label
</button>
```

### Bouton secondaire (outline cyan)
```tsx
<button className="px-6 py-3 bg-[#00d4ff]/10 
  hover:bg-[#00d4ff]/20 border border-[#00d4ff]/30 
  text-[#00d4ff] font-semibold text-sm rounded-lg 
  transition-all duration-200">
  Label
</button>
```

### Bouton ghost
```tsx
<button className="px-4 py-2 text-white/50 
  hover:text-white text-sm transition">
  Label
</button>
```

### Bouton danger
```tsx
<button className="px-6 py-3 bg-[#E05252]/10 
  hover:bg-[#E05252]/20 border border-[#E05252]/30 
  text-[#E05252] font-semibold text-sm rounded-lg transition">
  Label
</button>
```

---

## 5. BADGE SVG BLOCKTRUST — RÈGLES

### Tailles standard
```tsx
// Small — emails, listes
<BlockTrustBadge size={60} />

// Medium — dashboard cards
<BlockTrustBadge size={80} />

// Large — page badge dédiée
<BlockTrustBadge size={120} />

// Hero — landing page
<BlockTrustBadge size={200} />
```

### Proportions — TOUJOURS respecter le ratio 1:1
```tsx
// ✅ Correct — carré
<div style={{ width: size, height: size }}>
  <BlockTrustBadge size={size} />
</div>

// ❌ Incorrect — déformé
<div style={{ width: '100%', height: '80px' }}>
  <BlockTrustBadge />
</div>
```

### Badge dans les cards dashboard
```tsx
// Container proportionné
<div className="flex items-center justify-center 
  w-20 h-20 mx-auto mb-4">
  <BlockTrustBadge size={80} />
</div>
```

### Badge dans les emails
```tsx
// NE PAS utiliser BlockTrustBadge.tsx dans les emails
// Utiliser EmailBadge (HTML statique) à la place
// Voir docs/BLOCKTRUST_REACT_EMAIL_SKILL.md
```

---

## 6. ICÔNES LUCIDE — RÈGLES

```tsx
// Import
import { ShieldCheck, ScanLine, BadgeCheck } from 'lucide-react'

// Tailles standard
w-3 h-3  → Très petit (labels, tags)
w-4 h-4  → Standard inline
w-5 h-5  → Boutons, navigation
w-6 h-6  → Cards, sections
w-8 h-8  → Headers, features

// Dans un wrapper coloré
<div className="w-10 h-10 rounded-lg 
  bg-[#00d4ff]/10 border border-[#00d4ff]/20
  flex items-center justify-center">
  <ShieldCheck className="w-5 h-5 text-[#00d4ff]" />
</div>

// JAMAIS d'emojis dans les composants React
// ❌ <span>✅</span>
// ✅ <Check className="w-4 h-4 text-emerald-400" />
```

---

## 7. ANIMATIONS

### Classes d'animation disponibles
```css
animate-fade-up    → Apparition avec translation vers le haut
animate-pulse      → Pulsation (alertes, loading)
animate-spin       → Rotation (loaders)
animate-bounce     → Rebond

/* Delays personnalisés */
[style="animation-delay: 200ms"]
[style="animation-delay: 400ms"]
```

### Halo pulsant (verdicts)
```tsx
// Halo vert (VALIDE)
<div className="absolute inset-0 rounded-full 
  bg-emerald-500/20 blur-2xl animate-pulse" />

// Halo rouge (FRAUDE)
<div className="absolute inset-0 rounded-full 
  bg-red-500/30 blur-2xl animate-pulse" />

// Halo cyan (certifié)
<div className="absolute inset-0 rounded-full 
  bg-[#00d4ff]/20 blur-2xl animate-pulse" />
```

### Transition standard
```tsx
// Toujours utiliser transition-all duration-200
className="transition-all duration-200"

// Hover sur cards
className="hover:border-white/20 transition-all duration-200"
```

---

## 8. KPIs / STATISTIQUES DASHBOARD

```tsx
// Card KPI standard
<div className="bg-[#0d1f3c] border border-white/10 
  rounded-xl p-5">
  <div className="flex items-center gap-3 mb-3">
    <div className="w-8 h-8 rounded-lg bg-[#00d4ff]/10 
      border border-[#00d4ff]/20 
      flex items-center justify-center">
      <IconName className="w-4 h-4 text-[#00d4ff]" />
    </div>
    <p className="text-white/50 text-xs uppercase 
      tracking-widest">
      Label KPI
    </p>
  </div>
  <p className="font-syne font-bold text-2xl text-white">
    {value}
  </p>
  <p className="text-white/30 text-xs mt-1">
    Sous-texte explicatif
  </p>
</div>
```

---

## 9. ÉTATS VISUELS

### Loading
```tsx
<div className="flex flex-col items-center gap-4">
  <div className="w-8 h-8 rounded-full border-2 
    border-[#00d4ff]/30 border-t-[#00d4ff] animate-spin" />
  <p className="text-white/40 text-sm">Chargement...</p>
</div>
```

### Empty state
```tsx
<div className="text-center py-12">
  <IconName className="w-10 h-10 text-white/20 mx-auto mb-3" />
  <p className="text-white/50 text-sm">Aucun élément</p>
  <p className="text-white/30 text-xs mt-1">
    Description de l'état vide
  </p>
</div>
```

### Erreur
```tsx
<div className="bg-[#E05252]/5 border border-[#E05252]/20 
  rounded-xl p-4 flex items-center gap-3">
  <AlertTriangle className="w-5 h-5 text-[#E05252] flex-shrink-0" />
  <p className="text-[#E05252] text-sm">{errorMessage}</p>
</div>
```

### Succès
```tsx
<div className="bg-emerald-500/5 border border-emerald-500/20 
  rounded-xl p-4 flex items-center gap-3">
  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
  <p className="text-emerald-400 text-sm">{successMessage}</p>
</div>
```

---

## 10. RESPONSIVE — BREAKPOINTS

```
sm: 640px  → Tablette portrait
md: 768px  → Tablette paysage
lg: 1024px → Desktop
xl: 1280px → Large desktop

// Mobile first — toujours commencer par mobile
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
className="text-2xl sm:text-3xl lg:text-4xl"
className="px-4 sm:px-6 lg:px-8"
```

---

## 11. ANTI-PATTERNS DESIGN

```tsx
// ❌ Fond blanc ou gris clair
className="bg-white text-black"

// ❌ Bleu slate (legacy)
className="from-blue-950 to-blue-900"

// ❌ Emojis dans les composants
<span>✅ Validé</span>

// ✅ Icônes Lucide
<Check className="w-4 h-4 text-emerald-400" />

// ❌ Bronze/Silver/Gold comme niveaux
badge.level === 'BRONZE'

// ✅ Noms de plans corrects
plan === 'ESSENTIEL'

// ❌ Effet néon sur les titres dashboard
className="text-white drop-shadow-[0_0_8px_#00d4ff]"

// ✅ Titres blancs simples
className="font-syne font-bold text-white"

// ❌ Badge SVG déformé
<div style={{ width: '100%' }}>
  <BlockTrustBadge />
</div>

// ✅ Badge avec ratio 1:1 respecté
<div className="w-20 h-20">
  <BlockTrustBadge size={80} />
</div>
```

*Document généré le 7 mai 2026 — BLOCKTRUST Design System Skill*
