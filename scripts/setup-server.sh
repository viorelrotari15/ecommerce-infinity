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
  echo "  4) Tunnel + Monitoring (tunnel + Prometheus, Grafana, Loki, Promtail)"
  read -p "Choice (1–4): " -r choice
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
    4) docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml -f docker-compose.monitoring.yml up -d
       ok "Tunnel + Monitoring started. Set tunnel URL (option 7), then configure Grafana (option 14). Grafana: http://$(hostname -I | awk '{print $1}'):3002 or https://YOUR_TUNNEL/grafana/"
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

show_logs_last() {
  local lines="${1:-200}"
  info "Last $lines lines of logs (all services):"
  echo ""
  docker compose logs --tail="$lines" 2>/dev/null || docker compose -f docker-compose.prod.yml logs --tail="$lines" 2>/dev/null || true
}

save_logs_to_file() {
  local logfile="docker-logs-$(date +%Y%m%d-%H%M%S).txt"
  info "Saving all logs to $logfile ..."
  if docker compose logs --no-log-prefix > "$logfile" 2>/dev/null || docker compose -f docker-compose.prod.yml logs --no-log-prefix > "$logfile" 2>/dev/null; then
    ok "Saved to $PROJECT_ROOT/$logfile"
    info "Download via scp: scp user@server:$PROJECT_ROOT/$logfile ."
  info "Or view in browser (admin): https://YOUR_URL/api/admin/logs (tail=500 or download=1)"
  else
    err "Failed to save logs."
  fi
}

stack_status() {
  docker compose ps 2>/dev/null || docker compose -f docker-compose.prod.yml ps 2>/dev/null || true
}

open_firewall() {
  info "Opening common ports: 22, 80, 443, 3000, 3001, 3002, 9000, 9001..."
  for p in 22 80 443 3000 3001 3002 9000 9001; do
    sudo ufw allow "$p/tcp" 2>/dev/null || true
  done
  sudo ufw --force enable 2>/dev/null || true
  ok "Firewall updated. Check: sudo ufw status"
  info "Port 3002 = Grafana (local access when not using public /grafana/)"
}

# Configure Grafana: public URL (under /grafana/) and/or admin password.
# Run monitoring stack first: docker compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml up -d
configure_grafana() {
  [[ ! -f .env ]] && { err ".env not found. Run 'Setup .env' first."; return 1; }
  echo ""
  info "Grafana can be: (1) Public at https://YOUR_URL/grafana/ or (2) Local only at http://SERVER_IP:3002"
  read -p "Expose Grafana at a public URL? (y/N): " -r pub
  if [[ $pub =~ ^[yY]$ ]]; then
    base_url=""
    if grep -q "^NEXT_PUBLIC_APP_URL=" .env 2>/dev/null; then
      base_url=$(grep "^NEXT_PUBLIC_APP_URL=" .env | sed 's/^NEXT_PUBLIC_APP_URL=//' | tr -d '\r')
    fi
    [[ -z "$base_url" ]] && read -p "Enter base URL (e.g. https://xxx.trycloudflare.com, no trailing slash): " -r base_url
    if [[ -n "$base_url" ]]; then
      grafana_url="${base_url}/grafana"
      for key in GRAFANA_ROOT_URL; do
        if grep -q "^${key}=" .env 2>/dev/null; then
          sed -i.bak "s|^${key}=.*|${key}=${grafana_url}|" .env
        else
          echo "${key}=${grafana_url}" >> .env
        fi
      done
      if grep -q "^GRAFANA_SERVE_FROM_SUB_PATH=" .env 2>/dev/null; then
        sed -i.bak "s|^GRAFANA_SERVE_FROM_SUB_PATH=.*|GRAFANA_SERVE_FROM_SUB_PATH=true|" .env
      else
        echo "GRAFANA_SERVE_FROM_SUB_PATH=true" >> .env
      fi
      rm -f .env.bak
      ok "Grafana will be available at: $grafana_url/"
    fi
  else
    # Local only: ensure subpath is false
    if grep -q "^GRAFANA_SERVE_FROM_SUB_PATH=" .env 2>/dev/null; then
      sed -i.bak "s|^GRAFANA_SERVE_FROM_SUB_PATH=.*|GRAFANA_SERVE_FROM_SUB_PATH=false|" .env
      rm -f .env.bak
    fi
    ok "Grafana set to local only. Access at http://$(hostname -I | awk '{print $1}'):3002"
  fi
  echo ""
  read -p "Set Grafana admin password? (strongly recommended if public) (y/N): " -r pwd
  if [[ $pwd =~ ^[yY]$ ]]; then
    read -sp "Enter new Grafana admin password: " -r newpass
    echo ""
    if [[ -n "$newpass" ]]; then
      if grep -q "^GRAFANA_ADMIN_PASSWORD=" .env 2>/dev/null; then
        sed -i.bak "s|^GRAFANA_ADMIN_PASSWORD=.*|GRAFANA_ADMIN_PASSWORD=${newpass}|" .env
      else
        echo "GRAFANA_ADMIN_PASSWORD=${newpass}" >> .env
      fi
      rm -f .env.bak
      ok "Grafana admin password updated."
    fi
  fi
  read -p "Set Grafana admin username? (default: admin) (y/N): " -r user
  if [[ $user =~ ^[yY]$ ]]; then
    read -p "Enter Grafana admin username: " -r adminuser
    if [[ -n "$adminuser" ]]; then
      if grep -q "^GRAFANA_ADMIN_USER=" .env 2>/dev/null; then
        sed -i.bak "s|^GRAFANA_ADMIN_USER=.*|GRAFANA_ADMIN_USER=${adminuser}|" .env
      else
        echo "GRAFANA_ADMIN_USER=${adminuser}" >> .env
      fi
      rm -f .env.bak
      ok "Grafana admin user set to: $adminuser"
    fi
  fi
  echo ""
  info "Restarting Grafana to apply config (if monitoring stack is running)..."
  if docker compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml restart grafana 2>/dev/null; then
    ok "Grafana restarted. Open Grafana (public URL or http://SERVER_IP:3002)."
  else
    warn "Monitoring stack not running. Start it with: docker compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml up -d"
  fi
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

# Fix orders table missing columns (guestEmail, regionId, etc.) when /api/orders returns 500. Idempotent.
fix_orders_schema() {
  local sqlfile="$PROJECT_ROOT/scripts/fix-orders-schema.sql"
  [[ ! -f "$sqlfile" ]] && { err "Not found: $sqlfile"; return 1; }
  local db_name="ecommerce"
  [[ -f .env ]] && grep -q "^DB_NAME=" .env && db_name=$(grep "^DB_NAME=" .env | cut -d= -f2- | tr -d '\r" ')
  info "Applying orders schema fix (guestEmail, regionId, etc.) to DB: $db_name ..."
  if docker compose exec -T postgres psql -U postgres -d "$db_name" -f - < "$sqlfile" 2>/dev/null; then
    ok "Orders schema fix applied (dev stack)."
    return 0
  fi
  if docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d "$db_name" -f - < "$sqlfile" 2>/dev/null; then
    ok "Orders schema fix applied (prod stack)."
    return 0
  fi
  if docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml exec -T postgres psql -U postgres -d "$db_name" -f - < "$sqlfile" 2>/dev/null; then
    ok "Orders schema fix applied (prod+tunnel stack)."
    return 0
  fi
  if docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml -f docker-compose.monitoring.yml exec -T postgres psql -U postgres -d "$db_name" -f - < "$sqlfile" 2>/dev/null; then
    ok "Orders schema fix applied (prod+tunnel+monitoring stack)."
    return 0
  fi
  err "Could not apply fix. Is the stack running? Start with option 3."
  return 1
}

create_admin_user() {
  echo ""
  info "Create or update an admin user (email, password, optional first/last name)."
  read -p "Admin email: " -r email
  [[ -z "$email" ]] && { warn "Email required."; return 1; }
  read -sp "Admin password: " -r password
  echo ""
  [[ -z "$password" ]] && { warn "Password required."; return 1; }
  read -p "First name (optional, default Admin): " -r first
  read -p "Last name (optional, default User): " -r last
  first="${first:-Admin}"
  last="${last:-User}"
  info "Running create-admin..."
  if docker compose exec -T backend npm run create-admin -- "$email" "$password" "$first" "$last" 2>/dev/null; then
    ok "Admin user created/updated."
    return 0
  fi
  if docker compose -f docker-compose.prod.yml exec -T backend npm run create-admin -- "$email" "$password" "$first" "$last" 2>/dev/null; then
    ok "Admin user created/updated (prod)."
    return 0
  fi
  if docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml exec -T backend npm run create-admin -- "$email" "$password" "$first" "$last" 2>/dev/null; then
    ok "Admin user created/updated (prod+tunnel)."
    return 0
  fi
  err "Could not run create-admin. Is the backend container running?"
  return 1
}

# Configure Stripe keys in .env (publishable, secret, webhook secret, currency).
configure_stripe() {
  [[ ! -f .env ]] && { err ".env not found. Run 'Setup .env' first."; return 1; }
  echo ""
  info "Configure Stripe for payments. Get keys from https://dashboard.stripe.com/apikeys"
  info "Webhook secret from https://dashboard.stripe.com/webhooks (endpoint: https://YOUR_DOMAIN/api/payments/stripe/webhook)"
  echo ""
  read -p "Stripe Publishable Key (pk_test_... or pk_live_...): " -r pub_key
  if [[ -n "$pub_key" ]]; then
    if grep -q "^NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=" .env 2>/dev/null; then
      sed -i.bak "s|^NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=.*|NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${pub_key}|" .env
    else
      echo "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${pub_key}" >> .env
    fi
    ok "Publishable key set."
  fi
  read -sp "Stripe Secret Key (sk_test_... or sk_live_...): " -r secret_key
  echo ""
  if [[ -n "$secret_key" ]]; then
    if grep -q "^STRIPE_SECRET_KEY=" .env 2>/dev/null; then
      sed -i.bak "s|^STRIPE_SECRET_KEY=.*|STRIPE_SECRET_KEY=${secret_key}|" .env
    else
      echo "STRIPE_SECRET_KEY=${secret_key}" >> .env
    fi
    ok "Secret key set."
  fi
  read -sp "Stripe Webhook Secret (whsec_...): " -r webhook_secret
  echo ""
  if [[ -n "$webhook_secret" ]]; then
    if grep -q "^STRIPE_WEBHOOK_SECRET=" .env 2>/dev/null; then
      sed -i.bak "s|^STRIPE_WEBHOOK_SECRET=.*|STRIPE_WEBHOOK_SECRET=${webhook_secret}|" .env
    else
      echo "STRIPE_WEBHOOK_SECRET=${webhook_secret}" >> .env
    fi
    ok "Webhook secret set."
  fi
  read -p "Stripe currency (default EUR): " -r currency
  currency="${currency:-EUR}"
  if grep -q "^STRIPE_CURRENCY=" .env 2>/dev/null; then
    sed -i.bak "s|^STRIPE_CURRENCY=.*|STRIPE_CURRENCY=${currency}|" .env
  else
    echo "STRIPE_CURRENCY=${currency}" >> .env
  fi
  rm -f .env.bak
  ok "Stripe keys saved to .env."
  info "Restart backend for secret/webhook/currency. Rebuild frontend for publishable key: docker compose -f docker-compose.prod.yml up -d --build backend frontend"
}

# Set app-wide currency (frontend display, backend emails, Stripe). ISO 4217 code: EUR, USD, GBP, etc.
configure_currency() {
  [[ ! -f .env ]] && { err ".env not found. Run 'Setup .env' first."; return 1; }
  echo ""
  info "Set default currency for the whole app (prices, Stripe, order emails). Use ISO 4217 code (e.g. EUR, USD, GBP)."
  read -p "Currency code (default EUR): " -r currency
  currency="${currency:-EUR}"
  currency=$(echo "$currency" | tr '[:lower:]' '[:upper:]' | cut -c1-3)
  [[ -z "$currency" ]] && currency="EUR"
  for key in NEXT_PUBLIC_DEFAULT_CURRENCY APP_CURRENCY STRIPE_CURRENCY; do
    if grep -q "^${key}=" .env 2>/dev/null; then
      sed -i.bak "s|^${key}=.*|${key}=${currency}|" .env
    else
      echo "${key}=${currency}" >> .env
    fi
  done
  rm -f .env.bak
  ok "Currency set to ${currency} (frontend, backend, Stripe)."
  info "Restart backend and rebuild frontend to apply: docker compose -f docker-compose.prod.yml up -d --build backend frontend"
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
    echo " 10) View last 200 lines of logs"
    echo " 11) Save logs to file (for download via scp)"
    echo " 12) Open firewall (ports 22,80,443,3000,3001,3002,9000,9001)"
    echo " 13) Resolve failed Prisma migration & restart backend"
    echo " 14) Configure Grafana (public URL, admin password)"
    echo " 15) Fix orders schema (if /api/orders returns 500)"
    echo " 16) Create admin user"
    echo " 17) Configure Stripe (payment keys)"
    echo " 18) Configure currency (app-wide: EUR, USD, etc.)"
    echo "  0) Exit"
    echo ""
    read -p "Choice (0–18): " -r choice
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
      10) show_logs_last ;;
      11) save_logs_to_file ;;
      12) open_firewall ;;
      13) resolve_failed_migration ;;
      14) configure_grafana ;;
      15) fix_orders_schema ;;
      16) create_admin_user ;;
      17) configure_stripe ;;
      18) configure_currency ;;
      0) ok "Bye."; exit 0 ;;
      *) warn "Invalid choice." ;;
    esac
  done
}

main_menu
