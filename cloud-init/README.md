# Cloud-init for Ecommerce Infinity

This folder contains a **cloud-init** configuration that bootstraps an Ubuntu server and runs the project’s **setup-server.sh** script.

## What it does

1. **Package update/upgrade** – `package_update` and `package_upgrade`
2. **Clone repo** – Clones this repository to `/opt/ecommerce-infinity` (configurable)
3. **Bootstrap script** – Runs `scripts/cloud-init-bootstrap.sh`, which:
   - Installs Docker and Docker Compose
   - Creates `.env` from `.env.example`
   - Adds `ubuntu` / `ec2-user` to the `docker` group
4. **Next step** – You SSH in and run the interactive setup:  
   `cd /opt/ecommerce-infinity && ./scripts/setup-server.sh`

## How to use

### 1. Set your repo URL

Edit `cloud-init.yaml` and change in `write_files` → `/opt/ecommerce-bootstrap.env`:

- `REPO_URL` – your Git repo (e.g. `https://github.com/your-org/ecommerce-infinity.git`)
- `REPO_BRANCH` – branch to clone (e.g. `main`)

For a **private repo**, you can either:

- Use an SSH deploy key: write the key to e.g. `~/.ssh/id_ed25519` and use `REPO_URL=git@github.com:your-org/ecommerce-infinity.git` in a custom runcmd that runs `git clone` with that key, or  
- Skip clone in cloud-init and copy the app to the server (e.g. S3 + user-data script) so the bootstrap script sees the app at `INSTALL_DIR`.

### 2. Pass user-data when creating the VM

- **AWS**: Use “Advanced details” → “User data” and paste the contents of `cloud-init.yaml` (or upload the file).
- **GCP**: “Management” → “Automation” → “Startup script” / or use metadata `user-data` with the cloud-init content.
- **Azure**: VM “Advanced” → “Custom data” (base64-encode the YAML) or use cloud-init extension with the script.
- **OpenStack / other**: Use the “User Data” / “cloud-init” field with the YAML content.

Use an **Ubuntu** image (20.04/22.04/24.04) so `apt-get` and the bootstrap script work.

### 3. After first boot

1. Wait for cloud-init to finish: `cloud-init status --wait` (or check `/var/log/cloud-init-output.log`).
2. SSH into the server.
3. Run:  
   `cd /opt/ecommerce-infinity && ./scripts/setup-server.sh`  
   Use the menu to start the stack (dev/prod/tunnel), set tunnel URL, configure Stripe/Firebase/Resend, etc.

Bootstrap log: `/var/log/ecommerce-bootstrap.log`.

## Files

| File | Purpose |
|------|--------|
| `cloud-init.yaml` | Cloud-init config (user-data): packages, clone, run bootstrap. |
| `../scripts/cloud-init-bootstrap.sh` | Non-interactive bootstrap: Docker, .env, docker group. |
| `../scripts/setup-server.sh` | Interactive server setup menu (run after SSH). |

## Optional: run bootstrap only (no clone)

If the app is already on the server (e.g. copied or mounted), you can run the bootstrap script alone:

```bash
sudo INSTALL_DIR=/path/to/app CLONE_REPO=false ./scripts/cloud-init-bootstrap.sh
```

Then run `./scripts/setup-server.sh` from the app directory.
