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

# Firebase: prompt for each service account field one by one, then write FIREBASE_PROJECT_ID and FIREBASE_SERVICE_ACCOUNT to .env.
configure_firebase_private_key() {
  [[ ! -f .env ]] && { err ".env not found. Run 'Setup .env' first."; return 1; }
  echo ""
  info "Firebase (Google/Facebook login): enter each value from your service account JSON."
  info "Get the JSON: Firebase Console → Project settings → Service accounts → Generate new private key."
  info "Use the SAME project as in apps/frontend/firebase-config.json."
  echo ""

  read -p "Project ID (e.g. my-project-123): " -r project_id
  project_id=$(echo "$project_id" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  [[ -z "$project_id" ]] && { err "Project ID is required."; return 1; }

  read -p "Private key ID: " -r private_key_id
  private_key_id=$(echo "$private_key_id" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  [[ -z "$private_key_id" ]] && { err "Private key ID is required."; return 1; }

  echo ""
  info "Paste the private key (including -----BEGIN and -----END lines)."
  info "After the last line of the key, type exactly: END   (then press Enter)"
  echo ""
  local private_key_lines=""
  while IFS= read -r line; do
    [[ "$line" == "END" ]] && break
    private_key_lines="${private_key_lines}${line}"$'\n'
  done
  private_key_lines="${private_key_lines%$'\n'}"
  [[ -z "$private_key_lines" ]] && { err "Private key is required."; return 1; }

  read -p "Client email (e.g. firebase-adminsdk-xxx@project.iam.gserviceaccount.com): " -r client_email
  client_email=$(echo "$client_email" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  [[ -z "$client_email" ]] && { err "Client email is required."; return 1; }

  read -p "Client ID (numeric): " -r client_id
  client_id=$(echo "$client_id" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  [[ -z "$client_id" ]] && { err "Client ID is required."; return 1; }

  read -p "Auth URI [default: https://accounts.google.com/o/oauth2/auth]: " -r auth_uri
  auth_uri=$(echo "$auth_uri" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  auth_uri="${auth_uri:-https://accounts.google.com/o/oauth2/auth}"

  read -p "Token URI [default: https://oauth2.googleapis.com/token]: " -r token_uri
  token_uri=$(echo "$token_uri" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  token_uri="${token_uri:-https://oauth2.googleapis.com/token}"

  read -p "Auth provider x509 cert URL [default: https://www.googleapis.com/oauth2/v1/certs]: " -r auth_provider_x509_cert_url
  auth_provider_x509_cert_url=$(echo "$auth_provider_x509_cert_url" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  auth_provider_x509_cert_url="${auth_provider_x509_cert_url:-https://www.googleapis.com/oauth2/v1/certs}"

  read -p "Client x509 cert URL (optional, press Enter to skip): " -r client_x509_cert_url
  client_x509_cert_url=$(echo "$client_x509_cert_url" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

  read -p "Universe domain [default: googleapis.com]: " -r universe_domain
  universe_domain=$(echo "$universe_domain" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  universe_domain="${universe_domain:-googleapis.com}"

  # Escape private key for JSON: escape backslash then quote then newlines -> \n
  local pk_escaped
  pk_escaped=$(echo "$private_key_lines" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')
  # Escape other fields for JSON (double quotes and backslashes)
  escape_json() { echo "$1" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g'; }
  project_id_j=$(escape_json "$project_id")
  private_key_id_j=$(escape_json "$private_key_id")
  client_email_j=$(escape_json "$client_email")
  client_id_j=$(escape_json "$client_id")
  auth_uri_j=$(escape_json "$auth_uri")
  token_uri_j=$(escape_json "$token_uri")
  auth_provider_x509_cert_url_j=$(escape_json "$auth_provider_x509_cert_url")
  client_x509_cert_url_j=$(escape_json "$client_x509_cert_url")
  universe_domain_j=$(escape_json "$universe_domain")

  # Build compact JSON (optional fields only if non-empty)
  local json_parts="\"type\":\"service_account\",\"project_id\":\"${project_id_j}\",\"private_key_id\":\"${private_key_id_j}\",\"private_key\":\"${pk_escaped}\",\"client_email\":\"${client_email_j}\",\"client_id\":\"${client_id_j}\",\"auth_uri\":\"${auth_uri_j}\",\"token_uri\":\"${token_uri_j}\",\"auth_provider_x509_cert_url\":\"${auth_provider_x509_cert_url_j}\""
  [[ -n "$client_x509_cert_url" ]] && json_parts="${json_parts},\"client_x509_cert_url\":\"${client_x509_cert_url_j}\""
  json_parts="${json_parts},\"universe_domain\":\"${universe_domain_j}\""
  local compact="{$json_parts}"

  for key in FIREBASE_PROJECT_ID FIREBASE_SERVICE_ACCOUNT; do
    if grep -q "^${key}=" .env 2>/dev/null; then
      if [[ "$key" == "FIREBASE_SERVICE_ACCOUNT" ]]; then
        sed -i.bak "s|^${key}=.*|${key}=\"${compact}\"|" .env
      else
        sed -i.bak "s|^${key}=.*|${key}=${project_id}|" .env
      fi
    else
      if [[ "$key" == "FIREBASE_SERVICE_ACCOUNT" ]]; then
        echo "${key}=\"${compact}\"" >> .env
      else
        echo "${key}=${project_id}" >> .env
      fi
    fi
  done
  rm -f .env.bak
  ok "Firebase project ID and service account saved to .env."
  echo ""
  read -p "Restart backend now so it can verify Google/Facebook tokens? (Y/n): " -r do_restart
  if [[ ! "$do_restart" =~ ^[nN]$ ]]; then
    if docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml up -d backend 2>/dev/null; then
      ok "Backend restarted (prod+tunnel)."
    elif docker compose -f docker-compose.prod.yml up -d backend 2>/dev/null; then
      ok "Backend restarted (prod)."
    elif docker compose up -d backend 2>/dev/null; then
      ok "Backend restarted (dev)."
    else
      warn "Could not restart backend. Run manually: docker compose -f docker-compose.prod.yml up -d backend"
    fi
  fi
  echo ""
  info "Firebase wrap-up checklist:"
  echo "  • Backend: FIREBASE_SERVICE_ACCOUNT and FIREBASE_PROJECT_ID are set (this script)."
  echo "  • Frontend: Use the SAME Firebase project in apps/frontend/firebase-config.json"
  echo "  • Firebase Console: Enable Google and/or Facebook in Authentication → Sign-in method."
  echo "  • If you changed firebase-config.json, rebuild frontend: docker compose -f docker-compose.prod.yml build frontend && docker compose -f docker-compose.prod.yml up -d frontend"
}

# Configure Resend for transactional emails (order confirmations, admin notifications).
configure_resend() {
  [[ ! -f .env ]] && { err ".env not found. Run 'Setup .env' first."; return 1; }
  echo ""
  info "Configure Resend for sending emails (order confirmations, admin alerts). Get API key at https://resend.com/api-keys"
  info "From address: use onboarding@resend.dev for testing, or a verified domain (e.g. no-reply@yourdomain.com)."
  echo ""
  read -sp "Resend API Key (re_...): " -r api_key
  echo ""
  if [[ -n "$api_key" ]]; then
    if grep -q "^RESEND_API_KEY=" .env 2>/dev/null; then
      sed -i.bak "s|^RESEND_API_KEY=.*|RESEND_API_KEY=${api_key}|" .env
    else
      echo "RESEND_API_KEY=${api_key}" >> .env
    fi
    ok "Resend API key set."
  fi
  read -p "From email (default: onboarding@resend.dev): " -r from_email
  from_email="${from_email:-onboarding@resend.dev}"
  if grep -q "^RESEND_FROM_EMAIL=" .env 2>/dev/null; then
    sed -i.bak "s|^RESEND_FROM_EMAIL=.*|RESEND_FROM_EMAIL=${from_email}|" .env
  else
    echo "RESEND_FROM_EMAIL=${from_email}" >> .env
  fi
  ok "From email set to: $from_email"
  read -p "From name (e.g. your store name, default from branding): " -r from_name
  if [[ -n "$from_name" ]]; then
    if grep -q "^RESEND_FROM_NAME=" .env 2>/dev/null; then
      sed -i.bak "s|^RESEND_FROM_NAME=.*|RESEND_FROM_NAME=${from_name}|" .env
    else
      echo "RESEND_FROM_NAME=${from_name}" >> .env
    fi
    ok "From name set."
  fi
  read -p "Admin email for new-order notifications (optional): " -r admin_email
  if [[ -n "$admin_email" ]]; then
    if grep -q "^ADMIN_ORDER_EMAIL=" .env 2>/dev/null; then
      sed -i.bak "s|^ADMIN_ORDER_EMAIL=.*|ADMIN_ORDER_EMAIL=${admin_email}|" .env
    else
      echo "ADMIN_ORDER_EMAIL=${admin_email}" >> .env
    fi
    ok "Admin order email set to: $admin_email"
  fi
  rm -f .env.bak
  ok "Resend keys saved to .env."
  info "Restart backend to apply: docker compose -f docker-compose.prod.yml up -d backend"
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
    echo " 19) Setup Firebase (backend: service account file path or paste JSON for Google/Facebook login)"
    echo " 20) Configure Resend (email: order confirmations, admin alerts)"
    echo "  0) Exit"
    echo ""
    read -p "Choice (0–20): " -r choice
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
      19) configure_firebase_private_key ;;
      20) configure_resend ;;
      0) ok "Bye."; exit 0 ;;
      *) warn "Invalid choice." ;;
    esac
  done
}

main_menu
