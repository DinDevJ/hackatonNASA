#!/usr/bin/env bash
# Quita Lunna del VPS SIN tocar lo demás: su servicio, su sitio de nginx y sus snippets. Uso: sudo bash desinstalar.sh
# Conserva el código y la base de datos en $DIR (bórralos a mano si quieres: sudo rm -rf /opt/lunna /opt/lunna-node).
set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "Córrelo como root (sudo)."; exit 1; }
systemctl disable --now lunna-piloto 2>/dev/null || true
rm -f /etc/systemd/system/lunna-piloto.service
systemctl disable --now lunna 2>/dev/null || true
rm -f /etc/systemd/system/lunna.service && systemctl daemon-reload
rm -f /etc/nginx/sites-enabled/lunna /etc/nginx/sites-available/lunna \
      /etc/nginx/snippets/lunna-cabeceras.conf /etc/nginx/snippets/lunna-proxy.conf
rm -rf /var/cache/nginx/lunna
if nginx -t; then systemctl reload nginx; else echo "⚠ nginx -t falló: revisa antes de recargar"; exit 1; fi
echo "✓ Lunna desinstalado. Respaldos de nginx en /root/lunna-respaldos/ (worker_connections se dejó como estaba)."
