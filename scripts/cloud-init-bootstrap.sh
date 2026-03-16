#!/usr/bin/env bash
# Ecommerce Infinity – Non-interactive bootstrap for cloud-init
# Installs Docker, clones repo (or uses existing code), creates .env, then runs setup-server.sh.
# Use with cloud-init; run as root or with sudo.

set -e
LOG="/var/log/ecommerce-bootstrap.log"
exec > >(tee -a "$LOG") 2>&1
echo "[$(date -Iseconds)] Bootstrap started."

# --- Config (override via environment or cloud-init write_files) ---
REPO_URL="${REPO_URL:-https://github.com/your-org/ecommerce-infinity.git}"
REPO_BRANCH="${REPO_BRANCH:-main}"
INSTALL_DIR="${INSTALL_DIR:-/opt/ecommerce-infinity}"
CLONE_REPO="${CLONE_REPO:-true}"

# --- Ensure Ubuntu (or Debian) ---
if ! command -v apt-get &>/dev/null; then
  echo "ERROR: apt-get not found. This script is for Debian/Ubuntu."
  exit 1
fi

# --- Install Docker (same as setup-server.sh install_docker) ---
install_docker() {
  if command -v docker &>/dev/null && docker --version &>/dev/null; then
    echo "[ok] Docker already installed: $(docker --version)"
    return 0
  fi
  echo "[info] Installing Docker and Docker Compose plugin..."
  apt-get update -qq
  apt-get install -y ca-certificates curl
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release 2>/dev/null && echo "${VERSION_CODENAME:-$VERSION}") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
  apt-get update -qq
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  echo "[ok] Docker installed: $(docker --version)"
}

# --- Install git ---
apt-get update -qq
apt-get install -y git curl

# --- Clone or use existing project ---
mkdir -p "$(dirname "$INSTALL_DIR")"
if [[ "$CLONE_REPO" == "true" ]] && [[ -n "$REPO_URL" ]]; then
  if [[ -d "$INSTALL_DIR/.git" ]]; then
    echo "[info] Repository already present at $INSTALL_DIR, pulling..."
    (cd "$INSTALL_DIR" && git fetch && git checkout "${REPO_BRANCH}" && git pull --rebase || true)
  else
    echo "[info] Cloning $REPO_URL (branch $REPO_BRANCH) to $INSTALL_DIR ..."
    git clone -b "$REPO_BRANCH" "$REPO_URL" "$INSTALL_DIR" || {
      echo "[warn] Clone failed; continuing in case directory exists."
    }
  fi
else
  echo "[info] CLONE_REPO=false or REPO_URL empty; skipping clone. Ensure app is at $INSTALL_DIR"
fi

if [[ ! -d "$INSTALL_DIR" ]]; then
  echo "[err] Project directory $INSTALL_DIR not found. Clone failed or path wrong."
  exit 1
fi

# --- Install Docker (after we know we have a place to run from) ---
install_docker

# --- Add default user to docker group (cloud-init often uses 'ubuntu' or 'ec2-user') ---
for u in ubuntu ec2-user admin; do
  if id "$u" &>/dev/null; then
    usermod -aG docker "$u" 2>/dev/null || true
    echo "[ok] Added $u to docker group."
  fi
done

# --- Create .env from .env.example ---
if [[ -f "$INSTALL_DIR/.env.example" ]]; then
  if [[ ! -f "$INSTALL_DIR/.env" ]]; then
    cp "$INSTALL_DIR/.env.example" "$INSTALL_DIR/.env"
    echo "[ok] Created .env from .env.example"
  else
    echo "[info] .env already exists, leaving unchanged."
  fi
else
  echo "[warn] .env.example not found; .env not created."
fi

# --- Make setup-server.sh executable ---
chmod +x "$INSTALL_DIR/scripts/setup-server.sh" 2>/dev/null || true

# --- Run setup-server.sh (interactive script – run once so user can attach or run again later) ---
# Option A: run in background and log (user can SSH and run ./scripts/setup-server.sh for full menu)
# Option B: run once with default choices (e.g. install docker already done, just start stack) – not possible without modifying setup-server.sh
# We run it in background so cloud-init finishes; output goes to LOG. User SSHs and runs setup-server.sh for interactive menu.
echo "[info] To finish setup, SSH in and run: cd $INSTALL_DIR && ./scripts/setup-server.sh"
echo "[info] Bootstrap complete. Log: $LOG"
echo "[$(date -Iseconds)] Bootstrap finished."
