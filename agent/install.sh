#!/usr/bin/env bash
#
# Installation de l'agent Nysa sur le Pi5 (Debian 13 / Raspberry Pi OS).
#
#   curl -fsSL https://raw.githubusercontent.com/Dotmody-X/nysa/main/agent/install.sh | bash
#
# Idempotent : relançable sans risque, il met à jour ce qui existe déjà.
# Il ne touche jamais au fichier .env une fois celui-ci créé.

set -euo pipefail

NYSA_REPO="${NYSA_REPO:-$HOME/nysa}"
CERVEAU_REPO="${CERVEAU_REPO:-$HOME/cerveau}"
NODE_MAJOR=22

bleu()  { printf '\033[1;34m%s\033[0m\n' "$*"; }
vert()  { printf '\033[1;32m%s\033[0m\n' "$*"; }
jaune() { printf '\033[1;33m%s\033[0m\n' "$*"; }
rouge() { printf '\033[1;31m%s\033[0m\n' "$*"; }

manquant=()

bleu "== 1/6  Système =="
if [ "$(uname -m)" != "aarch64" ]; then
  jaune "Architecture $(uname -m) — prévu pour un Pi5 64 bits, on continue quand même."
fi
sudo apt-get update -qq
sudo apt-get install -y -qq git curl ca-certificates >/dev/null
vert "git et curl présents."

bleu "== 2/6  Node.js =="
besoin_node=1
if command -v node >/dev/null 2>&1; then
  actuelle=$(node -v | sed 's/^v\([0-9]*\).*/\1/')
  if [ "$actuelle" -ge 20 ]; then
    vert "Node $(node -v) déjà installé."
    besoin_node=0
  else
    jaune "Node $(node -v) trop ancien (il faut ≥ 20)."
  fi
fi
if [ "$besoin_node" -eq 1 ]; then
  bleu "Installation de Node ${NODE_MAJOR}..."
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash - >/dev/null
  sudo apt-get install -y -qq nodejs >/dev/null
  vert "Node $(node -v) installé."
fi

bleu "== 3/6  Dépôt Nysa =="
if [ -d "$NYSA_REPO/.git" ]; then
  git -C "$NYSA_REPO" pull --ff-only --quiet
  vert "Dépôt mis à jour : $NYSA_REPO"
else
  git clone --quiet https://github.com/Dotmody-X/nysa.git "$NYSA_REPO"
  vert "Dépôt cloné : $NYSA_REPO"
fi

bleu "== 4/6  Cerveau Obsidian =="
if [ -d "$CERVEAU_REPO/.git" ]; then
  git -C "$CERVEAU_REPO" pull --ff-only --quiet || jaune "Pull impossible — à regarder."
  vert "Cerveau à jour : $CERVEAU_REPO"
elif git clone --quiet git@github.com:Dotmody-X/Cerveau.git "$CERVEAU_REPO" 2>/dev/null; then
  vert "Cerveau cloné : $CERVEAU_REPO"
else
  jaune "Cerveau non cloné — dépôt privé, il faut une clé SSH autorisée sur GitHub."
  manquant+=("Cloner le Cerveau : ssh-keygen puis ajouter la clé sur GitHub, et relancer ce script")
fi

bleu "== 5/6  Construction de l'agent =="
cd "$NYSA_REPO/agent"
npm ci --silent
npm run build --silent
vert "Agent construit."

if [ ! -f .env ]; then
  cp .env.example .env
  sed -i "s|^NYSA_REPO=.*|NYSA_REPO=$NYSA_REPO|" .env
  sed -i "s|^OBSIDIAN_VAULT=.*|OBSIDIAN_VAULT=$CERVEAU_REPO|" .env
  jaune "Fichier .env créé à partir du gabarit — il reste à le remplir."
  manquant+=("Remplir $NYSA_REPO/agent/.env (DISCORD_TOKEN, AGENT_ALLOWED_DISCORD_IDS, clés Supabase)")
else
  vert ".env déjà présent — laissé intact."
  for v in DISCORD_TOKEN AGENT_ALLOWED_DISCORD_IDS SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY; do
    grep -qE "^$v=.+" .env || manquant+=("Renseigner $v dans agent/.env")
  done
fi

bleu "== 6/6  Claude Code =="
# Le préfixe npm peut vivre dans le HOME (~/.npm-global), qui n'est PAS dans le
# PATH d'une session SSH non interactive : chercher uniquement via `command -v`
# conclurait à tort que Claude Code est absent.
prefixe_npm=$(npm config get prefix 2>/dev/null || echo /usr/local)
export PATH="$prefixe_npm/bin:$PATH"
CLAUDE_PATH=""
command -v claude >/dev/null 2>&1 && CLAUDE_PATH=$(command -v claude)

if [ -n "$CLAUDE_PATH" ]; then
  vert "Claude Code présent : $($CLAUDE_PATH --version 2>/dev/null | head -1)"
  sed -i "s|^CLAUDE_BIN=.*|CLAUDE_BIN=$CLAUDE_PATH|" .env
  vert "CLAUDE_BIN pointé sur $CLAUDE_PATH"
  # L'authentification vit dans le HOME : sans elle le service démarre mais
  # chaque appel échoue.
  if [ ! -d "$HOME/.claude" ]; then
    jaune "Claude Code n'est pas connecté."
    manquant+=("Lancer 'claude' une fois et se connecter avec le compte Max")
  fi
else
  jaune "Claude Code absent."
  # Si le préfixe npm global est dans le HOME, surtout pas de sudo : cela
  # installerait pour root, dans un préfixe que l'utilisateur n'utilise pas.
  if [ -w "$prefixe_npm" ]; then
    npm install -g @anthropic-ai/claude-code >/dev/null 2>&1
  else
    sudo npm install -g @anthropic-ai/claude-code >/dev/null 2>&1
  fi
  if command -v claude >/dev/null 2>&1; then
    CLAUDE_PATH=$(command -v claude)
    vert "Claude Code installé : $CLAUDE_PATH"
    sed -i "s|^CLAUDE_BIN=.*|CLAUDE_BIN=$CLAUDE_PATH|" .env
    [ -d "$HOME/.claude" ] || manquant+=("Lancer '$CLAUDE_PATH' une fois et se connecter avec le compte Max")
  else
    manquant+=("Installer Claude Code : npm install -g @anthropic-ai/claude-code")
  fi
fi

echo
if [ ${#manquant[@]} -eq 0 ]; then
  vert "== Tout est prêt =="
  echo "Démarrer le service :"
  echo "  sudo cp $NYSA_REPO/agent/nysa-agent.service /etc/systemd/system/"
  echo "  sudo sed -i 's|/home/pi/nysa|$NYSA_REPO|g; s|^User=.*|User=$USER|; s|^Environment=HOME=.*|Environment=HOME=$HOME|' /etc/systemd/system/nysa-agent.service"
  echo "  sudo systemctl daemon-reload && sudo systemctl enable --now nysa-agent"
  echo "  journalctl -u nysa-agent -f"
else
  rouge "== Il reste ${#manquant[@]} chose(s) à faire =="
  for m in "${manquant[@]}"; do echo "  - $m"; done
  echo
  echo "Relance ce script ensuite : bash $NYSA_REPO/agent/install.sh"
fi
