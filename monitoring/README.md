# Monitoring (Prometheus, Grafana, Loki)

## Stack

- **Prometheus** – metrics (backend, postgres, redis, nginx)
- **Grafana** – dashboards and log exploration
- **Loki** – log storage
- **Promtail** – collects Docker container logs and sends them to Loki

## Run with the main app

**You must start both the app and the monitoring stack** so nginx can reach Grafana:

```bash
# From project root – tunnel + monitoring (so /grafana/ is available)
docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml -f docker-compose.monitoring.yml up -d
```

If you only run prod + tunnel (without monitoring), the Grafana container does not exist and `/grafana/` will not work.

---

## How to access Grafana

### Option A: Public URL (via tunnel or domain)

Expose Grafana under a path so you can open it in the browser from anywhere.

1. In `.env` set:
   ```bash
   GRAFANA_ROOT_URL=https://YOUR_TUNNEL.trycloudflare.com/grafana
   GRAFANA_SERVE_FROM_SUB_PATH=true
   ```
   (With a custom domain use `https://yourdomain.com/grafana`.)

2. Restart Grafana so it picks up the new URL:
   ```bash
   docker compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml up -d grafana
   ```

3. Open in the browser:
   - **Tunnel:** `https://YOUR_TUNNEL.trycloudflare.com/grafana/`
   - **Domain:** `https://yourdomain.com/grafana/`

Nginx is already configured to proxy `/grafana/` to the Grafana container (tunnel and HTTPS templates).

**Security:** Use a strong `GRAFANA_ADMIN_PASSWORD` in `.env`; anyone with the public URL can try to log in.

---

### Option B: Local / home network only

Do **not** set `GRAFANA_SERVE_FROM_SUB_PATH` (or leave it `false`). Do **not** rely on the nginx `/grafana/` route for access.

- Grafana is still bound to port **3002** on the host.
- From a machine on the **same network** (e.g. your home LAN), open: **http://YOUR_SERVER_IP:3002**
- From the server itself: **http://localhost:3002**

To restrict access to the server only (no LAN), bind Grafana to localhost by adding to `docker-compose.monitoring.yml` under `grafana`:

```yaml
ports:
  - "127.0.0.1:3002:3000"
```

Then view Grafana only via an SSH tunnel from your laptop:

```bash
ssh -L 3002:127.0.0.1:3002 user@your-server
# Open http://localhost:3002 in the browser on your laptop
```

---

- **Grafana (default):** http://localhost:3002 (login: `admin` / `admin`)
- **Prometheus:** http://localhost:9090

## Viewing logs in Grafana

1. Open Grafana → **Explore** (compass icon in the left sidebar).
2. At the top, choose the **Loki** datasource.
3. Use **LogQL** to query, for example:
   - `{job="containerlogs"}` – all container logs
   - `{job="containerlogs"} |= "error"` – lines containing "error"
   - `{job="containerlogs"} |= "ecommerce-backend"` – backend container logs (filter by container name in labels if configured)

If you don’t see logs:

- **Linux:** Promtail reads from `/var/lib/docker/containers`. Ensure the app and monitoring stack run on the same host so that path is available.
- **Docker Desktop (Mac/Windows):** That path is inside the Docker VM and is not mounted by default. Either run Promtail on the host, or use the admin **Backend logs** page (`/admin/logs`) and the setup script’s “Save logs to file” option instead.

## Datasources (auto-provisioned)

- **Prometheus** (default) – metrics
- **Loki** – logs

## Changing Grafana admin password

Set in `.env` (or when running):

- `GRAFANA_ADMIN_USER`
- `GRAFANA_ADMIN_PASSWORD`

Then restart Grafana.
