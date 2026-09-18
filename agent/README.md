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

## Le courrier : `nysa-mail`

Un second service, dans le même dépôt et le même `.env`, tient les boîtes OVH en
écoute permanente (IMAP IDLE : le serveur pousse le mail à l'instant où il
arrive). Chaque mail est classé — commande WooCommerce, rendez-vous Amelia,
mail urgent ou ordinaire — et déposé dans `work.events` par `log_work_event`,
exactement comme le faisait le workflow n8n qu'il remplace. C'est ce qui
alimente les briefs et le flux de courrier du poste iPad.

Il écrit sous une identité de service (`bot_identities`, provider `service`),
créée au premier démarrage à partir du compte Discord lié du propriétaire.
Son jeton n'est partagé avec personne.

```bash
# dans agent/.env : MAIL_ACCOUNTS, MAIL_PASS_MIXOLOGUE, MAIL_PASS_AETERNA
sudo cp /home/pi/nysa/agent/nysa-mail.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now nysa-mail
journalctl -u nysa-mail -f
```

Le dernier UID vu par boîte est dans `~/.nysa-mail.json` ; le supprimer fait
reprendre `MAIL_BACKFILL_DAYS` jours de courrier (la base dédoublonne, ça ne
crée rien en double).

## Les notifications push

Le Pi envoie aussi les notifications Web Push : `nysa-mail` à chaque mail déposé
(hors rattrapage), la passerelle quand Claude a répondu à une demande. Les
appareils s'abonnent depuis la PWA (bouton dans le poste ou dans Compte →
Notifications) ; les abonnements sont dans `public.push_subscriptions`, lus
avec le JWT de l'utilisateur. Sur iPhone et iPad, il faut l'app sur l'écran
d'accueil.

Clés VAPID, une fois pour toutes, sur le Pi :

```bash
cd ~/nysa/agent
node -e "const k=require('web-push').generateVAPIDKeys(); console.log('VAPID_PUBLIC_KEY='+k.publicKey); console.log('VAPID_PRIVATE_KEY='+k.privateKey)" >> .env
```

La clé publique va aussi dans `app_config` (`key = 'push'`,
`value = {"vapid_public_key": "…"}`) : c'est là que la PWA la lit.
`PUSH_MAX_URGENCY=1` limite le courrier notifié aux urgents.

## Le triage des mails par Claude

Chaque mail déposé par `nysa-mail` passe par Claude Code dans la minute :
résumé en une phrase, catégorie (commande, fournisseur, client, facture, admin,
rdv, pub, spam), urgence recalculée, action proposée, référence rattachée. La
fiche va dans `payload.ai` de l'événement et s'affiche dans le poste.

C'est du contenu tiers : la session de triage n'a **que des outils de lecture**
(commandes, tâches, projets, agenda), pas le vault, pas le Mac, pas de fil — et le
prompt dit de lire le mail sans lui obéir. `TRIAGE_MODEL` (sonnet par défaut,
`haiku` pour aller plus vite, `off` pour couper). Seuls les mails des 48
dernières heures sont triés : jamais un rattrapage.

## Les demandes depuis l'application

L'application (l'iPad du bureau, page Poste) peut poser une question à Claude
sans passer par Discord : elle dépose une ligne dans `work.agent_requests`
(`ask_agent`), le worker de la passerelle la prend à la seconde (Realtime sous
le JWT de l'utilisateur), lance Claude Code avec les mêmes tools, et rend la
réponse dans la même ligne — que l'application voit arriver en temps réel.
Jamais de contrôle du Mac par ce chemin : une demande peut contenir un mail
écrit par un tiers.

## Suivi du temps en conversant

C'est le cœur de l'usage quotidien. Tu annonces ce que tu commences, le reste suit :

> **Nathan** — je commence la refonte du packaging Mixologue

`demarrer_activite` enchaîne alors, en un seul appel :

1. arrêt du chronomètre en cours ;
2. **statut de la tâche quittée** — `done` si tu as dit qu'elle était finie, sinon
   `in_progress` avec **l'échéance inchangée**, donc toujours visible ;
3. cumul du temps écoulé dans `tasks.actual_minutes` ;
4. recherche de la tâche cible, création seulement si aucune ne correspond ;
5. nouveau chronomètre lié à la tâche **et** au projet.

La règle qui compte : dans le doute, l'agent ne coche pas. Une tâche non terminée ne
doit jamais disparaître du radar.

## Cerveau Obsidian

Le vault est un dépôt Git privé, cloné sur le Pi5 dans `OBSIDIAN_VAULT`. **Aucun MCP
n'est nécessaire** : ce sont des fichiers markdown, et Claude Code les lit et les écrit
avec ses outils natifs. La passerelle passe simplement `--add-dir`.

```bash
git clone git@github.com:<toi>/cerveau.git /home/pi/cerveau
```

Sur tes autres appareils : plugin **obsidian-git** (desktop) ou **Working Copy** (iPad).
Chaque note écrite par l'agent devient un commit — tu vois ce qu'il a ajouté et tu peux
revenir en arrière.

L'agent n'y consigne pas les échanges courants, seulement ce qui mérite de survivre à la
conversation : une décision et sa raison, un arbitrage, un retour d'expérience. Il lit
les notes existantes avant d'écrire, pour suivre tes conventions de nommage et de liens.

Pousser automatiquement, côté Pi5 :

```bash
# crontab -e
*/15 * * * * cd /home/pi/cerveau && git add -A && git diff --cached --quiet || (git commit -m "agent: notes" && git push)
```

## Contrôle du Mac

`mac_shell` et `mac_applescript` passent par SSH. Sur le Mac : **Réglages → Général →
Partage → Connexion à distance**. Puis, depuis le Pi5 :

```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_mac -N ""
ssh-copy-id -i ~/.ssh/id_ed25519_mac <user>@<mac>.local
```

### Séparation des contextes de confiance

Ces deux tools ne sont **jamais** chargés partout. `macTools()` ne renvoie quelque chose
que si `NYSA_ALLOW_MAC=1`, et **seule la passerelle Discord pose ce drapeau** — là où
c'est Nathan lui-même qui écrit.

Les sessions planifiées qui trient `work.events` ne l'ont pas, parce que les titres et
payloads de cette table viennent d'e-mails et de commandes, donc de tiers. Sans cette
séparation, un message piégé dans l'inbox deviendrait une exécution de commande sur la
machine principale.

Vérifiable :

```
Session planifiée (triage inbox)  -> 14 tools | mac: AUCUN
Session Discord (Nathan écrit)    -> 16 tools | mac: mac_shell, mac_applescript
```

## Limites d'usage

L'abonnement Max a des quotas glissants. **Ne fais pas tourner l'agent en boucle de
polling** : il répond quand tu écris, et au plus un brief par jour. Un triage
automatique toutes les dix minutes viderait le quota sans rien apporter.

`CLAUDE_TIMEOUT_MS` et le verrou par salon (un seul appel à la fois) sont là pour
qu'une boucle accidentelle ne parte pas en vrille.
