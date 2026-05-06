# 🚀 NYSA - Nouvelles Fonctionnalités: Notes, Fichiers, Paramètres

## ✅ Déploiement Complet

Code déployé sur Vercel le **6 mai 2026**. Les 3 nouveaux onglets sont maintenant visibles sur `/projets` mais nécessitent une étape de configuration de base de données.

## 📋 Checklist de Configuration

### 1. **Créer les Tables Supabase** (REQUIS)

Les 3 nouveaux onglets dépendent de 3 tables PostgreSQL:

```sql
-- Onglet NOTES
CREATE TABLE IF NOT EXISTS public.project_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  color text DEFAULT '#F2F2F0',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_notes_project_id ON public.project_notes(project_id);
ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own project notes" ON public.project_notes;
CREATE POLICY "Users manage own project notes" ON public.project_notes
  FOR ALL USING (auth.uid() = user_id);

-- Onglet FICHIERS
CREATE TABLE IF NOT EXISTS public.project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  filename text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL,
  file_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON public.project_files(project_id);
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own project files" ON public.project_files;
CREATE POLICY "Users manage own project files" ON public.project_files
  FOR ALL USING (auth.uid() = user_id);

-- Onglet PARAMÈTRES
CREATE TABLE IF NOT EXISTS public.project_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id, key)
);
CREATE INDEX IF NOT EXISTS idx_project_settings_project_id ON public.project_settings(project_id);
ALTER TABLE public.project_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own project settings" ON public.project_settings;
CREATE POLICY "Users manage own project settings" ON public.project_settings
  FOR ALL USING (auth.uid() = user_id);
```

**Comment appliquer:**
1. Allez sur https://app.supabase.com/project/teqsxzfslpxejncrkudz/sql
2. Cliquez "New Query"
3. Collez le SQL ci-dessus
4. Cliquez "Run"

### 2. **Configurer Supabase Storage** (REQUIS pour fichiers)

Pour permettre l'upload de fichiers:

1. Allez dans Storage → Buckets
2. Créez un bucket nommé `project-files` (public)
3. Les RLS policies seront appliquées automatiquement

Ou exécutez ce SQL:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', true)
ON CONFLICT (id) DO NOTHING;
```

## 📦 Fonctionnalités Implémentées

### **Onglet NOTES** 📝
- ✅ Créer des notes avec titre et contenu
- ✅ Sélectionner une couleur pour chaque note
- ✅ Éditer les notes
- ✅ Supprimer les notes
- ✅ Affichage en grille responsive

### **Onglet FICHIERS** 📁
- ✅ Télécharger des fichiers via drag-and-drop ou sélection
- ✅ Affichage du poids du fichier et date de création
- ✅ Télécharger (download) les fichiers
- ✅ Supprimer les fichiers
- ✅ Stockage dans Supabase Storage

### **Onglet PARAMÈTRES** ⚙️
- ✅ Archiver/restaurer le projet
- ✅ Gérer la visibilité (private/team/public)
- ✅ Activer/désactiver les notifications

## 🏗️ Architecture Technique

### Nouveaux Hooks
- `useProjectNotes` - CRUD pour les notes
- `useProjectFiles` - Upload/download/delete des fichiers
- `useProjectSettings` - Gestion des paramètres

### Composants React
- `NoteCreator` - Formulaire création de note
- `NoteCard` - Affichage + édition inline d'une note
- `SettingsPanel` - Interface des paramètres

### Base de Données
- 3 nouvelles tables avec RLS policies
- Indexes sur project_id pour performance
- Soft delete via CASCADE

## 🎯 Limitations & Notes

- **Max 50 MB par fichier** - Configurable dans useProjectFiles
- **Stockage Supabase**: 1 GB inclus gratuit
- **Coût fichiers volumineux**: $0.05/GB après dépassement
- **Alternative AWS S3** possible si besoin pour gros volumes

## 📊 Limites de Stockage

| Service | Limite Gratuite | Coût |
|---------|-----------------|------|
| **Supabase Storage** | 1 GB | $0.05/GB après |
| **Vercel (hosting)** | 2.5 GB | Inclus |
| **AWS S3 (optionnel)** | Payant | $0.023/GB |

## 🚨 Troubleshooting

**Les onglets affichent "Section en cours de dév"?**
→ Les tables Supabase n'ont pas été créées. Suivez l'étape 1.

**L'upload de fichiers ne fonctionne pas?**
→ Le bucket Storage n'existe pas. Suivez l'étape 2.

**Les paramètres ne se sauvegardent pas?**
→ Vérifiez les RLS policies et que vous êtes authenticié.

## 📝 Fichiers Modifiés

- ✅ `app/(app)/projets/page.tsx` - UI des 3 nouveaux onglets
- ✅ `hooks/useProjectNotes.ts` - Hook notes
- ✅ `hooks/useProjectFiles.ts` - Hook fichiers
- ✅ `hooks/useProjectSettings.ts` - Hook paramètres
- ✅ `supabase/schema.sql` - Migrations DB
- ✅ GitHub pushé et Vercel déployé

## ✨ Prochaines Étapes (Optionnelles)

- [ ] Ajouter persistance offline (Service Workers)
- [ ] Ajouter export des notes (PDF/Markdown)
- [ ] Ajouter versioning des fichiers
- [ ] Intégrer WebRTC pour collab temps réel sur notes
- [ ] Migrer vers AWS S3 si gros fichiers nécessaires
