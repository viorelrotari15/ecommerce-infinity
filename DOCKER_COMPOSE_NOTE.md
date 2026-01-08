# Docker Compose Command Note

## Important: Command Syntax

This project uses **Docker Compose v2**, which uses the command:

```bash
docker compose  # (with a space)
```

**NOT** the older syntax:

```bash
docker-compose  # (with a hyphen) - OLD VERSION
```

## Quick Fix

If you get `command not found: docker-compose`, you have Docker Compose v2 installed. Use:

```bash
docker compose
```

## Compatibility

### Docker Compose v2 (Current - Recommended)
- Command: `docker compose`
- Included with Docker Desktop
- Faster and more efficient

### Docker Compose v1 (Legacy)
- Command: `docker-compose`
- Separate installation required
- Still works but deprecated

## Create Alias (Optional)

If you prefer the old syntax, create an alias:

```bash
# Add to ~/.zshrc or ~/.bashrc
alias docker-compose='docker compose'
```

Then reload:
```bash
source ~/.zshrc  # or source ~/.bashrc
```

## Verify Your Version

```bash
# Check Docker Compose version
docker compose version

# Should show: Docker Compose version v2.x.x
```

## All Commands Updated

All scripts and documentation in this project use `docker compose` (with space).

---

**Note**: On Oracle Cloud VMs, you may need to install Docker Compose separately. See [ORACLE_CLOUD_DEPLOYMENT.md](docs/ORACLE_CLOUD_DEPLOYMENT.md) for installation instructions.

