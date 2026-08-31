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

# La cause d'un echec git est sur la PREMIERE ligne ; les suivantes sont la
# formule de politesse. « tail -1 » remontait « and the repository exists. »
# pour une panne de DNS, ce qui envoyait chercher un probleme de droits.
premiere_cause() {
  grep -m1 -E "^(ssh|fatal|error|warning):" "$1" 2>/dev/null || head -1 "$1" 2>/dev/null
}

# --autostash : l'agent peut avoir laisse des modifications non commitees au
# moment ou le cron se declenche. Sans ca, le pull echoue une fois sur deux.
if ! git pull --rebase --autostash --quiet 2>/tmp/cerveau-pull.err; then
  cause=$(premiere_cause /tmp/cerveau-pull.err)

  # Un rebase interrompu laisse le depot dans un etat qu'il faut trancher a la
  # main. Le reste - DNS, reseau, GitHub indisponible - se resout tout seul au
  # prochain passage, dans dix minutes : le signaler comme un conflit envoie
  # chercher un probleme qui n'existe pas.
  if [ -d .git/rebase-merge ] || [ -d .git/rebase-apply ] \
     || git status --porcelain | grep -q "^\(UU\|AA\|DD\|AU\|UA\|DU\|UD\)"; then
    alerter "conflit a resoudre a la main : $cause"
    exit 1
  fi

  # Injoignable : on le note sans alerter, et on ressaie au prochain cron. On
  # n'alerte qu'a partir de trois echecs d'affilee, soit une demi-heure de
  # coupure, ce qui cesse d'etre un accident de reseau.
  compteur=/tmp/cerveau-pull.echecs
  n=$(( $(cat "$compteur" 2>/dev/null || echo 0) + 1 ))
  echo "$n" > "$compteur"
  echo "pull impossible ($n) : $cause" >&2
  [ "$n" -ge 3 ] && alerter "injoignable depuis $(( n * 10 )) minutes : $cause"
  exit 1
fi
rm -f /tmp/cerveau-pull.echecs

# Rien de nouveau : on s'arrete la, sans commit vide ni bruit.
if [ -z "$(git status --porcelain)" ]; then
  exit 0
fi

nb=$(git status --porcelain | wc -l | tr -d " ")

git add -A

# Les noms de notes contiennent des espaces et des apostrophes : xargs et awk
# les decoupent, d ou un resume vide. On lit la liste terminee par NUL.
resume=""
while IFS= read -r -d "" f; do
  nom=$(basename "$f" .md)
  resume="${resume:+$resume, }$nom"
done < <(git diff --cached --name-only -z | head -c 4000)
[ -z "$resume" ] && resume="modifications"
git -c user.name="Agent Nysa" -c user.email="agent@nysa.local" \
    commit -q -m "Agent : $nb note(s) — $resume"

if ! git push --quiet 2>/tmp/cerveau-push.err; then
  alerter "push impossible : $(tail -1 /tmp/cerveau-push.err)"
  exit 1
fi

echo "$(date '+%Y-%m-%d %H:%M') pousse : $nb fichier(s) — $resume"
