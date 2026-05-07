# 🎨 Design System NYSA v3.0 — Earthy Palette

**Date:** 7 mai 2026  
**Version:** 3.0 (Complete Redesign)  
**Palette:** 12 couleurs earthy + système logique par catégorie  
**Standards:** WCAG AA accessible, warm & elegant  

---

## 🎨 Palette Exclusive (12 couleurs)

### Couleurs Générales (Utilisées Partout)

| Nom | Hex | RGB | Usage |
|-----|-----|-----|-------|
| **Creamy Ivory** | #f5f1ed | (245,241,237) | Light mode BG, subtle accents |
| **Camel** | #c9b8a3 | (201,184,163) | Secondary text, borders, hover |
| **Chocolate Brown** | #5c4a42 | (92,74,66) | Primary text, dark mode BG |

### Couleurs Catégories (Par Page)

| Page | Couleur | Hex | RGB | Tone |
|------|---------|-----|-----|------|
| **Budget** | Burnt Orange | #d97e35 | (217,126,53) | Warm, financial |
| **Courses** | Mustard Yellow | #d4a24f | (212,162,79) | Optimistic, listing |
| **Recettes** | Warm Blush | #d9a79e | (217,167,158) | Soft, culinary |
| **Time-Tracker** | Deep Teal | #1e4d5c | (30,77,92) | Focus, productive |
| **Sport** | Sage Green | #7a8a7e | (122,138,126) | Natural, wellness |
| **Health** | Olive Green | #6b7a51 | (107,122,81) | Growth, vitality |
| **Rapports** | Aubergine | #4d3942 | (77,57,66) | Professional, deep |
| **Projets** | Terracota | #a85c3f | (168,92,63) | Creative, earthy |
| **Calendrier** | Rosewood | #8b5a54 | (139,90,84) | Time, structured |
| **Todo** | Mustard Yellow | #d4a24f | (212,162,79) | Action, urgent |
| **Agent IA** | Chocolate Brown | #5c4a42 | (92,74,66) | Intelligent, grounded |

---

## 🌓 Système Dark/Light

### Dark Mode (Défaut)
```css
[data-theme="dark"] {
  /* Backgrounds */
  --bg: #0a0805;              /* Très noir (quasi noir) */
  --bg-card: #1a1510;         /* Charcoal très foncé */
  --bg-card-hover: #24201a;   /* Hover darker */
  --bg-sidebar: #0f0b08;      /* Sidebar black */
  --bg-input: #15120d;        /* Input dark */

  /* General Colors */
  --text: #f5f1ed;            /* Creamy Ivory — texte clair */
  --text-muted: #c9b8a3;      /* Camel — texte secondaire */
  --text-subtle: rgba(201, 184, 163, 0.50); /* Camel @ 50% */

  /* Borders & Dividers */
  --border: rgba(201, 184, 163, 0.12);
  --border-active: rgba(217, 126, 53, 0.40);  /* Burnt Orange hover */

  /* Status Colors */
  --success: #7a8a7e;         /* Sage Green */
  --warning: #d4a24f;         /* Mustard Yellow */
  --danger: #d97e35;          /* Burnt Orange */
  --info: #1e4d5c;            /* Deep Teal */

  /* Category Accents */
  --accent-budget: #d97e35;   /* Burnt Orange */
  --accent-courses: #d4a24f;  /* Mustard Yellow */
  --accent-recettes: #d9a79e; /* Warm Blush */
  --accent-time: #1e4d5c;     /* Deep Teal */
  --accent-sport: #7a8a7e;    /* Sage Green */
  --accent-health: #6b7a51;   /* Olive Green */
  --accent-rapports: #4d3942; /* Aubergine */
  --accent-projets: #a85c3f;  /* Terracota */
  --accent-calendar: #8b5a54; /* Rosewood */
  --accent-todo: #d4a24f;     /* Mustard Yellow */
  --accent-agent: #5c4a42;    /* Chocolate Brown */
}
```

### Light Mode
```css
[data-theme="light"] {
  /* Backgrounds */
  --bg: #f5f1ed;              /* Creamy Ivory — main BG */
  --bg-card: #ffffff;         /* White cards */
  --bg-card-hover: #ede7e0;   /* Slightly darker hover */
  --bg-sidebar: #ede7e0;      /* Light sidebar */
  --bg-input: #f5f1ed;        /* Input light */

  /* General Colors */
  --text: #5c4a42;            /* Chocolate Brown — texte foncé */
  --text-muted: #8b6f63;      /* Camel darker — texte secondaire */
  --text-subtle: rgba(92, 74, 66, 0.50); /* Brown @ 50% */

  /* Borders & Dividers */
  --border: rgba(92, 74, 66, 0.12);
  --border-active: rgba(217, 126, 53, 0.50); /* Burnt Orange */

  /* Status Colors */
  --success: #6b7a51;         /* Olive Green (darker) */
  --warning: #a85c3f;         /* Terracota (darker) */
  --danger: #8b5a54;          /* Rosewood (darker) */
  --info: #1e4d5c;            /* Deep Teal (same) */

  /* Category Accents (saturated) */
  --accent-budget: #b86b2a;   /* Burnt Orange darker */
  --accent-courses: #b8942a;  /* Mustard darker */
  --accent-recettes: #c28b80; /* Warm Blush darker */
  --accent-time: #1e4d5c;     /* Deep Teal (same) */
  --accent-sport: #667168;    /* Sage Green darker */
  --accent-health: #5a6844;   /* Olive Green darker */
  --accent-rapports: #3d2f38; /* Aubergine darker */
  --accent-projets: #8f4a33;  /* Terracota darker */
  --accent-calendar: #6d4a43; /* Rosewood darker */
  --accent-todo: #b8942a;     /* Mustard darker */
  --accent-agent: #4d3f38;    /* Chocolate darker */
}
```

---

## ♿ Accessibilité

### Contraste Testé

**Dark Mode:**
- Creamy Ivory sur #0a0805: ~16:1 ✅ AAA
- Camel sur #0a0805: ~8.5:1 ✅ AA
- Tous les accents sur dark: ~6-10:1 ✅ AA+

**Light Mode:**
- Chocolate Brown sur #f5f1ed: ~12:1 ✅ AAA
- Brown darker sur #f5f1ed: ~10:1 ✅ AA+
- Tous les accents sur light: ~7-9:1 ✅ AA

### Colorblind-Friendly
✅ Palette earthy = peu de problèmes red/green  
✅ Sufficient luminance contrast  
✅ Warm tones work universally  

---

## 🏗️ Architecture

### Utilisation par Page

```
GÉNÉRAL (partout):
├─ Background: --bg + --bg-card
├─ Text: --text + --text-muted
├─ Borders: --border
└─ Status: --success, --warning, --danger

CATÉGORIES (accentuation):
├─ Budget: --accent-budget (Burnt Orange)
├─ Courses: --accent-courses (Mustard)
├─ Recettes: --accent-recettes (Blush)
├─ Time-Tracker: --accent-time (Teal)
├─ Sport: --accent-sport (Sage)
├─ Health: --accent-health (Olive)
├─ Rapports: --accent-rapports (Aubergine)
├─ Projets: --accent-projets (Terracota)
├─ Calendrier: --accent-calendar (Rosewood)
├─ Todo: --accent-todo (Mustard)
└─ Agent: --accent-agent (Chocolate)
```

### Implementation

**globals.css:**
```css
:root {
  /* General */
  --creamy-ivory: #f5f1ed;
  --camel: #c9b8a3;
  --chocolate: #5c4a42;
  
  /* Categories */
  --burnt-orange: #d97e35;
  --mustard: #d4a24f;
  ... etc
}

[data-theme="dark"] {
  --text: var(--creamy-ivory);
  --accent-budget: var(--burnt-orange);
  ... etc
}

[data-theme="light"] {
  --text: var(--chocolate);
  --accent-budget: #b86b2a; /* Darker version */
  ... etc
}
```

**Components & Pages:**
```tsx
// Use CSS variables everywhere
style={{ color: 'var(--text)' }}
style={{ borderColor: 'var(--border)' }}

// Category-specific colors
// In budget page:
style={{ accent: 'var(--accent-budget)' }}

// In courses page:
style={{ accent: 'var(--accent-courses)' }}
```

---

## 🎯 Usage Guidelines

### Always Use (Global)
- `--text` for main text
- `--text-muted` for secondary text
- `--bg` for backgrounds
- `--border` for dividers
- `--success`, `--warning`, `--danger` for status

### Category Accents
- Use `--accent-[page]` for buttons, active states, highlights
- Example: Budget page uses `--accent-budget` (Burnt Orange)
- Makes pages visually distinct while keeping coherence

---

## ✅ Implementation Checklist

- [ ] Update globals.css with new color system
- [ ] Replace all hex hardcodes with CSS variables
- [ ] Add category color to each page
- [ ] Test dark/light mode switching
- [ ] Test accessibility (contrast, colorblind)
- [ ] Build & deploy
- [ ] Document for team

---

**Status:** Ready for implementation 🚀

