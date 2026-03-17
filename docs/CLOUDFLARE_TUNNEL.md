# Cloudflare Tunnel – Step-by-step setup

This guide gets your staging app **public on the internet** with a single URL (HTTPS) using Cloudflare Tunnel. No port forwarding and no domain required for the quick option.

**Faster:** On the server you can use the **setup console** and do most steps from one menu: run `./scripts/setup-server.sh` (or `npm run setup:server`). Use options 2 → 3 (tunnel) → 5 (install cloudflared) → 6 (run quick tunnel) → 7 (set URL and restart). See [DEPLOYMENT.md](DEPLOYMENT.md#server-setup-console-fast-setup).

---

## Example: Cloudflare Tunnel with your domain (e.g. mistico.de)

If you have your own domain (e.g. **mistico.de**) and want the app at `https://mistico.de` (or `https://shop.mistico.de`):

1. **Add the domain to Cloudflare**
   - Sign up or log in at [dash.cloudflare.com](https://dash.cloudflare.com).
   - Click **Add a site** and enter **mistico.de**.
   - Cloudflare will show the nameservers you must set at your domain registrar (where you bought mistico.de). Replace the current NS records with Cloudflare’s (e.g. `xxx.ns.cloudflare.com`). Propagation can take up to 24–48 hours (often minutes).
   - In Cloudflare, **DNS** → add an A/AAAA or CNAME for the hostname you’ll use (e.g. `mistico.de` or `shop.mistico.de`). You can leave it as “proxy off” or “proxied”; the tunnel will override this in the next step.

2. **On the server: start the app and install cloudflared**
   - From project root:  
     `docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml up -d`
   - Install cloudflared (see [Step 2](#step-2--install-cloudflared-on-the-server) below), or use `./scripts/setup-server.sh` → option 5.

3. **Log in and create a named tunnel**
   ```bash
   cloudflared tunnel login
   ```
   Open the URL in a browser, sign in to Cloudflare, and **select the zone “mistico.de”**. This authorizes cloudflared for that domain.

   ```bash
   cloudflared tunnel create ecommerce-mistico
   ```
   Note the **Tunnel ID** (e.g. `abcd1234-5678-90ab-cdef-1234567890ab`).

4. **Config and DNS route**
   - Create config (replace `TUNNEL_ID` and `ubuntu` with your tunnel ID and username):
   ```bash
   mkdir -p ~/.cloudflared
   nano ~/.cloudflared/config.yml
   ```
   Paste (use `mistico.de` or `shop.mistico.de` as you prefer):
   ```yaml
   tunnel: TUNNEL_ID
   credentials-file: /home/ubuntu/.cloudflared/TUNNEL_ID.json

   ingress:
     - hostname: mistico.de
       service: http://localhost:80
     - hostname: www.mistico.de
       service: http://localhost:80
     - service: http_status:404
   ```
   - Create the DNS record for the tunnel:
   ```bash
   cloudflared tunnel route dns ecommerce-mistico mistico.de
   cloudflared tunnel route dns ecommerce-mistico www.mistico.de
   ```
   (Omit `www.mistico.de` if you only want the root domain.)

5. **Run the tunnel as a service**
   ```bash
   sudo cloudflared service install --config ~/.cloudflared/config.yml
   sudo systemctl start cloudflared
   sudo systemctl enable cloudflared
   ```

6. **Set the public URL in `.env`** (no trailing slash)
   ```env
   NEXT_PUBLIC_APP_URL=https://mistico.de
   NEXT_PUBLIC_API_URL=https://mistico.de/api
   NEXT_PUBLIC_CDN_URL=https://mistico.de
   MINIO_PUBLIC_URL=https://mistico.de
   ```
   Then restart the frontend:
   ```bash
   docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml restart frontend
   ```
   If you use a subdomain (e.g. `shop.mistico.de`), use that in `hostname` in config, in `tunnel route dns`, and in `.env` instead of `mistico.de`.

7. **Optional:** In [Firebase Console](https://console.firebase.google.com) → your project → **Authentication** → **Settings** → **Authorized domains**, add **mistico.de** and **www.mistico.de** so Google/Facebook login works on your domain.

After that, the app is available at **https://mistico.de** (and **https://www.mistico.de** if you added it). No port forwarding or SSL certificate on the server; Cloudflare provides HTTPS.

### mistico.de – Your Cloudflare nameservers

These are the nameservers Cloudflare assigned for **mistico.de**:

| Type | Value |
|------|--------|
| NS | `georgia.ns.cloudflare.com` |
| NS | `ignacio.ns.cloudflare.com` |

**What to do:** Log in at the **registrar where you bought mistico.de** (e.g. IONOS, Strato, GoDaddy, Namecheap). Find the **DNS** or **Nameservers** settings for mistico.de and replace the current nameservers with the two above. Save. DNS can take 5–60 minutes to update (sometimes up to 24–48 hours). After that, Cloudflare will control DNS for mistico.de and your tunnel hostnames (mistico.de, www.mistico.de) will resolve correctly.

---

## Access temporarily with free domain (no custom domain yet)

If you **don’t have access to your domain yet** (e.g. mistico.de nameservers not updated), you can use a **free Quick Tunnel** URL (`https://something.trycloudflare.com`) to reach your app right away. No domain or Cloudflare account needed.

**On the server** (from project root, e.g. `/opt/ecommerce-infinity`):

1. **Start the app and install cloudflared** (if not already done):
   ```bash
   docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml up -d
   ```
   Install cloudflared: see [Step 2](#step-2--install-cloudflared-on-the-server) below, or run `./scripts/setup-server.sh` → option **5) Install cloudflared**.

2. **Start the Quick Tunnel:**
   ```bash
   cloudflared tunnel --url http://localhost:80
   ```
   In the output you’ll see something like:
   ```text
   Your quick Tunnel has been created! Visit it at:
   https://random-words-here.trycloudflare.com
   ```
   **Copy that URL** (e.g. `https://random-words-here.trycloudflare.com`).

3. **Set that URL in `.env`** (no trailing slash). Edit `.env` and set:
   ```env
   NEXT_PUBLIC_APP_URL=https://random-words-here.trycloudflare.com
   NEXT_PUBLIC_API_URL=https://random-words-here.trycloudflare.com/api
   NEXT_PUBLIC_CDN_URL=https://random-words-here.trycloudflare.com
   MINIO_PUBLIC_URL=https://random-words-here.trycloudflare.com
   ```
   Or use the setup menu: `./scripts/setup-server.sh` → **7) Set tunnel URL in .env** and paste the URL.

4. **Restart the frontend:**
   ```bash
   docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml restart frontend
   ```

5. **Open the URL** in your browser. Your app is now reachable over HTTPS at the free `*.trycloudflare.com` address.

**Keep the tunnel running:** Leave the terminal with `cloudflared tunnel --url http://localhost:80` open. If you close it, the URL stops working. To run it in the background, see [Step 4 – Run Quick Tunnel in the background](#step-4--run-quick-tunnel-in-the-background-optional).

**When your domain (mistico.de) is ready:** Switch to a [Named Tunnel with mistico.de](#example-cloudflare-tunnel-with-your-domain-eg-misticode). Update `.env` to use `https://mistico.de` and restart the frontend.

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

## If you can’t access mistico.de yet

Check these on the server:

| Check | Command / action |
|-------|-------------------|
| **1. Domain at Cloudflare** | In [Cloudflare Dashboard](https://dash.cloudflare.com) → **Websites** → is **mistico.de** listed? If not, add the site and use the nameservers Cloudflare gives you at your **registrar** (where you bought mistico.de). |
| **2. Nameservers** | At the registrar (where you bought mistico.de), set the domain’s **nameservers** to Cloudflare’s (e.g. `xxx.ns.cloudflare.com`). Save and wait 5–60 minutes (up to 24–48 h in rare cases). |
| **3. Tunnel running** | On the server: `sudo systemctl status cloudflared`. If not active: `sudo systemctl start cloudflared` and `sudo systemctl enable cloudflared`. |
| **4. App stack up** | `cd /opt/ecommerce-infinity` (or your project path), then `docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml ps`. All services should be “Up”. If not: `docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml up -d`. |
| **5. .env has your URL** | In project root: `grep NEXT_PUBLIC_APP_URL .env` should show `https://mistico.de` (no trailing slash). Then: `docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml restart frontend`. |

After that, open **https://mistico.de** in a browser (try incognito or another device if it was cached).

---

## Step-by-step: finish setup (mistico.de)

Do this **on the server** (SSH) after **https://mistico.de** loads. Run everything from the project root, e.g. `/opt/ecommerce-infinity`.

---

### Step 1 – Open the setup menu

```bash
cd /opt/ecommerce-infinity
./scripts/setup-server.sh
```

Keep this terminal open; you’ll use the menu for the next steps.

---

### Step 2 – Create admin user

- In the menu, choose **16) Create admin user**.
- Enter: **email**, **password**, first name, last name.
- You’ll use this to log in at `https://mistico.de` (admin area).

---

### Step 3 – Configure Stripe (payments)

1. In the menu, choose **17) Configure Stripe**.
2. Get keys from [Stripe Dashboard → API keys](https://dashboard.stripe.com/apikeys):  
   - **Publishable key** (pk_test_… or pk_live_…).  
   - **Secret key** (sk_test_… or sk_live_…).
3. When asked, paste each key.
4. **Webhook:** In [Stripe → Webhooks](https://dashboard.stripe.com/webhooks), click **Add endpoint**.  
   - URL: `https://mistico.de/api/payments/stripe/webhook`  
   - Events: e.g. `checkout.session.completed`, `payment_intent.succeeded` (or “Listen to all events”).  
   - Copy the **Signing secret** (whsec_…) and paste it when the menu asks for “Stripe Webhook Secret”.
5. Set **currency** when asked (e.g. EUR).

---

### Step 4 – Add mistico.de to Firebase (Google/Facebook login)

1. In a browser, open [Firebase Console](https://console.firebase.google.com) → your project.
2. Go to **Authentication** → **Settings** (or **Sign-in method** tab) → **Authorized domains**.
3. Click **Add domain** and add:
   - **mistico.de**
   - **www.mistico.de**
4. Save.

---

### Step 5 – Setup Firebase on the server (service account)

1. In Firebase Console: **Project settings** (gear) → **Service accounts** → **Generate new private key**.
2. Download the JSON. You’ll need: **project_id**, **private_key_id**, **private_key**, **client_email**, **client_id** (and optionally auth_uri, token_uri, etc.).
3. In the setup menu, choose **19) Setup Firebase (backend: service account)**.
4. Enter each value when asked (or paste the private key line by line; when done, type **END** and Enter).
5. Restart backend when the script asks.

---

### Step 6 – Configure Resend (emails)

1. Get an API key at [Resend → API Keys](https://resend.com/api-keys).
2. In the menu, choose **20) Configure Resend**.
3. Enter: **API key** (re_…), **from email** (e.g. `noreply@mistico.de` or `onboarding@resend.dev` for testing), **from name**, and optionally **admin email** for order notifications.

---

### Step 7 – Set currency (if not done in Stripe)

- In the menu, choose **18) Configure currency**.
- Enter the code (e.g. **EUR**, **USD**).

---

### Step 8 – Restart app so all changes apply

Exit the menu (option **0**) and run:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml up -d --build backend frontend
```

---

### Step 9 – Optional: Grafana (only if you use monitoring)

- If you run the monitoring stack and want Grafana at **https://mistico.de/grafana**, choose **14) Configure Grafana** in the menu and set the base URL to `https://mistico.de`.

---

### Step 10 – Optional: Cloudflare SSL

- In [Cloudflare Dashboard](https://dash.cloudflare.com) → **mistico.de** → **SSL/TLS** → set encryption mode to **Full** or **Full (strict)**.

---

### Checklist (quick reference)

| # | Task | Where / how |
|---|------|-------------|
| 1 | Open setup menu | `./scripts/setup-server.sh` |
| 2 | Create admin user | Menu **16** |
| 3 | Stripe keys + webhook `https://mistico.de/api/payments/stripe/webhook` | Menu **17** + Stripe Dashboard |
| 4 | Firebase: add mistico.de + www.mistico.de to Authorized domains | Firebase Console |
| 5 | Firebase: service account on server | Menu **19** + Firebase JSON |
| 6 | Resend (emails) | Menu **20** |
| 7 | Currency | Menu **18** |
| 8 | Restart backend + frontend | `docker compose ... up -d --build backend frontend` |
| 9 | (Optional) Grafana URL | Menu **14** |
| 10 | (Optional) Cloudflare SSL = Full | Cloudflare Dashboard |

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
