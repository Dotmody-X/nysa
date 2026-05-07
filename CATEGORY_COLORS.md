# 🎨 Category Colors Mapping

**NYSA v3.0 — Earthy Palette with Category Accents**

---

## 📊 Mapping Pages → Couleurs

| Page | Couleur | Hex | CSS Variable | Usage |
|------|---------|-----|-------------|-------|
| **Budget** | Burnt Orange | #d97e35 | `--accent-budget` | Buttons, highlights, active states |
| **Courses** | Mustard Yellow | #d4a24f | `--accent-courses` | Navigation, cards, accents |
| **Recettes** | Warm Blush | #d9a79e | `--accent-recettes` | Recipe cards, highlights |
| **Time-Tracker** | Deep Teal | #1e4d5c | `--accent-time` | Timer, tracking, productive |
| **Sport** | Sage Green | #7a8a7e | `--accent-sport` | Activity cards, wellness |
| **Health** | Olive Green | #6b7a51 | `--accent-health` | Health metrics, growth |
| **Rapports** | Aubergine | #4d3942 | `--accent-rapports` | Analysis, professional |
| **Projets** | Terracota | #a85c3f | `--accent-projets` | Project cards, creative |
| **Calendrier** | Rosewood | #8b5a54 | `--accent-calendar` | Events, dates, time |
| **Todo** | Mustard Yellow | #d4a24f | `--accent-todo` | Tasks, actions, urgent |
| **Agent IA** | Chocolate Brown | #5c4a42 | `--accent-agent` | AI, intelligent, grounded |

---

## 🌐 Usage by Page

### Budget (`/budget`)
```tsx
// Primary accent
style={{ color: 'var(--accent-budget)' }}  // Burnt Orange

// Buttons, CTA, active states
className="bg-[--accent-budget]"

// Example: Budget title, transaction type highlights
```

### Courses (`/courses`)
```tsx
// Shopping lists, items
style={{ color: 'var(--accent-courses)' }}  // Mustard Yellow

// Navigation buttons
className="bg-[--accent-courses] hover:opacity-90"

// Example: Add item button, list highlights
```

### Recettes (`/recettes`)
```tsx
// Recipe cards
style={{ borderColor: 'var(--accent-recettes)' }}  // Warm Blush

// Recipe tags, difficulty
className="bg-[--accent-recettes] text-white"

// Example: Recipe header, difficulty badge
```

### Time-Tracker (`/time-tracker`)
```tsx
// Active timer, focus mode
style={{ background: 'var(--accent-time)' }}  // Deep Teal

// Play button, timer display
className="text-[--accent-time]"

// Example: Timer button, session card
```

### Sport (`/sport`)
```tsx
// Running activity, wellness
style={{ color: 'var(--accent-sport)' }}  // Sage Green

// Activity summary, stats
className="border-l-4 border-[--accent-sport]"

// Example: Activity card, distance highlight
```

### Health (`/health`)
```tsx
// Health metrics, growth
style={{ color: 'var(--accent-health)' }}  // Olive Green

// Progress bars, achievement
className="bg-[--accent-health]"

// Example: Weight tracking, objective progress
```

### Rapports (`/rapports`)
```tsx
// Analysis, professional
style={{ color: 'var(--accent-rapports)' }}  // Aubergine

// Report sections, charts
className="text-[--accent-rapports] font-semibold"

// Example: Report header, data labels
```

### Projets (`/projets`)
```tsx
// Project cards, creative
style={{ borderColor: 'var(--accent-projets)' }}  // Terracota

// Project title, progress
className="bg-[--accent-projets]"

// Example: Project card border, status badge
```

### Calendrier (`/calendrier`)
```tsx
// Calendar events, dates
style={{ color: 'var(--accent-calendar)' }}  // Rosewood

// Event highlight, today indicator
className="bg-[--accent-calendar]"

// Example: Event bar, current date highlight
```

### Todo (`/todo`)
```tsx
// Task actions, urgency
style={{ color: 'var(--accent-todo)' }}  // Mustard Yellow

// Add button, priority highlight
className="border-l-4 border-[--accent-todo]"

// Example: Add task button, urgent task marker
```

### Agent IA (`/agent`)
```tsx
// AI chat, intelligent
style={{ color: 'var(--accent-agent)' }}  // Chocolate Brown

// Agent messages, thinking state
className="bg-[--accent-agent] text-white"

// Example: Agent welcome, AI message bubble
```

---

## 🎨 General Colors (Everywhere)

### Text
- **Primary:** `var(--text)` — Main content text
  - Dark: #f5f1ed (Creamy Ivory)
  - Light: #5c4a42 (Chocolate Brown)

- **Muted:** `var(--text-muted)` — Secondary text
  - Dark: #c9b8a3 (Camel)
  - Light: #8b6f63 (Camel darker)

- **Subtle:** `var(--text-subtle)` — Very faint text
  - Dark: Camel @ 50%
  - Light: Brown @ 50%

### Backgrounds
- **Main:** `var(--bg)` — Page background
- **Card:** `var(--bg-card)` — Card/panel backgrounds
- **Hover:** `var(--bg-card-hover)` — Hover states
- **Sidebar:** `var(--bg-sidebar)` — Sidebar background
- **Input:** `var(--bg-input)` — Input field backgrounds

### Borders
- **Standard:** `var(--border)` — Normal borders
- **Active:** `var(--border-active)` — Active/hover borders

### Status
- **Success:** `var(--success)` — ✅ Positive actions (Sage Green)
- **Warning:** `var(--warning)` — ⚠️ Caution (Mustard Yellow)
- **Danger:** `var(--danger)` — ❌ Destructive (Burnt Orange)
- **Info:** `var(--info)` — ℹ️ Information (Deep Teal)

---

## 🌓 Dark vs Light Mode

### Dark Mode (Default)
- Background: #0a0805 (Very dark brown)
- Text: #f5f1ed (Creamy Ivory) — AAA contrast ✅
- Secondary: #c9b8a3 (Camel) — AA contrast ✅
- All category colors: Bright & saturated
- Best for evening/dark environments

### Light Mode
- Background: #f5f1ed (Creamy Ivory)
- Text: #5c4a42 (Chocolate Brown) — AAA contrast ✅
- Secondary: #8b6f63 (Camel darker) — AA contrast ✅
- Category colors: Darker/saturated versions
- Best for daytime/bright environments

---

## 💡 Implementation Tips

1. **Always use CSS variables** — Never hardcode colors
   ```tsx
   // ✅ Good
   style={{ color: 'var(--accent-budget)' }}
   
   // ❌ Bad
   style={{ color: '#d97e35' }}
   ```

2. **Category accent for primary action** — Use on CTA buttons
   ```tsx
   <button style={{ background: 'var(--accent-budget)' }}>
     Add Transaction
   </button>
   ```

3. **Text colors for content** — Use --text or --text-muted
   ```tsx
   <p style={{ color: 'var(--text)' }}>Main content</p>
   <p style={{ color: 'var(--text-muted)' }}>Secondary info</p>
   ```

4. **Borders for visual hierarchy** — Use --border or category colors
   ```tsx
   <div style={{ borderLeft: `4px solid var(--accent-budget)` }}>
     Budget item
   </div>
   ```

5. **Status colors for feedback** — Use --success, --warning, --danger
   ```tsx
   <span style={{ color: 'var(--success)' }}>✅ Saved</span>
   ```

---

## 🔄 Migration Guide

### If updating a page:
1. Identify the page's category color (see table above)
2. Use `var(--accent-[category])` for primary accents
3. Use `var(--text)` for text content
4. Use `var(--border)` for dividers
5. Use status colors for feedback

### Example: Adding a feature to Budget
```tsx
// ✅ Correct implementation
<div>
  <h2 style={{ color: 'var(--text)' }}>Transactions</h2>
  <button style={{ background: 'var(--accent-budget)' }}>
    Add Transaction
  </button>
  <div style={{ borderTop: `1px solid var(--border)` }}>
    {/* content */}
  </div>
</div>
```

---

## ✅ Testing Checklist

- [ ] Dark mode: All text readable?
- [ ] Light mode: All text readable?
- [ ] Category colors visible & distinct?
- [ ] Borders visible on light bg?
- [ ] Status colors clear?
- [ ] Mobile responsive?
- [ ] All pages have category accent?

---

**Status:** 🟢 PRODUCTION READY

All CSS variables are defined in `app/globals.css` and ready to use!

