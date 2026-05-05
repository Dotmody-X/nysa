# 🚀 Intégration OpenClaw → NYSA

## 📋 État d'intégration

✅ API route créée: `/app/api/agent/chat/route.ts`
✅ Page agent modifiée pour appeler l'API
✅ Contexte Supabase chargé automatiquement
✅ Variables d'environnement configurées

## 🔧 Setup Local

1. Récupérer clé Anon Supabase (Settings → API)
2. Lancer OpenClaw: `openclaw gateway`
3. Lancer NYSA: `npm run dev`
4. Aller sur http://localhost:3000/agent

## 🌐 Prod

Ajouter en Vercel:
- SUPABASE_SERVICE_ROLE_KEY
- OPENCLAW_URL (Pi5 samedi/lundi)
