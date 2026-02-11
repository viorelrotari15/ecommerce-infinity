# Ecommerce Infinity – Staging Deployment Guide

Step-by-step guide for deploying the application in a **staging** environment: host setup, **public staging (accessible from any browser worldwide)**, optional Grafana and DB access, local frontend with remote backend, and future whitelist.

---

## Server setup console (fast setup)

On the **server**, from the project root, run the interactive menu to run all setup steps from one place:

```bash
chmod +x scripts/setup-server.sh   # once, to make it executable
./scripts/setup-server.sh
# or: npm run setup:server
```

**Menu options:** Install Docker | Setup .env | Start stack (dev/prod/tunnel) | Stack status | Install cloudflared | Run Quick Tunnel | Set tunnel URL in .env & restart frontend | Backup DB | View logs | Open firewall. No need to remember individual commands; the script runs them for you.

---

## To-do checklist

### Phase 1 – Staging up and running
- [ ] Server: Ubuntu + Docker + Docker Compose installed
- [ ] Staging reachable on LAN (VM IP); then make it **public on the internet** (see section 2)
- [ ] Firewall: open 22 (SSH), and 3000, 3001, 9000, 9001 for dev stack; or 80, 443 for prod
- [ ] Clone repo and create `.env` on server
- [ ] First run: **IP / no domain** → `docker compose up -d`; **with domain** → `docker compose -f docker-compose.prod.yml up -d`
- [ ] SSL: optional – use a free domain + Let’s Encrypt, or a tunnel (HTTPS for free)
- [ ] Verify: frontend + backend + API accessible from the internet

### Phase 2 – Monitoring (Grafana)
- [ ] Run monitoring stack (with same compose you use for app: dev or prod)
- [ ] Expose Grafana: port 3002 → `http://YOUR_SERVER_IP:3002`
- [ ] Set `GRAFANA_ADMIN_PASSWORD` and `GRAFANA_ROOT_URL` (e.g. `http://YOUR_SERVER_IP:3002`)
- [ ] (Future) Restrict Grafana by IP whitelist

### Phase 3 – DB access
- [ ] DB from server: `docker compose exec postgres psql ...`
- [ ] (Future) DB from local: SSH tunnel or whitelist
- [ ] (Future) Restrict Postgres by IP whitelist

### Phase 4 – Security / whitelist (future)
- [ ] Backend/API: remain public
- [ ] Frontend: whitelist only (nginx or firewall)
- [ ] DB: no public port or whitelist only
- [ ] Grafana: whitelist only

### Phase 5 – Local frontend, remote backend
- [ ] Local `.env`: `NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:3001` (or `https://yourdomain.com/api` if you have a domain)
- [ ] Run frontend locally; API calls go to staging backend

---

## 1. Server and host (staging)

### 1.1 Server
- Ubuntu Server 22.04/24.04 (e.g. Hyper-V VM or VPS)
- Min 2 GB RAM, 2 vCPU, 20 GB disk
- **No domain needed:** use your VM or server IP (e.g. `192.168.1.100` on LAN, or your public IP if exposed)

### 1.2 Install Docker
```bash
sudo apt update && sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${VERSION_CODENAME:-$VERSION}") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
# Log out and back in
```

### 1.3 DNS (optional – only if you have a domain)
- Skip this if you use IP only.  
- If you have a domain: A record e.g. `staging.yourdomain.com` → server public IP.

### 1.4 Firewall
**IP-only (no domain):** open SSH and app ports (dev stack uses 3000, 3001, 9000, 9001, 5433).
```bash
sudo ufw allow 22/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp
sudo ufw allow 9000/tcp
sudo ufw allow 9001/tcp
sudo ufw allow 5433/tcp
sudo ufw enable
```
**With a domain (prod + nginx):** open 80, 443, 22 instead (see section 1.8).

### 1.5 Clone and env on server
```bash
cd /opt
sudo git clone <your-repo-url> ecommerce-infinity
cd ecommerce-infinity
sudo chown -R $USER:$USER .
cp .env.example .env
nano .env
```

### 1.6 Staging `.env` (minimal)

**No domain – use your server/VM IP or public URL**  
- **LAN only:** replace `YOUR_SERVER_IP` with your VM’s local IP (e.g. `192.168.1.100`).  
- **Public (internet):** use your **public IP** (from port forwarding) or your **tunnel URL** (e.g. `https://xxxx.ngrok-free.app`) so the app is reachable from any browser. Use **http** for IP; tunnels often give **https** for free.

```env
NODE_ENV=production
DB_USER=postgres
DB_PASSWORD=<strong-password>
DB_NAME=ecommerce
JWT_SECRET=<long-random-secret>
MINIO_ACCESS_KEY=<strong-key>
MINIO_SECRET_KEY=<strong-secret>
NEXT_PUBLIC_APP_URL=http://YOUR_SERVER_IP:3000
NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:3001
NEXT_PUBLIC_CDN_URL=http://YOUR_SERVER_IP:9000
MINIO_PUBLIC_URL=http://YOUR_SERVER_IP:9000
```

Then start the **development** stack (no nginx, no SSL): see 1.7.  
Access: **Frontend** `http://YOUR_SERVER_IP:3000`, **API** `http://YOUR_SERVER_IP:3001`, **MinIO console** `http://YOUR_SERVER_IP:9001`.

**With a domain (optional):** set `NGINX_SERVER_NAME=staging.yourdomain.com`, `NEXT_PUBLIC_APP_URL=https://staging.yourdomain.com`, etc., and use `docker-compose.prod.yml` + SSL (1.8).

### 1.7 Start staging stack

**No domain (IP only):** use the default compose so frontend/backend/MinIO are exposed on ports 3000, 3001, 9000, 9001.
```bash
docker compose up -d
docker compose ps
```

**With a domain:** use prod compose (nginx + SSL).
```bash
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

### 1.8 SSL (Let’s Encrypt) – only if you have a domain
Skip if using IP only. Let’s Encrypt does not issue certs for raw IPs.
```bash
docker compose -f docker-compose.prod.yml run --rm certbot certonly --webroot -w /var/www/certbot -d staging.yourdomain.com --email you@example.com --agree-tos --no-eff-email
docker compose -f docker-compose.prod.yml restart nginx
```

---

## 2. Making staging public (accessible from the internet)

Goal: **anyone in the world** can open your staging site in a browser (not only your home/office network). HTTP is enough; HTTPS is better and possible with the options below.

Your VM is likely behind a **router (NAT)**. Choose one of the following.

### Option A: Port forwarding (router) – HTTP, or HTTPS with a free domain

1. **Get your public IP**  
   From any device on the same network, open [whatismyip.com](https://whatismyip.com) or run `curl -s ifconfig.me` on the server. Example: `203.0.113.50`.

2. **Forward ports on your router**  
   In the router admin (often 192.168.1.1 or 192.168.0.1), add port forwarding:
   - External port **3000** → internal IP of your VM (e.g. `192.168.1.100`) port **3000**
   - External port **3001** → same VM port **3001**
   - (Optional) **9000**, **9001** if you want MinIO reachable from the internet.)

   If you use **prod stack + nginx**, forward **80** and **443** to the VM’s 80 and 443 instead.

3. **Public URL (HTTP)**  
   - Frontend: **http://YOUR_PUBLIC_IP:3000**  
   - API: **http://YOUR_PUBLIC_IP:3001**  
   Replace `YOUR_PUBLIC_IP` with the IP from step 1. Set this in `.env` as `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_API_URL` (see 1.6).  
   Anyone can open `http://YOUR_PUBLIC_IP:3000` from anywhere.

4. **HTTPS (optional)**  
   Let’s Encrypt does **not** issue certs for a raw IP. To get HTTPS:
   - Get a **free hostname** pointing to your public IP, e.g. [DuckDNS](https://www.duckdns.org/), [No-IP](https://www.noip.com/), or a free subdomain from your registrar.
   - Set DNS: `staging.mydomain.duckdns.org` → your public IP.
   - Use **prod stack** and set `NGINX_SERVER_NAME=staging.mydomain.duckdns.org`, then run certbot (1.8).  
   Your staging will be **https://staging.mydomain.duckdns.org**.

### Option B: Tunnel (no port forwarding) – public URL, often with free HTTPS

No router changes. A small client on the VM creates an outbound connection and you get a public URL (and usually HTTPS).

**Cloudflare Tunnel (recommended, free HTTPS)**  
→ **Full step-by-step:** see **[docs/CLOUDFLARE_TUNNEL.md](CLOUDFLARE_TUNNEL.md)**.  
In short: run the app with the tunnel nginx config (`docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml up -d`), install `cloudflared` on the server, then either use a **Quick Tunnel** (`cloudflared tunnel --url http://localhost:80`) for a random `*.trycloudflare.com` URL, or a **Named Tunnel** with optional custom domain. Set the public URL in `.env` and restart the frontend.

**ngrok**  
1. Sign up at [ngrok.com](https://ngrok.com) (free tier is enough).  
2. On the VM: install ngrok and run e.g. `ngrok http 3000` (frontend). You get `https://xxxx.ngrok-free.app`.  
3. For both frontend and API on one URL: run **prod stack** (nginx on 80), then `ngrok http 80`.  
4. Put the ngrok URL in `.env`: `NEXT_PUBLIC_APP_URL=https://xxxx.ngrok-free.app`, `NEXT_PUBLIC_API_URL=https://xxxx.ngrok-free.app/api`, and restart the frontend so it picks up the new env.

**Important:** After you have your **public URL** (from Option A or B), set it in the server `.env` and restart the app so the frontend uses the correct API URL and asset URLs. If you use a tunnel URL, rebuild or restart the frontend container so `NEXT_PUBLIC_*` are updated.

---

## 3. Grafana (staging)

### 3.1 Run monitoring with staging stack
Start monitoring **after** the app is running (monitoring needs postgres/redis from the app stack).
**IP-only:** app is already up with `docker compose up -d`; then:
```bash
docker compose -f docker-compose.monitoring.yml up -d
```
**With prod stack:** `docker compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml up -d`

### 3.2 Grafana in `.env`
```env
GRAFANA_PORT=3002
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=<strong-password>
GRAFANA_ROOT_URL=http://YOUR_SERVER_IP:3002
```

### 3.3 Access Grafana
- Open port 3002: `sudo ufw allow 3002/tcp`.
- Access: **http://YOUR_SERVER_IP:3002** (no domain needed).
- (Future) Restrict by IP whitelist or nginx.

---

## 4. Database access

### 4.1 From the server
**Dev stack (IP-only):**
```bash
docker compose exec postgres psql -U postgres -d ecommerce
```
**Prod stack:** `docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d ecommerce`

### 4.2 From local (future – SSH tunnel)
On the server, expose Postgres only on localhost (add under `postgres` in prod compose if needed):

```yaml
ports:
  - "127.0.0.1:5432:5432"
```

From your machine (use your server IP):

```bash
ssh -L 5433:127.0.0.1:5432 user@YOUR_SERVER_IP
```

Connect to `localhost:5433` with DB user/password from `.env`.  
(Future: restrict DB access by whitelist instead of or in addition to SSH.)

---

## 5. Local frontend with staging backend

- In your local clone (e.g. `apps/frontend` or root), set (use your staging server IP):

```env
NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
If you use a domain with prod stack: `NEXT_PUBLIC_API_URL=https://staging.yourdomain.com/api`

- Run frontend locally:

```bash
cd apps/frontend && npm install && npm run dev
```

- Open `http://localhost:3000`; API calls go to the staging backend.

---

## 6. Future: public backend only, frontend/DB/Grafana whitelist

- **Public:** Backend/API only (e.g. `http://YOUR_SERVER_IP:3001` or `https://yourdomain.com/api` if you add a domain).
- **Whitelist:** Frontend, DB, Grafana (nginx `allow`/`deny` or firewall rules).

See project docs or ENV_SETUP.md for nginx whitelist examples. DB: prefer no public port + SSH tunnel; Grafana: expose via nginx with IP allow list.

---

## 7. Quick reference (staging)

**LAN:** use VM IP (e.g. `192.168.1.100`). **Public (internet):** use your public IP or tunnel URL (section 2). HTTP is fine; HTTPS via free domain + certbot or via tunnel.

| Item            | Staging now (IP)              | Future                    |
|-----------------|------------------------------|---------------------------|
| Backend / API   | `http://YOUR_SERVER_IP:3001`  | Public                    |
| Frontend        | `http://YOUR_SERVER_IP:3000`  | Whitelist only            |
| MinIO console   | `http://YOUR_SERVER_IP:9001`  | —                         |
| DB              | Internal only                 | SSH tunnel / whitelist    |
| Grafana         | `http://YOUR_SERVER_IP:3002`  | Whitelist only            |
| Local frontend  | `NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:3001` | Same |
| Local DB        | —                             | SSH tunnel                |

| Task              | Command (IP-only) |
|-------------------|-------------------|
| Start staging     | `docker compose up -d` |
| Staging + Grafana | `docker compose -f docker-compose.monitoring.yml up -d` (after app is up) |
| DB shell          | `docker compose exec postgres psql -U postgres -d ecommerce` |
| Logs              | `docker compose logs -f` |
