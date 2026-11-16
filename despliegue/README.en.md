> 🌐 [Español](README.md) · **English**

# Deploying to a VPS

Publishes Lunna on a server: the **landing page** at `/` and, behind it, the backend in **simulation mode** with
all the interfaces (`/app/`, `/app/central.html`, `/app/base.html`, `/reloj/`, `/simulador`).

**Designed for a VPS that already hosts another project.** The installer does not touch anything else: it does not
delete or change other nginx sites (including `default`), does not change the system Node.js and, without a domain,
uses its own port.

```
browser ──► nginx :8088 (or :80/:443 with a domain) ──┬─ /            landing/ (static)
                                                      ├─ /video/ /recursos/   files
                                                      ├─ /estado      backend status page
                                                      └─ everything else ──► backend 127.0.0.1:8787 (systemd "lunna")
```

## 1. Check the VPS (read-only)

Before installing, see what is on the server: busy ports, nginx sites, Node version and who uses it, memory and
firewall. It changes nothing.

```bash
sudo bash revisar-vps.sh
```

(If the repo is not on the VPS yet, download it like the installer, replacing `instalar.sh` with `revisar-vps.sh`.)

## 2. Install

### With the private repository (token)

1. On GitHub: **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
   Repository access: only `DinDevJ/lunna`. Permissions: **Contents: Read-only**. Copy the token.
2. On the VPS (paste the token when asked; it is not shown on screen and does not stay in the history):

```bash
read -rs TOKEN
```

```bash
curl -fsSL -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github.raw" https://api.github.com/repos/DinDevJ/lunna/contents/despliegue/instalar.sh | sudo TOKEN="$TOKEN" bash
```

When it finishes it shows the address, e.g. `http://YOUR-IP:8088`. The token is stored only in
`/opt/lunna/.git/config` (mode 600) so that `actualizar.sh` can pull changes. To revoke it, delete it on GitHub; to
remove it from the VPS: `sudo git -C /opt/lunna config --unset http.https://github.com/.extraheader`.

| Variable | Purpose | If omitted |
|---|---|---|
| `TOKEN` | Clone the private repo | Clones without credentials (public repo only) |
| `PUERTO_WEB` | Lunna's public port | `8088` without a domain · `80` with a domain |
| `DOMINIO` | Site name (shares port 80 with other sites by name) | Answers by IP on its own port |
| `CORREO` | Let's Encrypt HTTPS and HTTP/2 (requires `DOMINIO` and `PUERTO_WEB=80`) | http only |
| `PUERTO_BACKEND` | Local backend port | `8787` |
| `AJUSTAR_NGINX` | `0` to leave `worker_connections` alone | `1` |
| `RAMA`, `DIR` | Branch and folder | `main`, `/opt/lunna` |

Example with another port: `… | sudo TOKEN="$TOKEN" PUERTO_WEB=8090 bash`.

### What it does and does NOT do

| Does | Does not |
|---|---|
| Checks first that the ports are free and **stops** if anything clashes | Delete or edit other nginx sites |
| Installs only missing packages (`--no-upgrade`) | Upgrade existing packages |
| Uses its own Node 22 in `/opt/lunna-node` (official download, sha256 verified) | Change the system Node |
| Backs up `/etc/nginx` to `/root/lunna-respaldos/` and validates with `nginx -t` | Use `default_server` |
| If the configuration fails, **restores the backup** and does not reload | Restart nginx: it uses `reload` (no downtime) |
| Compares how the other sites respond before and after | Open the backend port to the outside |
| Raises `worker_connections` to 4096 if lower (the only global change) | Lower any limit |

## 3. Security and load (many people at once)

The demo stays **open to everyone** (team decision). So that it holds up and cannot easily be abused:

- **The backend only listens on `127.0.0.1`**: the internet reaches it only through nginx.
- **Per-IP limits**, generous because at a venue many people share the Wi-Fi IP:
  reads 60/s (burst 400); writes 20/s with a queue of 1,000 (the bursts from "Prepare mission" are not rejected);
  **resetting the demo: 6 per minute**; live events: 400 per IP and 3,000 in total. Beyond that it answers 429.
- **Security headers**: `nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy`,
  `Cross-Origin-Opener-Policy`; no nginx version; no CORS (no other page can write to the API).
- **Isolated service**: user `lunna` without a shell, writes only to its folder, `MemoryMax=500M` so it does not take
  memory from the other project.
- **Performance**: gzip compression (the app's JS goes from 172 KB to 50 KB), browser caching for videos and images,
  persistent connections to Node.

Remaining risk of being open: anyone can reset the demo (at most 6 times per minute per IP) or send simulated data.
There is no real or personal data.

## Update and uninstall

```bash
sudo bash /opt/lunna/despliegue/actualizar.sh
```

To remove Lunna without touching anything else (service, nginx site and snippets; keeps the code and backups):

```bash
sudo bash /opt/lunna/despliegue/desinstalar.sh
```

## Operation

| What | Command |
|---|---|
| View logs | `journalctl -u lunna -f` |
| Restart the backend | `sudo systemctl restart lunna` |
| Status | `systemctl status lunna` · `http://YOUR-IP:8088/estado` |
| Start the demo from scratch | In `/simulador`: "Prepare mission" |
| Undo nginx | `sudo rm /etc/nginx/sites-enabled/lunna && sudo systemctl reload nginx` |

The simulation database lives in `/opt/lunna/Simulacion/eva-simulacion.db` and is not versioned.

## What was tested

On a simulated VPS (Ubuntu 24.04, nginx 1.24) with **another project already on port 80**:

- The installer **stops** if the web port is taken by another site without a domain, if another program uses it, or
  if the backend port is in use.
- The full installation completes; the other project answers the same before and after; the backend stays on
  `127.0.0.1`; the landing page, phone, central computer, watch and simulator load via `IP:8088`.
- Security headers present, gzip active, live events unbuffered, reset limited (429 on the 5th), 60 simultaneous
  writes accepted.
- `desinstalar.sh` removes only Lunna's pieces.

Not tested with real systemd or certbot: the test environment has neither systemd nor a domain.

## Files

| File | What it is |
|---|---|
| `revisar-vps.sh` | Pre-check of the server (read-only) |
| `instalar.sh` | Safe installation for a shared VPS; can be re-run |
| `actualizar.sh` | Pulls the latest of the branch and restarts only Lunna |
| `desinstalar.sh` | Removes Lunna without touching anything else |
| `lunna.service` | systemd service (user `lunna`, local only, memory cap) |
| `nginx-lunna.conf` | nginx site (template; `instalar.sh` fills it in) |
| `nginx-lunna-proxy.conf`, `nginx-lunna-cabeceras.conf` | Snippets: headers to the backend and security headers |
