# Design System NYSA v6 — Éditorial

**Date :** 13 août 2026
**Source de vérité :** [`app/globals.css`](app/globals.css) — ce document décrit, le CSS décide.

Philosophie : **la hiérarchie vient de la typo, la couleur est rare et
porteuse de sens.** Blanc/noir neutres, UN accent de marque (outremer),
encres profondes désaturées par catégorie. Ossature néo-brutaliste
conservée : contours 2px, ombres dures « sticker », effet d'appui.
(Historique : v3 earthy et v4/v5 accents vifs abandonnés — git + tag
`style-backup-2026-08-13`.)

---

## 1. Tokens

### Fonds & texte (par thème)

| Token | Dark (défaut) | Light | Usage |
|---|---|---|---|
| `--bg` | `#111111` | `#ffffff` | fond de page |
| `--bg-card` | `#1a1a1a` | `#ffffff` | surfaces / cartes |
| `--bg-card-hover` | `#242424` | `#f2f2f2` | hover de surface |
| `--bg-sidebar` | `#0d0d0d` | `#f7f7f7` | sidebar + bottom nav |
| `--bg-input` | `#171717` | `#fafafa` | champs de saisie |
| `--text` | `#f5f5f5` | `#111111` | texte principal |
| `--text-muted` | `#a3a3a3` | `#6b6b6b` | texte secondaire |
| `--border` | blanc @ 22% | noir @ 16% | séparateurs fins |
| `--ink` | `#f5f5f5` | `#111111` | **contours + ombres brutalistes** |

Le thème `system` suit `prefers-color-scheme` avec les mêmes valeurs.

### Encres

| Token | Valeur | Usage |
|---|---|---|
| `--on-accent` | `#ffffff` | **texte sur TOUTE surface colorée** (les accents sont profonds dans les 2 thèmes) |
| `--ink-dark` | `#111111` | chips noirs volontaires, texte sur chip blanc |
| `--ink-light` | `#ffffff` | texte sur chip noir |

`--chocolate` / `--creamy-ivory` : alias dépréciés.

### Accents — thématisés (profonds en clair, éclaircis en sombre)

**Accent de marque : `--accent-brand` — outremer** (`#2733e0` light /
`#5a63f5` dark). Navigation active, CTA, FAB, focus, sélection. C'est la
SEULE couleur autorisée hors catégories et statuts.

| Token | Light (encre profonde) | Dark (éclairci calme) |
|---|---|---|
| `--accent-brand` / `--info` | `#2733e0` outremer | `#5a63f5` |
| `--accent-budget` | `#a34c24` rouille | `#c96a3e` |
| `--accent-courses` / `--accent-todo` | `#946a08` ocre | `#c29222` |
| `--accent-recettes` | `#a13a5e` framboise | `#c75f85` |
| `--accent-time` / `--azul` | `#232e63` indigo nuit | `#6b79c7` |
| `--accent-sport` | `#38663d` mousse | `#5c9464` |
| `--accent-health` | `#1f6b5c` pin | `#3f9c8a` |
| `--accent-rapports` / `--accent-agent` | `#5a3d78` prune | `#8a68b3` |
| `--accent-projets` | `#3d47a3` indigo | `#7681d6` |
| `--accent-calendar` | `#2e6f8e` pétrole | `#5b9dc0` |
| `--success` | `#1f7a4a` | `#4dae7c` |
| `--warning` | `#97690a` | `#d2a12f` |
| `--danger` | `#c23a1c` | `#d95c3d` |

**Règles couleur v6 :**
- Texte sur surface colorée = `var(--on-accent)`, toujours.
- En thème clair, tous les accents sont lisibles en TEXTE sur blanc (AA).
- Jamais plus d'UNE surface d'accent de catégorie par vue ; le reste en neutre.

### Typo & rayons

- Display : `--font-display` → **Bricolage Grotesque** (variable Next : `--font-saira`).
- Texte : `--font-sans` → **Hanken Grotesk** (variable Next : `--font-sora`).
- Échelle par défaut : h1 28 / h2 20 / h3 16, interlignage 1.15 ; `tabular-nums` global.
- Rayons : `--radius-sm 8px` · `--radius-md 14px` · `--radius-lg 18px` · `--radius-xl 24px`.

---

## 2. API de composants (officielle)

### Classes CSS (globals.css) — à privilégier

| Classe | Rôle |
|---|---|
| `.nb-card` | surface neutre : `--bg-card` + contour 2px `--ink` + ombre `4px 4px 0` |
| `.nb-tile` | même contour/ombre, sans fond (pour surfaces d'accent) |
| `.nb-press` | effet d'appui : hover translate(-2,-2)+ombre 6px, active translate(2,2)+ombre 0 |
| `.on-dark` | sur surface d'accent : bascule texte/bordures en encre claire |
| `.nav-item` / `.nav-group-label` | items + libellés de groupe de la sidebar |
| `.text-brand`, `.text-{catégorie}` | couleurs de texte accent |
| `.toolbar-scroll` | barre d'outils scrollable horizontalement en mobile |

### Composants React (`components/ui/`)

- `Button` — variants `primary` (brand), `secondary`, `ghost`, `danger` ; sizes `sm/md/lg` ; prop `loading`.
- `Card` — `padding sm/md/lg/none`, `hover` (ajoute `nb-press`).
- `Badge`, `StatCard`, `EmptyState`, `PageTitle`, `NysaLogo`, `icons`.

**Règle :** tout nouveau code passe par ces classes/composants — pas de
contour/ombre recopiés à la main, aucun hex en dur (uniquement `var(--…)`).

---

## 3. Principes UX appliqués

- **Chiffres tabulaires** (`tabular-nums` sur `body`) : KPI et montants alignés.
- **Navigation groupée** (loi de Hick) : sections Organiser / Quotidien / Analyser.
- **Survol explicite** : `.nav-item:hover` (pas de `background` inline sur l'état inactif).
- **Cibles tactiles ≥ 44px** en nav mobile (loi de Fitts / WCAG).
- **`prefers-reduced-motion`** : transitions et effets d'appui désactivés.
- **Ultra-large** : contenu borné à 1720px, centré au-delà de 1800px.

---

## 4. Chantier restant (migration progressive)

1. Remplacer les styles inline des pages par `.nb-*` / composants `ui/`
   (page par page ; découper les pages 600–1600 lignes en composants).
2. Supprimer ensuite les hacks responsive `main [style*="repeat(3"]` de
   globals.css, remplacés par de vraies classes de grille responsives.
3. Renommer `--font-saira` / `--font-sora` en noms neutres.
