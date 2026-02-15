#!/usr/bin/env bash
# Ecommerce Infinity – Server setup console
# Run on Ubuntu server: ./scripts/setup-server.sh  or  bash scripts/setup-server.sh
# Makes server setup faster by running all commands from one menu.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${BLUE}[info]${NC} $*"; }
ok()    { echo -e "${GREEN}[ok]${NC} $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC} $*"; }
err()   { echo -e "${RED}[err]${NC} $*"; }

check_project() {
  if [[ ! -f docker-compose.yml || ! -f docker-compose.prod.yml ]]; then
    err "Run this script from the project root (where docker-compose.yml is)."
    exit 1
  fi
}

install_docker() {
  info "Installing Docker and Docker Compose plugin..."
  sudo apt-get update -qq
  sudo apt-get install -y ca-certificates curl
  sudo install -m 0755 -d /etc/apt/keyrings
  sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  sudo chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release 2>/dev/null && echo "${VERSION_CODENAME:-$VERSION}") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update -qq
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo usermod -aG docker "$USER" 2>/dev/null || true
  ok "Docker installed. Log out and back in (or run 'newgrp docker') so 'docker' works without sudo."
}

setup_env() {
  if [[ -f .env ]]; then
    read -p ".env exists. Overwrite? (y/N): " -r
    [[ ! $REPLY =~ ^[yY]$ ]] && return
  fi
  cp -n .env.example .env 2>/dev/null || cp .env.example .env
  ok ".env created from .env.example"
  read -p "Edit .env now with nano? (y/N): " -r
  [[ $REPLY =~ ^[yY]$ ]] && nano .env
}

start_stack() {
  echo "  1) Dev (ports 3000, 3001, 9000...) – for LAN or port-forward"
  echo "  2) Prod (nginx 80/443) – need domain + SSL later"
  echo "  3) Tunnel (nginx 80 only) – for Cloudflare Tunnel"
  read -p "Choice (1–3): " -r choice
  case "$choice" in
    1) docker compose up -d
       ok "Dev stack started. Frontend: http://$(hostname -I | awk '{print $1}'):3000"
       ;;
    2) docker compose -f docker-compose.prod.yml up -d
       ok "Prod stack started. Configure NGINX_SERVER_NAME and run certbot for HTTPS."
       ;;
    3) docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml up -d
       ok "Tunnel stack started. Run 'Install cloudflared' then 'Run Quick Tunnel' and set the URL in .env."
       ;;
    *) warn "Invalid choice."
       ;;
  esac
}

install_cloudflared() {
  if command -v cloudflared &>/dev/null; then
    ok "cloudflared already installed: $(cloudflared --version 2>/dev/null || true)"
    return
  fi
  info "Downloading and installing cloudflared..."
  ARCH=$(dpkg --print-architecture)
  case "$ARCH" in
    amd64) DEB=cloudflared-linux-amd64.deb ;;
    arm64) DEB=cloudflared-linux-arm64.deb ;;
    armhf) DEB=cloudflared-linux-arm.deb ;;
    *) err "Unsupported arch: $ARCH"; return 1 ;;
  esac
  curl -sL "https://github.com/cloudflare/cloudflared/releases/latest/download/$DEB" -o /tmp/cloudflared.deb
  sudo dpkg -i /tmp/cloudflared.deb
  rm -f /tmp/cloudflared.deb
  ok "cloudflared installed: $(cloudflared --version 2>/dev/null || true)"
}

run_quick_tunnel() {
  if ! command -v cloudflared &>/dev/null; then
    err "Install cloudflared first (menu option 5)."
    return 1
  fi
  info "Starting Quick Tunnel to http://localhost:80 ..."
  info "Copy the https://....trycloudflare.com URL, then use menu option 7 to set it (app + API + Next CDN) and rebuild frontend."
  echo ""
  cloudflared tunnel --url http://localhost:80
}

# Sets tunnel URL as app URL, API URL, and Next CDN URL (for product images).
# Rebuilds frontend so Next.js image config allows the new host (domains from NEXT_PUBLIC_APP_URL).
set_tunnel_url_and_restart() {
  [[ ! -f .env ]] && { err ".env not found. Run 'Setup .env' first."; return 1; }
  echo ""
  info "Enter your public URL (e.g. from Quick Tunnel: https://xxx.trycloudflare.com)"
  info "This sets: app URL, API URL, and Next CDN URL (for product images). No trailing slash."
  read -p "Public URL: " -r url
  [[ -z "$url" ]] && return
  url_api="${url}/api"
  for key in NEXT_PUBLIC_APP_URL NEXT_PUBLIC_CDN_URL MINIO_PUBLIC_URL; do
    if grep -q "^${key}=" .env 2>/dev/null; then
      sed -i.bak "s|^${key}=.*|${key}=${url}|" .env
    else
      echo "${key}=${url}" >> .env
    fi
  done
  if grep -q "^NEXT_PUBLIC_API_URL=" .env 2>/dev/null; then
    sed -i.bak "s|^NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=${url_api}|" .env
  else
    echo "NEXT_PUBLIC_API_URL=${url_api}" >> .env
  fi
  rm -f .env.bak
  ok "Updated .env with $url (app, API, Next CDN for images)"
  info "Rebuilding frontend so Next.js allows image URLs from this host..."
  if docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml build --no-cache frontend 2>/dev/null; then
    docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml up -d frontend 2>/dev/null || true
    ok "Frontend rebuilt and restarted. Open $url in a browser."
  else
    warn "Rebuild failed or not using tunnel stack. Restarting frontend only..."
    docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml restart frontend 2>/dev/null || docker compose restart frontend 2>/dev/null || warn "Restart frontend manually."
    ok "Done. If product images still 400, rebuild frontend with: docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml build --no-cache frontend && docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml up -d frontend"
  fi
}

backup_db() {
  if [[ -f scripts/backup-db.sh ]]; then
    bash scripts/backup-db.sh
  else
    docker compose exec -T postgres pg_dump -U postgres ecommerce > "backup-$(date +%Y%m%d-%H%M%S).sql" 2>/dev/null || docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U postgres ecommerce > "backup-$(date +%Y%m%d-%H%M%S).sql"
    ok "Dump saved to current directory."
  fi
}

show_logs() {
  docker compose logs -f 2>/dev/null || docker compose -f docker-compose.prod.yml logs -f
}

stack_status() {
  docker compose ps 2>/dev/null || docker compose -f docker-compose.prod.yml ps 2>/dev/null || true
}

open_firewall() {
  info "Opening common ports: 22, 80, 443, 3000, 3001, 9000, 9001..."
  for p in 22 80 443 3000 3001 9000 9001; do
    sudo ufw allow "$p/tcp" 2>/dev/null || true
  done
  sudo ufw --force enable 2>/dev/null || true
  ok "Firewall updated. Check: sudo ufw status"
}

resolve_failed_migration() {
  info "Resolving failed Prisma migration (add_taxes) so backend can start..."
  if docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml run --rm backend npx prisma migrate resolve --rolled-back "20260121182418_add_taxes" 2>/dev/null; then
    ok "Migration marked as rolled back. Rebuilding backend (no cache) so fixed migration is in the image..."
    docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml build --no-cache backend
    ok "Starting backend..."
    docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml up -d backend
    ok "Backend should start and re-run migrations. Check with option 4 (Stack status)."
  else
    err "Resolve failed. Ensure you have the latest code (git pull) with the fixed migration, then run:"
    echo "  docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml run --rm backend npx prisma migrate resolve --rolled-back \"20260121182418_add_taxes\""
    echo "  docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml up -d --build backend"
  fi
}

main_menu() {
  check_project
  while true; do
    echo ""
    echo -e "${GREEN}=== Ecommerce Infinity – Server setup ===${NC}"
    echo "  1) Install Docker & Docker Compose"
    echo "  2) Setup .env (from .env.example)"
    echo "  3) Start stack (dev / prod / tunnel)"
    echo "  4) Stack status"
    echo "  5) Install cloudflared (for tunnel)"
    echo "  6) Run Quick Tunnel (get public URL)"
    echo "  7) Set tunnel URL in .env (app + API + Next CDN) and rebuild frontend"
    echo "  8) Backup database"
    echo "  9) View logs (follow)"
    echo " 10) Open firewall (ports 22,80,443,3000,3001,9000,9001)"
    echo " 11) Resolve failed Prisma migration & restart backend"
    echo "  0) Exit"
    echo ""
    read -p "Choice (0–11): " -r choice
    case "$choice" in
      1) install_docker ;;
      2) setup_env ;;
      3) start_stack ;;
      4) stack_status ;;
      5) install_cloudflared ;;
      6) run_quick_tunnel ;;
      7) set_tunnel_url_and_restart ;;
      8) backup_db ;;
      9) show_logs ;;
      10) open_firewall ;;
      11) resolve_failed_migration ;;
      0) ok "Bye."; exit 0 ;;
      *) warn "Invalid choice." ;;
    esac
  done
}

main_menu
