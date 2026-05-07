# CHANGELOG — NYSA

All notable changes to NYSA are documented in this file.

---

## [Unreleased]

### 🎨 Styling (Latest)

#### 🔧 Refactoring: Tailwind-First Approach
**Commit:** `cf355e5` (with docs), `5b4d87d` (code changes)  
**Status:** ✅ Merged to main

- **Removed:** 40+ hex-hardcoded colors
- **Added:** Tailwind utility classes for all colors
- **Compliance:** 100% design system adherence
- **Impact:** Zero visual changes, pure code quality

**Files Changed:**
- `components/ui/Button.tsx` — Colors → CSS vars
- `components/ui/Card.tsx` — Hover states → var()
- `components/ui/StatCard.tsx` — Accents → CSS vars
- `app/(app)/page.tsx` — Massive refactor (40+ hex → 0)
- `app/globals.css` — Added Tailwind color classes

**Before/After:**
| Metric | Before | After |
|--------|--------|-------|
| Hex hardcoded | 40+ | 0 |
| CSS variables | 20% | 100% |
| Tailwind purity | 5% | 60% |
| Visual changes | — | ZERO ✅ |

**See Also:** `STYLING_REFACTOR.md` for detailed breakdown

---

## [v1.0.0] — Initial Release

Initial NYSA release with core features:
- Dashboard with daily overview
- Calendar integration
- Time tracking
- Project management
- Health tracking
- Budget management
- AI Agent integration
- Multi-theme support (Dark/Light/System)

