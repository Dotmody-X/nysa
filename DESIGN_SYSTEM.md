# Design System NYSA v5 — Néo-brutalisme neutre

**Date :** 13 août 2026
**Source de vérité :** [`app/globals.css`](app/globals.css) — ce document décrit, le CSS décide.

Langage visuel : fond **blanc/noir neutre**, encre franche, accents vifs,
contours 2px et ombres dures « sticker ». L'ancienne palette earthy (v3) et le
papier crème (v4) sont abandonnés — l'historique git conserve les anciennes docs
(`DESIGN_SYSTEM_V3.md`, `CATEGORY_COLORS.md`, …) et le tag `style-backup-2026-08-13`.

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
| `--text-subtle` | texte @ 50% | texte @ 50% | texte tertiaire |
| `--border` | blanc @ 22% | noir @ 16% | séparateurs fins |
| `--ink` | `#f5f5f5` | `#111111` | **contours + ombres brutalistes** |

Le thème `system` suit `prefers-color-scheme` avec les mêmes valeurs.

### Encres fixes (indépendantes du thème)

À utiliser pour le texte posé **sur un fond d'accent** :

| Token | Valeur | Usage |
|---|---|---|
| `--ink-dark` | `#111111` | texte sur accent clair (tangerine, jaune, ciel) |
| `--ink-light` | `#ffffff` | texte sur accent foncé (cobalt, violet, indigo) |

`--chocolate` et `--creamy-ivory` sont des **alias dépréciés** de ces deux
tokens (conservés pour compat, ne plus les utiliser).

### Accents

**Accent de marque** : `--accent-brand` (`#ff5c35`, tangerine). C'est LA couleur
NYSA — navigation active, CTA, FAB, focus, sélection de texte. Décision v5 :
l'app utilise **un accent de marque unique** ; les accents de catégorie servent
uniquement à colorer ponctuellement une surface (stickers, graphes, badges).

| Token | Valeur | Note |
|---|---|---|
| `--accent-brand` | `#ff5c35` | tangerine — marque |
| `--accent-budget` | `#ff5c35` | réservé à la page Budget |
| `--accent-courses` / `--accent-todo` | `#ffc23d` | jaune soleil (fond clair → `--ink-dark`) |
| `--accent-recettes` | `#ff4d8d` | rose vif |
| `--accent-time` / `--azul` | `#2d5bff` | cobalt |
| `--accent-sport` | `#18b26b` | vert gazon |
| `--accent-health` | `#12b5a5` | turquoise |
| `--accent-rapports` / `--accent-agent` | `#8b5cf6` | violet |
| `--accent-projets` | `#6c5ce7` | indigo |
| `--accent-calendar` | `#36c5f0` | ciel |

Statuts : `--success #18b26b` (light : `#0e9c5e`), `--warning #ffc23d`
(light : `#e0a01f`), `--danger #ff5c35`, `--info #2d5bff`.

### Typo & rayons

- Display (titres, labels uppercase) : `--font-display` → **Bricolage Grotesque**
  (⚠️ la variable Next s'appelle `--font-saira` pour raison historique).
- Texte : `--font-sans` → **Hanken Grotesk** (variable Next : `--font-sora`).
- Rayons : `--radius-sm 8px` · `--radius-md 14px` · `--radius-lg 18px` · `--radius-xl 24px`.

---

## 2. API de composants (officielle)

### Classes CSS (globals.css) — à privilégier

| Classe | Rôle |
|---|---|
| `.nb-card` | surface neutre : `--bg-card` + contour 2px `--ink` + ombre `4px 4px 0` |
| `.nb-tile` | même contour/ombre, sans fond (pour surfaces d'accent) |
| `.nb-press` | effet d'appui : hover translate(-2,-2)+ombre 6px, active translate(2,2)+ombre 0 |
| `.on-dark` | à poser sur une surface d'accent foncé : bascule texte/bordures en encre claire |
| `.text-brand`, `.text-{catégorie}` | couleurs de texte accent |
| `.toolbar-scroll` | barre d'outils scrollable horizontalement en mobile |

### Composants React (`components/ui/`)

- `Button` — variants `primary` (brand), `secondary`, `ghost`, `danger` ; sizes `sm/md/lg` ; prop `loading`.
- `Card` — `padding sm/md/lg/none`, `hover` (ajoute `nb-press`).
- `Badge`, `StatCard`, `EmptyState`, `PageTitle`, `NysaLogo`, `icons`.

**Règle v5 :** tout nouveau code passe par ces classes/composants — plus de
`style={{ border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)' }}`
recopié à la main, plus aucun hex en dur (uniquement des `var(--…)`).

### Texte sur accent — règle rapide

- Accent clair (tangerine, jaune, ciel) → `color: var(--ink-dark)`.
- Accent foncé (cobalt, violet, indigo, gazon) → `color: var(--ink-light)` ou classe `.on-dark` sur le conteneur.

---

## 3. Principes UX appliqués (v5.1)

- **Chiffres tabulaires** (`font-variant-numeric: tabular-nums` sur `body`) : KPI et colonnes de montants alignés.
- **Hiérarchie typo par défaut** : `h1 28px / h2 20px / h3 16px`, interlignage 1.15 (ratio ~2:1 titre/texte).
- **Navigation groupée** (loi de Hick) : sidebar en sections Organiser / Quotidien / Analyser via `group` sur les items ; libellés `.nav-group-label`.
- **Survol explicite** : `.nav-item:hover` (ne jamais poser de `background` inline sur l'état inactif, sinon la règle est court-circuitée).
- **Cibles tactiles ≥ 44px** en nav mobile (loi de Fitts / WCAG).
- **`prefers-reduced-motion`** : transitions et effets d'appui désactivés.
- **Ultra-large** : contenu borné à 1720px et centré au-delà de 1800px de viewport.
- **Contraste AA** : en thème clair, `--danger` assombri (#e04b1f) pour rester lisible en texte sur blanc.

## 4. Chantier restant (migration progressive)

1. Remplacer les styles inline des pages par `.nb-*` / composants `ui/`
   (page par page ; les pages font 600–1600 lignes, découper en composants au passage).
2. Supprimer ensuite les hacks responsive `main [style*="repeat(3"]` de
   globals.css, remplacés par de vraies classes de grille responsives.
3. Renommer les variables de police `--font-saira` / `--font-sora` vers des noms
   neutres (`--font-display-src` / `--font-sans-src`).
