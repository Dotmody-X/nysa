-- ============================================================
-- SETUP STORAGE - PROJECT FILES
-- ============================================================

-- Créer le bucket s'il n'existe pas
INSERT INTO storage.buckets (id, name, public)
VALUES ('project_files', 'project_files', true)
ON CONFLICT (id) DO NOTHING;

-- Politiques de sécurité pour le bucket project_files
CREATE POLICY "Users can upload their own project files" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'project_files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read their own project files" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'project_files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own project files" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'project_files' AND auth.uid()::text = (storage.foldername(name))[1]);
