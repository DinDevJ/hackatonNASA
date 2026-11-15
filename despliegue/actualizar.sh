#!/usr/bin/env bash
# Trae lo último de la rama y reinicia Lunna. Uso: sudo bash actualizar.sh
set -euo pipefail
DIR="${DIR:-/opt/lunna}"
RAMA="${RAMA:-main}"
[ "$(id -u)" -eq 0 ] || { echo "Córrelo como root (sudo)."; exit 1; }
git -C "$DIR" fetch -q origin "$RAMA"
git -C "$DIR" reset -q --hard "origin/$RAMA"
chown -R lunna:lunna "$DIR"
git -C "$DIR" log -1 --format='ahora en: %h · %s'
systemctl restart lunna
for i in $(seq 1 20); do curl -fs http://127.0.0.1:8787/api/salud && echo && break; sleep 1; done
systemctl reload nginx
echo "✓ actualizado"
