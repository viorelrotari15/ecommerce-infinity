# Cloudflare Tunnel – Step-by-step setup

This guide gets your staging app **public on the internet** with a single URL (HTTPS) using Cloudflare Tunnel. No port forwarding and no domain required for the quick option.

**Faster:** On the server you can use the **setup console** and do most steps from one menu: run `./scripts/setup-server.sh` (or `npm run setup:server`). Use options 2 → 3 (tunnel) → 5 (install cloudflared) → 6 (run quick tunnel) → 7 (set URL and restart). See [DEPLOYMENT.md](DEPLOYMENT.md#server-setup-console-fast-setup).

---

## Overview

1. **App stack**: Nginx listens on port 80 and proxies `/` to the frontend and `/api/` to the backend (tunnel-friendly config).
2. **cloudflared**: Runs on the server and connects outbound to Cloudflare; Cloudflare gives you a public URL (and HTTPS).
3. **`.env`**: You set the public URL so the frontend knows the API and asset base URL.

You can use either:
- **Quick Tunnel** – No Cloudflare account; you get a random `*.trycloudflare.com` URL (good for testing).
- **Named Tunnel** – Cloudflare account + (optional) your own domain; stable URL and no quick-tunnel limits.

---

## Prerequisites

- Ubuntu server (e.g. your Hyper-V VM) with the project cloned and Docker installed.
- For **Quick Tunnel**: nothing else.
- For **Named Tunnel**: a [Cloudflare account](https://dash.cloudflare.com/sign-up) and, for a custom hostname, a domain added to Cloudflare.

---

## Step 1 – Start the app with the tunnel nginx config

On the server, in the project root:

1. **Create or edit `.env`** (you’ll set the public URL after starting the tunnel in Step 3):

```env
NODE_ENV=production
DB_USER=postgres
DB_PASSWORD=<your-db-password>
DB_NAME=ecommerce
JWT_SECRET=<your-jwt-secret>
MINIO_ACCESS_KEY=<your-minio-key>
MINIO_SECRET_KEY=<your-minio-secret>
# Leave these as placeholders for now; set them in Step 3 after you get the tunnel URL
NEXT_PUBLIC_APP_URL=https://YOUR_TUNNEL_URL
NEXT_PUBLIC_API_URL=https://YOUR_TUNNEL_URL/api
NEXT_PUBLIC_CDN_URL=https://YOUR_TUNNEL_URL
MINIO_PUBLIC_URL=https://YOUR_TUNNEL_URL
```

2. **Start the stack with the tunnel override** (nginx serves HTTP on 80 only, no HTTPS redirect):

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml up -d
```

3. **Check that nginx and app are up:**

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml ps
curl -s -o /dev/null -w "%{http_code}" http://localhost:80
```

You should see `200` or `304`. Leave this stack running.

---

## Step 2 – Install cloudflared on the server

On the **same Ubuntu server**:

```bash
# Download the latest .deb (adjust arch if not amd64, e.g. arm64 for Raspberry Pi)
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
cloudflared --version
```

---

## Step 3a – Quick Tunnel (no account, random URL)

1. **Start a quick tunnel** pointing at nginx on port 80:

```bash
cloudflared tunnel --url http://localhost:80
```

2. **Copy the public URL** from the output, e.g.:

```text
Your quick Tunnel has been created! Visit it at:
https://random-words-here.trycloudflare.com
```

3. **Set that URL in `.env`** on the server (replace with your actual URL, no trailing slash):

```env
NEXT_PUBLIC_APP_URL=https://random-words-here.trycloudflare.com
NEXT_PUBLIC_API_URL=https://random-words-here.trycloudflare.com/api
NEXT_PUBLIC_CDN_URL=https://random-words-here.trycloudflare.com
MINIO_PUBLIC_URL=https://random-words-here.trycloudflare.com
```

4. **Restart the frontend** so it picks up the new env (backend and nginx can stay as-is):

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml restart frontend
```

5. **Open the URL** in any browser – your staging app is now public over HTTPS.

**Note:** Quick Tunnels have limits (e.g. ~200 concurrent requests, no SSE). For a stable staging URL, use a Named Tunnel (Step 3b). To keep the quick tunnel running in the background, use `tmux`/`screen` or run it as a systemd service (see Step 4).

---

## Step 3b – Named Tunnel (Cloudflare account, optional custom domain)

### 3b.1 Log in and create the tunnel

```bash
cloudflared tunnel login
```

Open the URL shown in the browser, sign in to Cloudflare, and choose the domain (or “No domain” if you only want a free `*.cfargotunnel.com` hostname). This saves a cert under `~/.cloudflared/`.

Create a named tunnel (e.g. `ecommerce-staging`):

```bash
cloudflared tunnel create ecommerce-staging
```

Note the **Tunnel ID** from the output (e.g. `abcd1234-5678-90ab-cdef-1234567890ab`).

### 3b.2 Create the config file

```bash
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

Use this (replace `TUNNEL_ID` with your tunnel ID; replace `staging.yourdomain.com` with your hostname or remove the `hostname` line to use the default `*.cfargotunnel.com`):

**Option 1 – Custom domain** (e.g. `staging.yourdomain.com` in Cloudflare):

```yaml
tunnel: TUNNEL_ID
credentials-file: /home/YOUR_USERNAME/.cloudflared/TUNNEL_ID.json

ingress:
  - hostname: staging.yourdomain.com
    service: http://localhost:80
  - service: http_status:404
```

**Option 2 – Default Cloudflare hostname** (e.g. `ecommerce-staging-xyz.cfargotunnel.com`):

```yaml
tunnel: TUNNEL_ID
credentials-file: /home/YOUR_USERNAME/.cloudflared/TUNNEL_ID.json

ingress:
  - service: http://localhost:80
```

- Replace `YOUR_USERNAME` with your Linux username (from `whoami`).
- After `tunnel create`, the credentials file is at `~/.cloudflared/<TUNNEL_ID>.json`.

### 3b.3 Route DNS (only for custom domain)

If you used a custom hostname in `config.yml`:

```bash
cloudflared tunnel route dns ecommerce-staging staging.yourdomain.com
```

(Use your tunnel name and hostname.)

### 3b.4 Run the tunnel

**One-off (foreground):**

```bash
cloudflared tunnel run ecommerce-staging
```

Your app is then available at:
- Custom domain: `https://staging.yourdomain.com`, or  
- Default: the URL shown in the tunnel run output (e.g. `https://ecommerce-staging-xyz.cfargotunnel.com`).

**Run as a service (recommended):**

```bash
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

If you used a config path other than the default, install with:

```bash
sudo cloudflared service install --config ~/.cloudflared/config.yml
```

### 3b.5 Set the public URL in `.env`

Set the same URL you use in the browser (no trailing slash):

```env
NEXT_PUBLIC_APP_URL=https://staging.yourdomain.com
NEXT_PUBLIC_API_URL=https://staging.yourdomain.com/api
NEXT_PUBLIC_CDN_URL=https://staging.yourdomain.com
MINIO_PUBLIC_URL=https://staging.yourdomain.com
```

Restart the frontend:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml restart frontend
```

---

## Step 4 – Run Quick Tunnel in the background (optional)

If you use a **Quick Tunnel** and want it to keep running:

**Using systemd (recommended):**

```bash
# Create a user service (no root)
mkdir -p ~/.config/systemd/user
cat << 'EOF' > ~/.config/systemd/user/cloudflared-quick.service
[Unit]
Description=Cloudflare Quick Tunnel to localhost:80
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/cloudflared tunnel --url http://localhost:80
Restart=on-failure

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now cloudflared-quick.service
```

**Note:** The Quick Tunnel URL **changes each time** the process starts. After each restart, read the new URL from logs and update `.env` + restart the frontend:

```bash
journalctl --user -u cloudflared-quick.service -f
```

---

## Summary

| Step | Action |
|------|--------|
| 1 | `docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml up -d` |
| 2 | Install `cloudflared` on the server |
| 3a | Quick: `cloudflared tunnel --url http://localhost:80` → use the `trycloudflare.com` URL |
| 3b | Named: `cloudflared tunnel login`, `tunnel create`, edit `~/.cloudflared/config.yml`, `tunnel run` or install as service |
| 4 | Set `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_API_URL` / etc. in `.env` to your public URL (https://...) |
| 5 | `docker compose ... restart frontend` |

After that, your staging app is reachable from any browser over the internet with HTTPS (handled by Cloudflare). No port forwarding or domain required for Quick Tunnel; for a stable URL use a Named Tunnel (with or without your own domain).
