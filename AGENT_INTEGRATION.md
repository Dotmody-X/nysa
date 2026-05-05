# 🦅 AGENT CÓNDOR INTEGRATION - NYSA.be

## Architecture

### Flow
```
NYSA (Vercel)
    ↓ POST /api/agent/chat
    ↓ {message, userId, context}
    ↓
OpenClaw Gateway (Pi5)
    ↓ Cóndor Agent Main Session
    ↓ Analyse + Execute Tools
    ↓
Response + Actions Executed
    ↓
NYSA Web UI
```

### Cóndor Capabilities

✅ **Data Access**
- Lecture complète des données Supabase (tasks, projects, events, budget, etc.)
- Accès au contexte utilisateur NYSA
- Historique et analytics

✅ **Code Modifications**
- `read_nysa_file(path)` - Lire un fichier source
- `write_nysa_file(path, content)` - Modifier un fichier
- `git_commit(message)` - Commiter les changements
- `git_push()` - Pusher vers GitHub

✅ **Database**
- `supabase_query(sql)` - Lancer des requêtes SQL
- `supabase_update(table, data, where)` - Mettre à jour les données
- `create_task()`, `update_project()`, etc.

✅ **Deployment**
- `vercel_redeploy()` - Red\u00e9ployer NYSA automatiquement
- Configuration automatique des env vars

✅ **Intelligence**
- Analyser tes données et proposer des actions
- Donner des conseils avisés basés sur ton contexte
- Être proactif et anticipatif
- Identifier les blocages et proposer des solutions

## Configuration

### Local (Pi5)
```bash
# .env.local (NYSA)
NEXT_PUBLIC_SUPABASE_URL=https://teqsxzfslpxejncrkudz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ACCESS_TOKEN=sbp_...
OPENCLAW_GATEWAY_URL=http://localhost:18789  # Local Gateway
```

### Production (Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=https://teqsxzfslpxejncrkudz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ACCESS_TOKEN=sbp_...
OPENCLAW_GATEWAY_URL=http://192.168.1.XXX:18789  # Pi5 Local IP
OPENCLAW_TOKEN=<optional_auth_token>
```

## Usage Examples

### Simple Analysis
```
User: "Analyse mon budget"
Cóndor: [Charge les données budget] → Analyse → Donne des conseils
```

### Code Modification
```
User: "Améliore la page Projects, fais du refactor"
Cóndor: 
  1. Lit le fichier projects/page.tsx
  2. Propose des améliorations (performance, UX, code)
  3. Modifie le fichier
  4. Teste localement
  5. Commit + Push
  6. Redéploie Vercel
```

### Proactive Planning
```
User: "Dis-moi ce que je dois faire aujourd'hui"
Cóndor:
  1. Charge les urgences + calendar + running goals
  2. Analyse le contexte
  3. Propose un plan d'action structuré
  4. Crée automatiquement les tâches
  5. Setups notifications si besoin
```

## Security

⚠️ **Important:**
- Le Cóndor Agent a accès à tout le code/data de Nathan
- **Utilisé uniquement pour Nathan** (user_id verification)
- Pas de modifications destructives sans confirmation
- Git history traçable pour tous les changements
- Supabase RLS active sur toutes les tables

## Deployment Checklist

- [ ] Vercel env vars configurées (OPENCLAW_GATEWAY_URL + credentials)
- [ ] Pi5 OpenClaw accessible depuis Vercel (même réseau ou VPN)
- [ ] Cron jobs OpenClaw testés
- [ ] Agent main session active sur Pi5
- [ ] Git credentials configurés sur Pi5
- [ ] Supabase token valide (90j expiration)
- [ ] Tests du chat agent dans NYSA Web

## Testing

```bash
# Test 1: Connection
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Coucou","userId":"nathan"}'

# Test 2: Data Loading
# Message should show tasks, projects, events in response

# Test 3: Code Modification
# Ask Cóndor to modify a file and verify in git
```

---

**Agent Created:** 2026-05-05 10:00
**Status:** 🟢 LIVE & READY
**Cóndor Identity:** 🦅 Assistive Elite | Français/English
