#!/usr/bin/env bash
# Revisa el VPS ANTES de instalar Lunna. Sólo lee: no instala, no cambia ni reinicia nada.
# Uso:  sudo bash revisar-vps.sh        (sin sudo funciona, pero algunos datos salen incompletos)
#
# Muestra lo que podría chocar con Lunna en un servidor que ya aloja otro proyecto: puertos ocupados,
# sitios de nginx, versión de Node y quién la usa, memoria, disco y firewall.
set -u
t() { printf '\n\033[1;36m== %s\033[0m\n' "$*"; }
PUERTO_WEB="${PUERTO_WEB:-8088}"; PUERTO_BACKEND="${PUERTO_BACKEND:-8787}"

t "Sistema"
. /etc/os-release 2>/dev/null && echo "$PRETTY_NAME"; uname -m
echo "CPU: $(nproc) · $(free -h | awk '/^Mem/{print "RAM total " $2 ", libre " $7}')"
free -h | awk '/^Swap/{print "Swap: " $2}'
df -h / | awk 'NR==2{print "Disco /: " $4 " libres de " $2}'

t "Puertos escuchando (y qué proceso)"
ss -ltnp 2>/dev/null | awk 'NR==1 || /LISTEN/' | sed -E 's/users:\(\("([^"]+)",pid=([0-9]+).*/\1 (pid \2)/'
for p in 80 443 "$PUERTO_WEB" "$PUERTO_BACKEND"; do
  if ss -ltn "( sport = :$p )" 2>/dev/null | grep -q LISTEN; then echo "⚠ puerto $p OCUPADO"; else echo "✓ puerto $p libre"; fi
done

t "nginx"
if command -v nginx >/dev/null; then
  nginx -v 2>&1
  systemctl is-active nginx 2>/dev/null | sed 's/^/servicio: /'
  echo "worker_connections: $(grep -Eo 'worker_connections[[:space:]]+[0-9]+' /etc/nginx/nginx.conf 2>/dev/null | awk '{print $2}')"
  grep -q 'include /etc/nginx/sites-enabled' /etc/nginx/nginx.conf 2>/dev/null && echo "usa sites-enabled: sí"
  echo "sitios habilitados:"; ls -la /etc/nginx/sites-enabled/ 2>/dev/null | awk 'NR>1{print "  " $9, $10, $11}'
  echo "listen / server_name de cada sitio:"
  for f in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf; do
    [ -e "$f" ] || continue; echo "  · $f"; grep -E '^\s*(listen|server_name)\b' "$f" | sed 's/^\s*/      /'
  done
  nginx -t 2>&1 | tail -2
else
  echo "nginx no está instalado"
fi

t "Node.js"
command -v node >/dev/null && echo "node del sistema: $(node -v) en $(command -v node)" || echo "no hay node en el PATH"
command -v pm2 >/dev/null && { echo "pm2 presente:"; pm2 ls 2>/dev/null | head -20; }
command -v nvm >/dev/null 2>&1 && echo "nvm presente"
echo "procesos node corriendo:"; ps -eo pid,user,rss,cmd | grep -E '[n]ode( |$)' | head -10 | sed 's/^/  /'
echo "servicios systemd que mencionan node:"; grep -ls 'node' /etc/systemd/system/*.service 2>/dev/null | sed 's/^/  /'

t "Docker"
command -v docker >/dev/null && docker ps --format '  {{.Names}} · {{.Ports}}' 2>/dev/null || echo "no hay docker"

t "Firewall"
command -v ufw >/dev/null && ufw status 2>/dev/null | head -15 || echo "sin ufw"

t "Lunna (si ya existe)"
[ -d /opt/lunna ] && git -C /opt/lunna log -1 --format='  /opt/lunna en %h · %s' 2>/dev/null || echo "  no hay /opt/lunna"
systemctl is-active lunna 2>/dev/null | sed 's/^/  servicio lunna: /'

printf '\n\033[1;32mListo. Copia toda esta salida y pásasela al equipo antes de instalar.\033[0m\n'
