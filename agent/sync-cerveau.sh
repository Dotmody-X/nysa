#!/usr/bin/env bash
#
# Synchronise le vault Obsidian du Pi avec GitHub.
#
# L'agent ecrit ses notes dans le clone local ; ce script les pousse, et
# recupere au passage ce qui a ete modifie depuis les autres appareils.
#
# Toute anomalie part dans Discord : une synchronisation qui echoue en silence
# fait diverger les appareils sans que personne ne s'en apercoive, et c'est au
# moment du conflit, des semaines plus tard, qu'on le decouvre.

set -uo pipefail

VAULT="${OBSIDIAN_VAULT:-$HOME/cerveau}"
NOTIF="$HOME/pi5-mediacenter/scripts/notif.py"
CANAL="alertes-systeme"

alerter() {
  echo "$1" >&2
  [ -f "$NOTIF" ] && python3 "$NOTIF" "$CANAL" "🧠 Cerveau — $1" >/dev/null 2>&1
}

cd "$VAULT" 2>/dev/null || { alerter "vault introuvable : $VAULT"; exit 1; }

# --autostash : l'agent peut avoir laisse des modifications non commitees au
# moment ou le cron se declenche. Sans ca, le pull echoue une fois sur deux.
if ! git pull --rebase --autostash --quiet 2>/tmp/cerveau-pull.err; then
  alerter "pull impossible — conflit a resoudre a la main : $(tail -1 /tmp/cerveau-pull.err)"
  exit 1
fi

# Rien de nouveau : on s'arrete la, sans commit vide ni bruit.
if [ -z "$(git status --porcelain)" ]; then
  exit 0
fi

resume=$(git status --porcelain | awk '{print $NF}' | head -3 | xargs -r -n1 basename | paste -sd", " -)
nb=$(git status --porcelain | wc -l | tr -d " ")

git add -A
git -c user.name="Agent Nysa" -c user.email="agent@nysa.local" \
    commit -q -m "Agent : $nb note(s) — $resume"

if ! git push --quiet 2>/tmp/cerveau-push.err; then
  alerter "push impossible : $(tail -1 /tmp/cerveau-push.err)"
  exit 1
fi

echo "$(date '+%Y-%m-%d %H:%M') pousse : $nb fichier(s) — $resume"
