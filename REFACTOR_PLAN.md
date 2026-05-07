# 📋 REFACTOR PLAN — Remove Demo Data & Improve UX

**Status:** In Progress  
**Priority:** High (UX blocking)  
**Commits:** 1/3 done

---

## ✅ Commit 1 — Accessibility & EmptyState Foundation
**Status:** DONE ✅  
**Commit:** `c9efd60`

- ✅ Fixed contrast in light mode (WCAG AA)
- ✅ Created `EmptyState.tsx` component
- ✅ Ready for integration across pages

---

## 📝 Commit 2 — Clean Up Courses Page
**Status:** PENDING  
**Pages:** `app/(app)/courses/page.tsx`, `app/(app)/courses/inventaire/page.tsx`

### Current Problems:
```tsx
// courses/page.tsx
const WEEK_SPEND = [
  { label: 'Lun', v: 24 },
  { label: 'Mar', v: 31 },
  // ... hardcoded demo data
]
```

### Changes Required:
1. **Remove WEEK_SPEND** — Replace with real user data from Supabase
2. **Load from DB:** `SELECT SUM(amount) FROM shopping_lists WHERE created_at >= now() - interval '7 days'`
3. **Show EmptyState** when no shopping lists exist
4. **Clean up UI:**
   - Remove mock promotional data
   - Only show real user lists
   - Add "Create New List" button

### Code Changes:
```tsx
// BEFORE
const WEEK_SPEND = [ /* hardcoded */ ]
return <div>{WEEK_SPEND.map(...)}</div>

// AFTER
const [userLists, setUserLists] = useState([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  fetchUserShoppingLists().then(setUserLists).finally(() => setLoading(false))
}, [])

if (loading) return <div>Loading...</div>
if (!userLists.length) return <EmptyState title="Aucune liste de courses" action={{ label: "Créer une liste", href: "/courses/new" }} />
return <div>{userLists.map(...)}</div>
```

### Files to Modify:
- [ ] `app/(app)/courses/page.tsx` — Main page
- [ ] `app/(app)/courses/inventaire/page.tsx` — Inventory page
- [ ] `hooks/useCourses.ts` — Add `fetchUserShoppingLists()` if missing

### Testing:
- [ ] Test with 0 lists (EmptyState)
- [ ] Test with 1+ lists (show data)
- [ ] Test light/dark mode contrast
- [ ] Test mobile responsiveness

---

## 📝 Commit 3 — Clean Up Recettes Page
**Status:** PENDING  
**Pages:** `app/(app)/recettes/page.tsx`, `app/(app)/recettes/[id]/page.tsx`

### Current Problems:
```tsx
// Loads mockRecipes or default demo recipes
// Shows "No recipes saved" but actually has demo data
```

### Changes Required:
1. **Load from DB only** — Remove all mock data
2. **Query:** `SELECT * FROM recipes WHERE user_id = $1 ORDER BY created_at DESC`
3. **Show EmptyState** when user has 0 saved recipes
4. **Add "New Recipe" button** in EmptyState

### Code Structure:
```tsx
// BEFORE
const [recipes, setRecipes] = useState(mockRecipes) // ❌ Demo data

// AFTER
const [recipes, setRecipes] = useState([]) // ✅ Empty by default
const [loading, setLoading] = useState(true)

useEffect(() => {
  fetchUserRecipes().then(setRecipes).finally(() => setLoading(false))
}, [])

if (!recipes.length && !loading) {
  return <EmptyState
    title="Aucune recette sauvegardée"
    description="Créez votre première recette personnalisée"
    action={{ label: "Nouvelle recette", href: "/recettes/new" }}
  />
}
```

### Files to Modify:
- [ ] `app/(app)/recettes/page.tsx` — List view
- [ ] `app/(app)/recettes/[id]/page.tsx` — Detail view (already loads from DB ✅)
- [ ] `app/(app)/recettes/toutes/page.tsx` — All recipes view

### Testing:
- [ ] User with 0 recipes sees EmptyState
- [ ] User with recipes sees list
- [ ] Can create new recipe from EmptyState button
- [ ] Light/dark mode works
- [ ] Mobile layout works

---

## 📝 Commit 4 — Clean Up Budget Page (Complex)
**Status:** PENDING  
**Pages:** `app/(app)/budget/page.tsx`

### Current Problems:
```tsx
// Large component (~400 lines)
// Uses INITIAL_COMPTES from hook (demo data)
// Fallback: JSON.parse(...) ?? INITIAL_COMPTES
// Multiple hardcoded colors (#F2542D, #0E9594, etc.)
```

### Changes Required:
1. **Remove INITIAL_COMPTES** — Use empty array `[]` by default
2. **Load from Supabase** — `SELECT * FROM accounts WHERE user_id = $1`
3. **Show EmptyState** when no accounts/transactions
4. **Refactor colors** — Replace hex with `var(--)`

### Key Changes:
```tsx
// hooks/useBudget.ts
export const INITIAL_COMPTES = [] // ✅ Empty by default (or remove entirely)

// app/(app)/budget/page.tsx
const [comptes, setComptes] = useState([])
// Remove fallback: ?? INITIAL_COMPTES

if (!comptes.length && !transactions.length) {
  return <EmptyState
    title="Aucun compte ou transaction"
    description="Créez un compte bancaire pour commencer"
    action={{ label: "Ajouter un compte", onClick: () => openCreateAccountModal() }}
  />
}
```

### Color Refactoring:
```tsx
// BEFORE
style={{ color: '#F2542D' }}
style={{ fill: '#0E9594' }}

// AFTER
style={{ color: 'var(--accent)' }}
style={{ fill: 'var(--dark-cyan)' }}
```

### PALETTE Array:
```tsx
// Still OK for gradient charts, but document as internal
const PALETTE = [...] // Chart-specific colors (not theme)
```

### Complexity:
- ⚠️ Large file (400+ lines)
- ⚠️ Multiple sub-components (DonutChart, FluxChart, Drawer, etc.)
- ⚠️ Complex state management
- ⚠️ Multiple modals/drawers

**Recommendation:** Break into smaller commits:
- Commit 4a: Refactor colors only
- Commit 4b: Remove demo data + add EmptyState
- Commit 4c: Refactor state management (if time)

### Files to Modify:
- [ ] `hooks/useBudget.ts` — Remove/empty INITIAL_COMPTES
- [ ] `app/(app)/budget/page.tsx` — Full refactor (consider breaking into smaller pieces)

---

## 🔄 Priority Order

**Done:**
1. ✅ Accessibility fix (contrast)
2. ✅ EmptyState component

**Recommended Next:**
1. **Courses** (simpler, high impact)
2. **Recettes** (medium complexity)
3. **Budget** (complex, break into sub-commits)
4. **Time-tracker** (if needed)
5. **Projets** (if needed)

---

## 📊 Metrics

| Page | Demo Data | Lines | Complexity | Status |
|------|-----------|-------|-----------|--------|
| courses | WEEK_SPEND | ~300 | Medium | 📝 PENDING |
| recettes | Mock array | ~250 | Medium | 📝 PENDING |
| budget | INITIAL_COMPTES | ~400 | High | 📝 PENDING |
| time-tracker | Sessions | ~350 | High | 📝 OPTIONAL |
| projets | Demo projects | ~300 | High | 📝 OPTIONAL |

---

## ✅ Success Criteria

### All Pages:
- [ ] Zero demo/hardcoded data shown by default
- [ ] EmptyState displays when user has no data
- [ ] "Create New" buttons prominent in EmptyState
- [ ] Light mode readable (contrast ✅)
- [ ] Dark mode still works perfectly
- [ ] Mobile responsive
- [ ] No console errors

### User Experience:
- [ ] New user opens app → sees empty state (not confusing demo)
- [ ] Can immediately create/add their own data
- [ ] Clear CTAs for first-time actions
- [ ] Smooth transitions as data loads

---

## 📅 Timeline Estimate

| Task | Time | Notes |
|------|------|-------|
| Courses refactor | 45 min | Straightforward |
| Recettes refactor | 45 min | Medium complexity |
| Budget refactor | 2h | Complex, may split |
| Testing all pages | 45 min | Light/dark + mobile |
| **Total** | **4-5h** | Conservative estimate |

---

## 🚀 Next Steps

**NOW:**
1. Review this plan with Nathan
2. Prioritize: Courses first or Budget first?
3. Start with highest priority

**Per Commit:**
1. Make changes
2. Test thoroughly
3. Commit with detailed message
4. Push to GitHub
5. Notify in Telegram

---

**Ready to start Commit 2 (Courses)?** 🚀

