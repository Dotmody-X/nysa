# Sauvegarde du design system Nysa — 2026-08-13

Copie intégrale du style AVANT la refonte (blanc cassé + optimisation productivité).
Fichiers sauvegardés : globals.css, theme.ts, ThemeProvider.tsx, ThemeInjector.tsx, useThemeColors.ts.

NB : des surcharges de thème peuvent aussi exister en base (table app_config, clé 'site',
champ theme/themePresets via useAppConfig + THEME_CSS_MAP). Elles ne sont pas dans ce dossier.

Restauration : `cp design-backup/2026-08-13/globals.css app/globals.css` (idem pour les autres).
