> 🌐 [Español](README.md) · **English**

# Deployment on a VPS

Makes Lunna public on a server: the **landing page** at `/` and, behind it, the backend in **simulation mode** with all
the interfaces (`/app/`, `/app/central.html`, `/app/base.html`, `/reloj/`, `/simulador`).

```
browser ──► nginx :80/:443 ──┬─ /            landing/ (static)
                             ├─ /video/      video/
                             ├─ /estado      backend status page
                             └─ everything else ──► backend :8787 (systemd "lunna", simulation mode)
```

## Requirements

- Ubuntu 22.04/24.04 or Debian 12, with `root` or `sudo` access.
- Ports 80 and 443 open.
- Optional: a domain with its A record pointing to the VPS IP (for HTTPS).

The script installs whatever is missing: git, nginx and Node.js 22.

## Install (one command)

```bash
curl -fsSL https://raw.githubusercontent.com/DinDevJ/lunna/main/despliegue/instalar.sh \
  | sudo DOMINIO=lunna.ejemplo.com CORREO=tu@correo.com USUARIO=monarcas CLAVE='una-clave' bash
```

| Variable | Purpose | If omitted |
|---|---|---|
| `DOMINIO` | Site name | Responds on the IP |
| `CORREO` | Let's Encrypt HTTPS certificate (requires `DOMINIO`) | HTTP only |
| `USUARIO`, `CLAVE` | Password for the whole site | Open site |
| `TOKEN` | GitHub token to clone the **private** repo (see below) | Clones without credentials (public repo only) |
| `RAMA` | Branch to deploy | `main` |
| `DIR` | Code folder | `/opt/lunna` |

⚠️ **Setting a password is recommended.** The system has no authentication: any visitor could press
"Prepare mission" or "Reset" in the simulator and change the demo for everyone.

### With the private repository

1. On GitHub: **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
   Repository access: only `DinDevJ/lunna`. Permissions: **Contents: Read-only**. Copy the token.
2. On the VPS (paste the token when asked; it is not shown on screen and does not stay in the history):

```bash
read -rs TOKEN
```

```bash
curl -fsSL -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github.raw" https://api.github.com/repos/DinDevJ/lunna/contents/despliegue/instalar.sh | sudo TOKEN="$TOKEN" bash
```

The token is stored only in `/opt/lunna/.git/config` (mode 600) so that `actualizar.sh` can pull changes.
To revoke it, delete it on GitHub; to remove it from the VPS: `sudo git -C /opt/lunna config --unset http.https://github.com/.extraheader`.

With the repository already cloned, `sudo DOMINIO=… bash despliegue/instalar.sh` also works. The script can be
run again: it leaves everything as it is and updates the code.

## Update

```bash
sudo bash /opt/lunna/despliegue/actualizar.sh
```

## Operation

| What | Command |
|---|---|
| View logs | `journalctl -u lunna -f` |
| Restart the backend | `sudo systemctl restart lunna` |
| Status | `systemctl status lunna` · `https://tu-dominio/estado` |
| Start the demo from scratch | In `/simulador`: "Prepare mission" |

The simulation database lives in `/opt/lunna/Simulacion/eva-simulacion.db` and is not under version control.

## What was tested

With this same `nginx-lunna.conf` on Ubuntu 24.04 and nginx 1.24:

- Without a password it responds 401.
- With a password, the landing page, the four interfaces, the simulator and the video load (with ranges: you can seek forward).
- Live events (`/api/stream`) pass through without buffering.
- The phone inside the landing page shows the real LUNNA data.

The systemd service and certbot were not tested, because the test environment has neither systemd nor a domain.

## Files

| File | What it is |
|---|---|
| `instalar.sh` | Complete, idempotent installation |
| `actualizar.sh` | Pulls the latest from the branch and restarts |
| `lunna.service` | systemd service (user `lunna`, automatic restart) |
| `nginx-lunna.conf` | nginx site (template; `instalar.sh` fills it in) |
