#!/usr/bin/env bash
# Trae lo último de la rama y reinicia sólo Lunna. Uso: sudo bash actualizar.sh
set -euo pipefail
DIR="${DIR:-/opt/lunna}"
RAMA="${RAMA:-main}"
[ "$(id -u)" -eq 0 ] || { echo "Córrelo como root (sudo)."; exit 1; }
git config --global --get-all safe.directory 2>/dev/null | grep -qx "$DIR" || git config --global --add safe.directory "$DIR"
git -C "$DIR" fetch -q origin "$RAMA"
git -C "$DIR" reset -q --hard "origin/$RAMA"
chown -R lunna:lunna "$DIR"
git -C "$DIR" log -1 --format='ahora en: %h · %s'
# Los snippets de nginx pueden haber cambiado con el código
cp "$DIR/despliegue/nginx-lunna-cabeceras.conf" /etc/nginx/snippets/lunna-cabeceras.conf
cp "$DIR/despliegue/nginx-lunna-proxy.conf" /etc/nginx/snippets/lunna-proxy.conf
systemctl restart lunna
PB="$(systemctl show lunna -p Environment | grep -o 'PUERTO=[0-9]*' | cut -d= -f2)"; PB="${PB:-8787}"
for i in $(seq 1 30); do curl -fs "http://127.0.0.1:$PB/api/salud" >/dev/null && break; sleep 1; done
curl -fs "http://127.0.0.1:$PB/api/salud" && echo
# Piloto automático (se instala aquí también si el VPS se instaló antes de que existiera)
NODE_BIN="${NODE_BIN:-/opt/lunna-node/bin/node}"
sed -e "s#__DIR__#$DIR#g" -e "s#__NODE__#$NODE_BIN#g" -e "s#__PUERTO_BACKEND__#$PB#g" \
  "$DIR/despliegue/lunna-piloto.service" > /etc/systemd/system/lunna-piloto.service
systemctl daemon-reload
systemctl enable -q lunna-piloto
systemctl restart lunna-piloto
echo "✓ piloto automático reiniciado (journalctl -u lunna-piloto -f)"
# Redirecciones relativas detrás de Caddy (instalaciones anteriores no lo tenían)
grep -q absolute_redirect /etc/nginx/sites-available/lunna 2>/dev/null \
  || sed -i 's/^    server_tokens off;$/    server_tokens off;\n    absolute_redirect off;/' /etc/nginx/sites-available/lunna
if nginx -t; then systemctl reload nginx; else echo "⚠ nginx -t falló: no se recargó nginx"; exit 1; fi
echo "✓ actualizado"
