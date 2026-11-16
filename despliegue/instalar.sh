#!/usr/bin/env bash
# Instala Lunna en un VPS con Ubuntu 22.04/24.04 o Debian 12 (como root). Se puede volver a correr.
#
# PENSADO PARA UN VPS QUE YA ALOJA OTRO PROYECTO. No toca lo ajeno:
#   · no borra ni cambia otros sitios de nginx (tampoco «default») y no usa default_server;
#   · no cambia el Node.js del sistema: usa uno propio en /opt/lunna-node;
#   · sin dominio, Lunna va en su PROPIO puerto (8088 por defecto), no en el 80;
#   · revisa antes que los puertos estén libres y se detiene si algo choca;
#   · respalda /etc/nginx, valida con «nginx -t» y, si falla, deja todo como estaba;
#   · aplica con «reload» (el otro proyecto no se corta) y comprueba que sus sitios sigan respondiendo igual.
# Lo único global que puede cambiar: sube worker_connections de nginx a 4096 si es menor (ver AJUSTAR_NGINX).
#
# Antes, revisa el VPS (sólo lee):  sudo bash despliegue/revisar-vps.sh
#
# Con el repo PRIVADO (token de GitHub de solo lectura, «Contents: Read-only»):
#   read -rs TOKEN   # pega el token; no se ve ni queda en el historial
#   curl -fsSL -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github.raw" \
#     https://api.github.com/repos/DinDevJ/lunna/contents/despliegue/instalar.sh | sudo TOKEN="$TOKEN" bash
#
# Variables (todas opcionales):
#   PUERTO_WEB      puerto público de Lunna. Por defecto 8088 sin dominio y 80 con DOMINIO.
#   DOMINIO         dominio que apunta al VPS (con él puede compartir el 80 con otros sitios por nombre).
#   DOMINIO_APP     segundo dominio (p. ej. app.lunna.ejemplo.com) que abre directo en el simulador.
#   CORREO          con DOMINIO y PUERTO_WEB=80, pide el certificado HTTPS de Let's Encrypt (y activa HTTP/2).
#   PUERTO_BACKEND  puerto local del backend (127.0.0.1). Por defecto 8787.
#   TOKEN           token de GitHub para clonar un repo privado. Se guarda sólo en $DIR/.git/config (modo 600).
#   AJUSTAR_NGINX   1 (por defecto) sube worker_connections a 4096 si es menor; 0 no toca nginx.conf.
#   REPO, RAMA, DIR origen y destino del código (por defecto el repo del equipo, main, /opt/lunna).
set -euo pipefail

REPO="${REPO:-https://github.com/DinDevJ/lunna.git}"
RAMA="${RAMA:-main}"
DIR="${DIR:-/opt/lunna}"
DOMINIO="${DOMINIO:-}"
DOMINIO_APP="${DOMINIO_APP:-}"
CORREO="${CORREO:-}"
TOKEN="${TOKEN:-}"
PUERTO_BACKEND="${PUERTO_BACKEND:-8787}"
if [ -n "$DOMINIO" ]; then PUERTO_WEB="${PUERTO_WEB:-80}"; else PUERTO_WEB="${PUERTO_WEB:-8088}"; fi
AJUSTAR_NGINX="${AJUSTAR_NGINX:-1}"
NODE_DIR=/opt/lunna-node
PY_DIR=/opt/lunna-py
SITIO=/etc/nginx/sites-available/lunna

paso() { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }
alto() { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }
[ "$(id -u)" -eq 0 ] || alto "Córrelo como root (sudo)."

# ─────────────────────────────── 1. Revisión previa: no instalar si algo choca ───────────────────────────────
paso "Revisión previa (no cambia nada todavía)"
escucha() { ss -ltnpH "( sport = :$1 )" 2>/dev/null; }
# Backend: el puerto local debe estar libre, salvo que ya sea nuestro servicio lunna.
if [ -n "$(escucha "$PUERTO_BACKEND")" ] && ! systemctl is-active -q lunna 2>/dev/null; then
  escucha "$PUERTO_BACKEND"; alto "El puerto $PUERTO_BACKEND ya lo usa otro programa. Elige otro: PUERTO_BACKEND=8797"
fi
# Web: si el puerto está ocupado tiene que ser por nginx, y otro sitio no puede usarlo sin nombre propio.
OCUPA_WEB="$(escucha "$PUERTO_WEB")"
if [ -n "$OCUPA_WEB" ] && ! grep -q '"nginx"' <<<"$OCUPA_WEB"; then
  echo "$OCUPA_WEB"; alto "El puerto $PUERTO_WEB lo usa otro programa (no nginx). Elige otro: PUERTO_WEB=8089"
fi
# Puertos en los que escucha un archivo de nginx (sin comentarios; «listen 80», «listen 0.0.0.0:80», «listen [::]:80»…)
puertos_de() { sed 's/#.*//' "$1" | grep -Eo '(^|[{;[:space:]])listen[[:space:]]+[^;[:space:]]+' | grep -Eo '[0-9]+$' | sort -u; }
OTROS_SITIOS=()
if [ -d /etc/nginx ]; then
  for f in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf; do
    [ -e "$f" ] || continue
    [ "$(readlink -f "$f")" = "$SITIO" ] && continue
    OTROS_SITIOS+=("$f")
    if puertos_de "$f" | grep -qx "$PUERTO_WEB"; then
      [ -n "$DOMINIO" ] || alto "El sitio $f ya escucha en el puerto $PUERTO_WEB. Sin dominio, Lunna necesita un puerto propio: PUERTO_WEB=8089"
      for nom in $DOMINIO $DOMINIO_APP; do
        sed 's/#.*//' "$f" | grep -Eq "server_name[^;]*[[:space:]]${nom//./\\.}([[:space:];]|$)" && alto "El sitio $f ya usa el nombre $nom."
      done
    fi
  done
fi
if [ -n "$CORREO" ]; then
  { [ -n "$DOMINIO" ] && [ "$PUERTO_WEB" = 80 ]; } || alto "HTTPS (CORREO) requiere DOMINIO y PUERTO_WEB=80."
fi
[ -z "$DOMINIO_APP" ] || [ -n "$DOMINIO" ] || alto "DOMINIO_APP requiere también DOMINIO."
echo "✓ backend en 127.0.0.1:$PUERTO_BACKEND · web en el puerto $PUERTO_WEB${DOMINIO:+ · dominio $DOMINIO} · otros sitios de nginx: ${#OTROS_SITIOS[@]}"

# Cómo responden HOY los otros sitios, para comprobar al final que siguen igual.
sondear() {   # imprime «sitio estado» por cada otro sitio (primer listen y primer server_name)
  local f p n
  for f in "${OTROS_SITIOS[@]}"; do
    p="$(puertos_de "$f" | head -1 || true)"; [ -n "$p" ] || continue
    n="$(sed 's/#.*//' "$f" | grep -Eo 'server_name[[:space:]]+[^;[:space:]]+' | head -1 | awk '{print $2}' || true)"; [ "$n" = "_" ] && n=""
    printf '%s %s\n' "$(basename "$f")" "$(curl -s -o /dev/null -m 5 -w '%{http_code}' ${n:+-H "Host: $n"} "http://127.0.0.1:$p/" || echo 000)"
  done
}
ANTES="$(sondear || true)"
[ -n "$ANTES" ] && { echo "otros sitios antes de instalar:"; sed 's/^/  /' <<<"$ANTES"; }

# ─────────────────────────────── 2. Paquetes: sólo lo que falte, sin actualizar lo existente ───────────────────
paso "Paquetes del sistema (sólo los que falten)"
export DEBIAN_FRONTEND=noninteractive
FALTAN=()
for par in git:git curl:curl xz:xz-utils openssl:openssl nginx:nginx; do
  command -v "${par%%:*}" >/dev/null || FALTAN+=("${par#*:}")
done
[ -e /etc/ssl/certs/ca-certificates.crt ] || FALTAN+=(ca-certificates)
NGINX_NUEVO=0; command -v nginx >/dev/null || NGINX_NUEVO=1
if [ "${#FALTAN[@]}" -gt 0 ]; then
  apt-get update -qq
  # Que apt no arranque nginx al instalarlo: su sitio de ejemplo pide el 80, que puede ser de otro proyecto
  # (p. ej. un Caddy en Docker) y la instalación fallaría. Se arranca después, ya con el sitio de Lunna.
  if [ "$NGINX_NUEVO" = 1 ] && [ ! -e /usr/sbin/policy-rc.d ]; then printf '#!/bin/sh\nexit 101\n' > /usr/sbin/policy-rc.d; chmod +x /usr/sbin/policy-rc.d; QUITAR_POLICY=1; fi
  apt-get install -y -qq --no-upgrade "${FALTAN[@]}" >/dev/null
  [ "${QUITAR_POLICY:-0}" = 1 ] && rm -f /usr/sbin/policy-rc.d
  # nginx recién instalado (no era de nadie): su sitio de ejemplo sobra y ocuparía el 80
  [ "$NGINX_NUEVO" = 1 ] && rm -f /etc/nginx/sites-enabled/default
  echo "instalado: ${FALTAN[*]}"
else
  echo "no falta nada"
fi

# ─────────────────────────────── 3. Node.js propio (no toca el del sistema) ───────────────────────────────────
paso "Node.js 22 propio en $NODE_DIR (el del sistema no se toca)"
node_ok() { [ -x "$1" ] || return 1; local v M m; v="$("$1" -v | sed 's/^v//')"; M="${v%%.*}"; m="$(cut -d. -f2 <<<"$v")"
  [ "$M" -gt 22 ] || { [ "$M" -eq 22 ] && [ "$m" -ge 6 ]; }; }
if ! node_ok "$NODE_DIR/bin/node"; then
  case "$(uname -m)" in x86_64) ARQ=x64 ;; aarch64|arm64) ARQ=arm64 ;; *) alto "Arquitectura $(uname -m) no soportada." ;; esac
  BASE=https://nodejs.org/dist/latest-v22.x
  SUMAS="$(curl -fsSL "$BASE/SHASUMS256.txt")"
  TAR="$(grep -o "node-v22[0-9.]*-linux-$ARQ.tar.xz" <<<"$SUMAS" | head -1)"
  [ -n "$TAR" ] || alto "No encontré Node 22 para linux-$ARQ."
  TMP="$(mktemp -d)"; curl -fsSLo "$TMP/$TAR" "$BASE/$TAR"
  (cd "$TMP" && grep " $TAR\$" <<<"$SUMAS" | sha256sum -c --quiet -) || alto "La firma sha256 de Node no coincide."
  rm -rf "$NODE_DIR"; mkdir -p "$NODE_DIR"; tar -xJf "$TMP/$TAR" -C "$NODE_DIR" --strip-components=1; rm -rf "$TMP"
fi
NODE_BIN="$NODE_DIR/bin/node"
echo "node $("$NODE_BIN" -v) en $NODE_BIN"

# ─────────────────────────────── 3b. Python propio para el motor de padecimientos (no toca el del sistema) ─────
paso "Python aislado en $PY_DIR (numpy y pandas para el semáforo de 20 padecimientos)"
command -v python3 >/dev/null || { apt-get update -qq; apt-get install -y -qq --no-upgrade python3 >/dev/null; }
if ! "$PY_DIR/bin/python" -c 'import numpy, pandas' 2>/dev/null; then
  python3 -m venv "$PY_DIR" 2>/dev/null || {
    apt-get update -qq; apt-get install -y -qq --no-upgrade python3-venv >/dev/null || true
    rm -rf "$PY_DIR"; python3 -m venv "$PY_DIR"; }
  "$PY_DIR/bin/pip" install -q --disable-pip-version-check --no-cache-dir numpy pandas \
    || echo "⚠ no se pudo instalar numpy/pandas: el semáforo quedará vacío; lo demás funciona"
fi
"$PY_DIR/bin/python" -c 'import numpy, pandas; print("numpy", numpy.__version__, "· pandas", pandas.__version__)' 2>/dev/null || true

# ─────────────────────────────── 4. Código ────────────────────────────────────────────────────────────────────
paso "Usuario de servicio y código en $DIR"
id lunna >/dev/null 2>&1 || useradd --system --home "$DIR" --shell /usr/sbin/nologin lunna
# El código es del usuario lunna y git corre como root: sin esto git se niega («dubious ownership»).
git config --global --get-all safe.directory 2>/dev/null | grep -qx "$DIR" || git config --global --add safe.directory "$DIR"
# Si el origen es un clon local (p. ej. el que hizo tu usuario con su llave), git también lo pide para leerlo como root.
if [ -d "$REPO/.git" ]; then git config --global --get-all safe.directory 2>/dev/null | grep -qx "$REPO" || git config --global --add safe.directory "$REPO"; fi
AUTH_GIT=()
if [ -n "$TOKEN" ]; then
  CAB="Authorization: Basic $(printf 'x-access-token:%s' "$TOKEN" | base64 | tr -d '\n')"
  AUTH_GIT=(-c "http.https://github.com/.extraheader=$CAB")
fi
if [ -d "$DIR/.git" ]; then
  git "${AUTH_GIT[@]}" -C "$DIR" fetch -q origin "$RAMA"
  git -C "$DIR" checkout -q "$RAMA"
  git -C "$DIR" reset -q --hard "origin/$RAMA"
else
  git "${AUTH_GIT[@]}" clone -q --branch "$RAMA" "$REPO" "$DIR"
fi
if [ -n "$TOKEN" ]; then
  git -C "$DIR" config "http.https://github.com/.extraheader" "$CAB"
  chmod 600 "$DIR/.git/config"
fi
chown -R lunna:lunna "$DIR"
git -C "$DIR" log -1 --format='commit %h · %s'

# ─────────────────────────────── 5. Servicio del backend ──────────────────────────────────────────────────────
paso "Servicio «lunna» (modo simulación, sólo en 127.0.0.1:$PUERTO_BACKEND)"
sed -e "s#__DIR__#$DIR#g" -e "s#__NODE__#$NODE_BIN#g" -e "s#__PUERTO_BACKEND__#$PUERTO_BACKEND#g" -e "s#__PYTHON__#$PY_DIR/bin/python#g" \
  "$DIR/despliegue/lunna.service" > /etc/systemd/system/lunna.service
systemctl daemon-reload
systemctl enable -q lunna
systemctl restart lunna
for i in $(seq 1 30); do curl -fs "http://127.0.0.1:$PUERTO_BACKEND/api/salud" >/dev/null && break; sleep 1; done
curl -fs "http://127.0.0.1:$PUERTO_BACKEND/api/salud" >/dev/null || { journalctl -u lunna -n 30 --no-pager; alto "El backend no arrancó."; }
echo "✓ backend respondiendo"

# ─────────────────────────────── 6. nginx: respaldo, sitio propio, validación y reload ────────────────────────
paso "nginx: sitio propio de Lunna (con respaldo y vuelta atrás si falla)"
RESPALDO="/root/lunna-respaldos/nginx-$(date +%Y%m%d-%H%M%S).tgz"
mkdir -p /root/lunna-respaldos; tar -czf "$RESPALDO" -C / etc/nginx
echo "respaldo de /etc/nginx: $RESPALDO"
revertir() { echo "Restaurando /etc/nginx desde el respaldo…" >&2; rm -rf /etc/nginx; tar -xzf "$RESPALDO" -C /; nginx -t >/dev/null 2>&1 && systemctl reload nginx || true; }

mkdir -p /etc/nginx/snippets
# Micro-caché de la API (sólo de Lunna), propiedad del usuario con el que corre nginx
USUARIO_NGINX="$(sed 's/#.*//' /etc/nginx/nginx.conf | grep -Eo '^\s*user\s+[^;[:space:]]+' | awk '{print $2}' | head -1 || true)"
mkdir -p /var/cache/nginx/lunna && chown "${USUARIO_NGINX:-www-data}" /var/cache/nginx/lunna
cp "$DIR/despliegue/nginx-lunna-cabeceras.conf" /etc/nginx/snippets/lunna-cabeceras.conf
cp "$DIR/despliegue/nginx-lunna-proxy.conf" /etc/nginx/snippets/lunna-proxy.conf
NOMBRES="${DOMINIO:-_}${DOMINIO_APP:+ $DOMINIO_APP}"
sed -e "s#__DOMINIO__#$NOMBRES#g" -e "s#__DIR__#$DIR#g" -e "s#__PUERTO_WEB__#$PUERTO_WEB#g" \
  -e "s#__PUERTO_BACKEND__#$PUERTO_BACKEND#g" "$DIR/despliegue/nginx-lunna.conf" > "$SITIO"
# Sin IPv6 en la máquina, nginx no arranca con «listen [::]:…»
[ -s /proc/net/if_inet6 ] || sed -i '/listen \[::\]/d' "$SITIO"
ln -sf "$SITIO" /etc/nginx/sites-enabled/lunna

# Cada visitante abre ~10 conexiones (5 eventos en vivo sin HTTP/2): con 768 nginx se satura con ~70 visitantes,
# y eso afectaría también al otro proyecto. Sólo se SUBE, nunca se baja.
if [ "$AJUSTAR_NGINX" = 1 ]; then
  WC="$(grep -Eo 'worker_connections[[:space:]]+[0-9]+' /etc/nginx/nginx.conf | awk '{print $2}' | head -1 || true)"
  if [ -n "$WC" ] && [ "$WC" -lt 4096 ]; then
    sed -i -E "s/(worker_connections[[:space:]]+)$WC;/\14096;/" /etc/nginx/nginx.conf
    echo "worker_connections: $WC → 4096"
  fi
  if ! grep -Eq '^\s*worker_rlimit_nofile' /etc/nginx/nginx.conf; then
    sed -i -E '0,/^\s*worker_processes/s//worker_rlimit_nofile 16384;\n&/' /etc/nginx/nginx.conf
    echo "worker_rlimit_nofile: 16384"
  fi
fi
# nginx (www-data) necesita poder leer la landing y el video
chmod o+rx "$DIR" "$DIR/landing" "$DIR/video"

if ! nginx -t; then revertir; alto "La configuración de nginx no es válida; se dejó todo como estaba."; fi
if systemctl is-active -q nginx; then systemctl reload nginx; else systemctl enable -q nginx; systemctl start nginx; fi

if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  paso "Firewall: abre sólo el puerto $PUERTO_WEB (el backend queda sólo en local)"
  ufw allow "$PUERTO_WEB/tcp" >/dev/null
fi

if [ -n "$DOMINIO" ] && [ -n "$CORREO" ]; then
  paso "HTTPS con Let's Encrypt para $NOMBRES (sólo este sitio)"
  command -v certbot >/dev/null || apt-get install -y -qq --no-upgrade certbot python3-certbot-nginx >/dev/null
  certbot --nginx -d "$DOMINIO" ${DOMINIO_APP:+-d "$DOMINIO_APP"} --non-interactive --agree-tos -m "$CORREO" --redirect
  # HTTP/2: todas las peticiones (y los eventos en vivo de cada interfaz) viajan por una sola conexión.
  sed -i -E 's/listen (\[::\]:)?443 ssl( ipv6only=on)?;/listen \1443 ssl http2\2;/' "$SITIO"
  if nginx -t; then systemctl reload nginx; else revertir; alto "Falló la configuración HTTPS; se restauró nginx."; fi
  if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then ufw allow 443/tcp >/dev/null; fi
fi

# ─────────────────────────────── 7. Comprobación: Lunna responde y los demás siguen igual ────────────────────
paso "Comprobación"
H=(); [ -n "$DOMINIO" ] && H=(-H "Host: $DOMINIO")
curl -fs "${H[@]}" -o /dev/null -w "landing:   HTTP %{http_code}\n" "http://127.0.0.1:$PUERTO_WEB/"
curl -fs "${H[@]}" -o /dev/null -w "app:       HTTP %{http_code}\n" "http://127.0.0.1:$PUERTO_WEB/app/"
curl -fs "${H[@]}" -o /dev/null -w "simulador: HTTP %{http_code}\n" "http://127.0.0.1:$PUERTO_WEB/simulador"
DESPUES="$(sondear || true)"
if [ -n "$ANTES" ]; then
  if [ "$ANTES" = "$DESPUES" ]; then echo "✓ los otros sitios responden igual que antes:"; sed 's/^/  /' <<<"$DESPUES"
  else printf '\033[1;33m⚠ algún otro sitio responde distinto que antes. Antes:\n%s\nAhora:\n%s\n\033[0m' "$ANTES" "$DESPUES"
       echo "  Para deshacer nginx: sudo rm /etc/nginx/sites-enabled/lunna && sudo tar -xzf $RESPALDO -C / && sudo systemctl reload nginx"; fi
fi
IP="$(curl -fs -m 5 https://api.ipify.org || hostname -I | awk '{print $1}')"
if [ -n "$DOMINIO" ] && [ -n "$CORREO" ]; then URL="https://$DOMINIO"
elif [ -n "$DOMINIO" ]; then URL="http://$DOMINIO$([ "$PUERTO_WEB" = 80 ] || echo ":$PUERTO_WEB")"
else URL="http://$IP:$PUERTO_WEB"; fi
printf '\n\033[1;32m✓ Lunna está en %s\033[0m\n' "$URL"
echo "  simulación: $URL/simulador · app: $URL/app/ · central: $URL/app/central.html · base: $URL/app/base.html"
[ -n "$DOMINIO_APP" ] && echo "  simulación directa: $( [ -n "$CORREO" ] && echo https || echo http )://$DOMINIO_APP"
echo "  registros:  journalctl -u lunna -f      · actualizar: sudo bash $DIR/despliegue/actualizar.sh"
echo "  desinstalar sin tocar lo demás: sudo bash $DIR/despliegue/desinstalar.sh"
