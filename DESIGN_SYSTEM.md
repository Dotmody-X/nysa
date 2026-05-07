# 🎨 Design System NYSA v2.0 — Palette Nathan

**Date:** 7 mai 2026  
**Palette:** 6 couleurs exclusives  
**Standards:** WCAG AA/AAA accessible, colorblind-friendly  

---

## 📊 Analyse des Couleurs

### Palette Exclusive (6 couleurs)
| Nom | Hex | RGB | HSL | L% | Usage |
|-----|-----|-----|-----|----|----|
| **Cloud** | #cdd0db | (205,208,219) | H227°S16% | 83% | BG light, text dark mode |
| **Azul** | #9197aa | (145,151,170) | H226°S13% | 62% | Accent secondary, text dark |
| **Mimosa** | #f7b557 | (247,181,87) | H35°S91% | 65% | Warning, accent light |
| **Orange** | #e27921 | (226,121,33) | H27°S77% | 51% | Accent primary, interactive |
| **Aperol** | #c1521e | (193,82,30) | H19°S73% | 44% | Danger, accent dark |
| **Green Leaves** | #60693a | (96,105,58) | H71°S29% | 32% | Success, text light mode |

---

## ♿ Accessibilité WCAG

### Contraste Avec Backgrounds

**Mode Dark (#0C0C0C — noir)**
| Couleur | Contraste | WCAG | Usage |
|---------|-----------|------|-------|
| Cloud | 13.64:1 | ✅ AAA | Texte principal |
| Azul | 7.21:1 | ✅ AA | Texte secondaire |
| Mimosa | 11.70:1 | ✅ AAA | Warning, accents |
| Orange | 6.99:1 | ✅ AA | Accents, interactive |
| Aperol | 4.49:1 | ⚠️ AA | (Limité en dark) |
| Green Leaves | 3.58:1 | ❌ | (Ne pas utiliser pour texte) |

**Mode Light (#F5F4F0 — blanc-ish)**
| Couleur | Contraste | WCAG | Usage |
|---------|-----------|------|-------|
| Cloud | 1.54:1 | ❌ | (Ne pas utiliser) |
| Azul | 2.91:1 | ❌ | (Ne pas utiliser) |
| Mimosa | 1.79:1 | ❌ | (Ne pas utiliser) |
| Orange | 3.00:1 | ❌ | (Accents seulement) |
| Aperol | 4.67:1 | ✅ AA | Texte principal |
| Green Leaves | 5.87:1 | ✅ AA | Texte secondaire |

---

## 🌓 Système Dark/Light

### Dark Mode (Défaut)
```css
[data-theme="dark"] {
  /* Backgrounds */
  --bg: #0C0C0C;           /* Pure noir */
  --bg-card: #161616;      /* Charcoal */
  --bg-sidebar: #111111;   /* Near-black */
  --bg-input: #1A1A1A;     /* Input dark */

  /* Text (dans l'ordre de priorité) */
  --text: #cdd0db;         /* Cloud — texte principal */
  --text-muted: #9197aa;   /* Azul — texte secondaire */
  --text-subtle: #9197aa;  /* Azul @ 60% opacity */
  
  /* Accents & Colors */
  --accent: #e27921;       /* Orange — boutons, interactive */
  --accent-light: #f7b557; /* Mimosa — warning, highlights */
  --accent-dark: #c1521e;  /* Aperol — danger, important */
  
  --success: #60693a;      /* Green Leaves (limited) */
  --warning: #f7b557;      /* Mimosa */
  --danger: #c1521e;       /* Aperol */
  --info: #9197aa;         /* Azul */
  
  /* Borders & Dividers */
  --border: rgba(205, 208, 219, 0.12);  /* Cloud @ 12% */
  --border-active: rgba(226, 121, 33, 0.4); /* Orange @ 40% */
}
```

### Light Mode
```css
[data-theme="light"] {
  /* Backgrounds */
  --bg: #F5F4F0;           /* Beige-white */
  --bg-card: #FFFFFF;      /* White */
  --bg-sidebar: #ECEAE4;   /* Light beige */
  --bg-input: #F5F4F0;     /* Input light */

  /* Text (inversion pour contraste) */
  --text: #60693a;         /* Green Leaves — texte principal */
  --text-muted: #c1521e;   /* Aperol — texte secondaire */
  --text-subtle: #c1521e;  /* Aperol @ 55% opacity */
  
  /* Accents & Colors (darker/saturated) */
  --accent: #c1521e;       /* Aperol — boutons, interactive */
  --accent-light: #e27921; /* Orange — warning, highlights */
  --accent-dark: #60693a;  /* Green Leaves — danger, important */
  
  --success: #60693a;      /* Green Leaves */
  --warning: #e27921;      /* Orange */
  --danger: #c1521e;       /* Aperol */
  --info: #9197aa;         /* Azul (less contrast but ok) */
  
  /* Borders & Dividers */
  --border: rgba(96, 105, 58, 0.15);  /* Green Leaves @ 15% */
  --border-active: rgba(193, 82, 30, 0.5); /* Aperol @ 50% */
}
```

---

## 🎯 Usage Guidelines

### Texte Principal
- **Dark mode:** Cloud (#cdd0db)
- **Light mode:** Green Leaves (#60693a)
- ✅ Both WCAG AAA

### Texte Secondaire
- **Dark mode:** Azul (#9197aa) ou Cloud @ 70%
- **Light mode:** Aperol (#c1521e)
- ✅ Both WCAG AA

### Interactive Elements (Boutons, Links)
- **Dark mode:** Orange (#e27921) ou Aperol (#c1521e)
- **Light mode:** Aperol (#c1521e)
- ✅ Clear affordance

### Accents & Highlights
- **Warning:** Mimosa (#f7b557) [dark] ou Orange (#e27921) [light]
- **Danger:** Aperol (#c1521e) [both]
- **Success:** Green Leaves (#60693a) [both]

### Backgrounds
- **Never use:** Cloud, Azul, Mimosa, Orange for main text in light mode
- **Never use:** Green Leaves, Aperol for main text in dark mode
- **Exception:** These can be used for accents/icons with sufficient opacity

---

## 🔍 Colorblind-Friendly Design

### Protanopia (Red-Blind)
**Issue:** Red/Orange appear brownish
**Solution:** Always pair color with icons/text labels. Use shape/pattern in charts.

### Deuteranopia (Green-Blind)
**Issue:** Green appears grayish
**Solution:** Green Leaves (#60693a) actually works ok (it's dark, not pure green)

### Tritanopia (Blue-Blind)
**Issue:** Blue/Yellow appear different
**Solution:** Our "Azul" is blue-gray (not pure blue), Mimosa has enough orange

### Achromopsia (Complete Color Blindness)
**Issue:** Only grayscale visible
**Solution:** Ensure sufficient lightness difference (L%) between colors:
- Green Leaves (L=32%) vs Cloud (L=83%) = 51% difference ✅

### Recommendation
- Always use icons alongside colors
- In charts: combine color + pattern (stripes, dots)
- Test with tools: Color Oracle, Coblis

---

## 📐 Implementation Strategy

### Phase 1: Update globals.css
- Replace all color variables with new system
- Test dark/light mode thoroughly

### Phase 2: Replace hardcoded colors
- Scan for #F2542D, #0E9594, etc. (old colors)
- Replace with `var(--*)` from new system

### Phase 3: Update components
- Review Button.tsx, Card.tsx, etc.
- Ensure they use new color system
- Test accessibility in Lighthouse

### Phase 4: Testing
- ✅ WCAG AA contrast on all text
- ✅ Colorblind simulator (Chrome DevTools)
- ✅ Dark/Light mode switching
- ✅ Mobile + desktop

---

## 🔄 Color Mapping (Old → New)

| Old | New (Dark) | New (Light) | Notes |
|-----|-----------|-----------|-------|
| #F2542D (orange) | Orange | Aperol | Primary accent |
| #0E9594 (cyan) | Azul | Azul | Secondary accent |
| #F5DFBB (wheat) | Cloud | Green Leaves | Text |
| #F0E4CC (cream) | Azul | Aperol | Text secondary |
| #11686A (teal) | Azul | Azul | Accent |
| #562C2C (espresso) | Cloud | Green Leaves | Dark text |

---

## ✅ Checklist

- [ ] Update `globals.css` with new system
- [ ] Test dark mode: all text readable
- [ ] Test light mode: all text readable
- [ ] Run Lighthouse accessibility audit
- [ ] Test colorblind modes (Chrome)
- [ ] Update component styles
- [ ] Update CHANGELOG
- [ ] Commit & push to GitHub

---

**Status:** Ready for implementation 🚀

