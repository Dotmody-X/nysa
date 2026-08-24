# Agent Nysa — Discord + Claude Code

Assistant de travail branché sur Nysa, piloté depuis Discord.

## Ce que c'est, et ce que ce n'est pas

Le moteur, c'est **Claude Code en mode non interactif**, lancé sur le Pi5 avec le compte
Max. Il n'y a **aucune clé API Anthropic** : l'authentification vient de l'abonnement,
donc rien n'est facturé au token en plus de celui-ci.

Deux processus :

| | Rôle |
|---|---|
| `src/discord/bridge.ts` | Tient la connexion Discord, résout l'identité, lance Claude Code |
| `src/mcp/server.ts` | Serveur MCP « nysa » : les 13 tools métier, lancé par Claude Code |

## Le point important : le cloisonnement

Le serveur MCP **porte le JWT de l'utilisateur**, pas une clé d'administration. Toutes
les requêtes passent donc par les policies RLS, exactement comme dans l'application web.

C'est la raison pour laquelle on n'utilise **pas** le MCP Supabase officiel, qui serait
pourtant le raccourci évident : il s'authentifie avec un token personnel ayant accès
total au projet et court-circuite toutes les policies. Un bug dans un tool deviendrait
alors une fuite de données ; ici, Postgres refuse.

La chaîne : message Discord → `bot_identities` (service_role, uniquement pour ça) →
refresh token → JWT → `NYSA_ACCESS_TOKEN` → serveur MCP → RLS.

## Autonomie et réversibilité

L'agent agit **sans demander confirmation**. Deux choses rendent ça acceptable :

- **Aucun tool de suppression.** Écarter une tâche = passer son statut à `cancelled`.
- **`public.agent_audit_log`** conserve l'état avant/après de chaque écriture.

Retrouver ce que l'agent a fait :

```sql
select at, tool, channel, args, before, after
  from public.agent_audit_log
 order by at desc limit 50;
```

## Installation sur le Pi5

### 1. Claude Code

```bash
npm install -g @anthropic-ai/claude-code
claude   # se connecter une fois avec le compte Max
```

Vérifie les drapeaux du mode non interactif — ils évoluent d'une version à l'autre, et
`src/discord/claude.ts` les utilise :

```bash
claude --help | grep -E "print|output-format|mcp-config|allowedTools|append-system-prompt|resume"
```

Si l'un d'eux diffère, ajuste `src/discord/claude.ts` (tous les drapeaux y sont
regroupés) ou passe par `CLAUDE_EXTRA_ARGS`.

### 2. Application Discord

Sur <https://discord.com/developers/applications> : **New Application** → onglet **Bot**
→ **Reset Token** (c'est `DISCORD_TOKEN`). Active **MESSAGE CONTENT INTENT**, sans quoi
le bot reçoit des messages vides.

Invite-le avec les portées `bot` et les permissions *Read Messages*, *Send Messages*,
*Read Message History*.

Ton identifiant Discord personnel s'obtient en activant le mode développeur
(Paramètres → Avancé), puis clic droit sur ton profil → **Copier l'identifiant**.

### 3. Le service

```bash
git clone https://github.com/Dotmody-X/nysa.git /home/pi/nysa
cd /home/pi/nysa/agent
cp .env.example .env   # puis remplis-le
npm ci
npm run build
```

### 4. Liaison du compte

Démarre la passerelle, puis en message privé au bot :

```
!lier ton@email.com
```

`AGENT_ALLOWED_DISCORD_IDS` est la **seule** barrière de cette commande : sans liste
blanche, n'importe qui pourrait rattacher son Discord à ton adresse.

### 5. Démarrage automatique

```bash
sudo cp /home/pi/nysa/agent/nysa-agent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now nysa-agent
journalctl -u nysa-agent -f
```

## Usage

En message privé, tout message s'adresse à l'agent. En salon, il faut le mentionner.

| Commande | Effet |
|---|---|
| `!lier <email>` | Lie le compte Discord à Nysa |
| `!reset` | Repart d'un fil de conversation vierge dans ce salon |

Le **nom du salon porte le contexte** : dans `#mixologue`, inutile de préciser la
marque. Voir `src/brands.ts` pour la correspondance.

Arborescence suggérée :

```
#brief    #inbox    #taches    #temps
#mixologue    #esmoker    #aeterna
#contenu    #rapports
```

## Limites d'usage

L'abonnement Max a des quotas glissants. **Ne fais pas tourner l'agent en boucle de
polling** : il répond quand tu écris, et au plus un brief par jour. Un triage
automatique toutes les dix minutes viderait le quota sans rien apporter.

`CLAUDE_TIMEOUT_MS` et le verrou par salon (un seul appel à la fois) sont là pour
qu'une boucle accidentelle ne parte pas en vrille.
