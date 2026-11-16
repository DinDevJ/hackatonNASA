#!/usr/bin/env bash
# Instala Lunna en un VPS con Ubuntu 22.04/24.04 o Debian 12 (como root). Se puede volver a correr.
#
#   curl -fsSL https://raw.githubusercontent.com/DinDevJ/lunna/main/despliegue/instalar.sh \
#     | sudo DOMINIO=lunna.ejemplo.com CORREO=tu@correo.com USUARIO=monarcas CLAVE='…' bash
#
# Con el repo PRIVADO (token de GitHub de solo lectura, «Contents: Read-only»):
#   read -rs TOKEN   # pega el token; no se ve ni queda en el historial
#   curl -fsSL -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github.raw" \
#     https://api.github.com/repos/DinDevJ/lunna/contents/despliegue/instalar.sh | sudo TOKEN="$TOKEN" bash
#
# o, con el repo ya clonado:  sudo DOMINIO=… bash despliegue/instalar.sh
#
# Variables (todas opcionales):
#   DOMINIO   dominio que apunta al VPS. Sin él, responde por la IP en http.
#   CORREO    con DOMINIO, pide el certificado HTTPS de Let's Encrypt.
#   USUARIO, CLAVE   si se dan, todo el sitio pide usuario y contraseña (recomendado en público:
#             el sistema no tiene autenticación y cualquiera podría reiniciar la demo).
#   REPO, RAMA, DIR   origen y destino del código (por defecto el repo del equipo, main, /opt/lunna).
#   TOKEN     token de GitHub para clonar un repo privado. Se guarda sólo en $DIR/.git/config (modo 600)
#             para que actualizar.sh pueda traer cambios.
set -euo pipefail

REPO="${REPO:-https://github.com/DinDevJ/lunna.git}"
RAMA="${RAMA:-main}"
DIR="${DIR:-/opt/lunna}"
DOMINIO="${DOMINIO:-}"
CORREO="${CORREO:-}"
USUARIO="${USUARIO:-}"
CLAVE="${CLAVE:-}"
TOKEN="${TOKEN:-}"

paso() { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }
[ "$(id -u)" -eq 0 ] || { echo "Córrelo como root (sudo)."; exit 1; }

paso "Paquetes del sistema"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git nginx curl ca-certificates openssl >/dev/null

paso "Node.js 22 (el backend usa node:sqlite y TypeScript integrados)"
necesita_node() {
  command -v node >/dev/null || return 0
  local v; v="$(node -v | sed 's/^v//')"
  local mayor="${v%%.*}" menor; menor="$(echo "$v" | cut -d. -f2)"
  [ "$mayor" -lt 22 ] || { [ "$mayor" -eq 22 ] && [ "$menor" -lt 6 ]; }
}
if necesita_node; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
echo "node $(node -v)"

paso "Usuario de servicio y código en $DIR"
id lunna >/dev/null 2>&1 || useradd --system --home "$DIR" --shell /usr/sbin/nologin lunna
# El código es del usuario lunna y git corre como root: sin esto git se niega («dubious ownership»).
git config --global --get-all safe.directory | grep -qx "$DIR" || git config --global --add safe.directory "$DIR"
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

paso "Servicio del backend (modo simulación, puerto 8787 local)"
NODE_BIN="$(command -v node)"
sed -e "s#__DIR__#$DIR#g" -e "s#__NODE__#$NODE_BIN#g" "$DIR/despliegue/lunna.service" > /etc/systemd/system/lunna.service
systemctl daemon-reload
systemctl enable -q lunna
systemctl restart lunna

paso "nginx: landing en / y el resto al backend"
AUTH=""
if [ -n "$USUARIO" ] && [ -n "$CLAVE" ]; then
  printf '%s:%s\n' "$USUARIO" "$(openssl passwd -apr1 "$CLAVE")" > /etc/nginx/lunna.htpasswd
  chmod 640 /etc/nginx/lunna.htpasswd; chown root:www-data /etc/nginx/lunna.htpasswd
  AUTH='auth_basic "Lunna"; auth_basic_user_file /etc/nginx/lunna.htpasswd;'
  echo "con usuario y contraseña ($USUARIO)"
fi
sed -e "s#__DOMINIO__#${DOMINIO:-_}#g" -e "s#__DIR__#$DIR#g" -e "s#__AUTH__#$AUTH#g" \
  "$DIR/despliegue/nginx-lunna.conf" > /etc/nginx/sites-available/lunna
# Sin IPv6 en la máquina, nginx no arranca con «listen [::]:80»
[ -s /proc/net/if_inet6 ] || sed -i '/listen \[::\]/d' /etc/nginx/sites-available/lunna
ln -sf /etc/nginx/sites-available/lunna /etc/nginx/sites-enabled/lunna
rm -f /etc/nginx/sites-enabled/default
# nginx (www-data) necesita poder leer la landing y el video
chmod o+rx "$DIR" "$DIR/landing" "$DIR/video"
nginx -t
systemctl reload nginx

if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  paso "Firewall: abre http/https; el 8787 queda cerrado al exterior"
  ufw allow 'Nginx Full' >/dev/null
fi

if [ -n "$DOMINIO" ] && [ -n "$CORREO" ]; then
  paso "HTTPS con Let's Encrypt para $DOMINIO"
  apt-get install -y -qq certbot python3-certbot-nginx >/dev/null
  certbot --nginx -d "$DOMINIO" --non-interactive --agree-tos -m "$CORREO" --redirect
  # HTTP/2: todas las peticiones (y los eventos en vivo de cada interfaz) viajan por una sola conexión.
  sed -i -E 's/listen (\[::\]:)?443 ssl( ipv6only=on)?;/listen \1443 ssl http2\2;/' /etc/nginx/sites-available/lunna
  nginx -t && systemctl reload nginx
fi

paso "Comprobación"
for i in $(seq 1 20); do curl -fs http://127.0.0.1:8787/api/salud >/dev/null && break; sleep 1; done
curl -fs http://127.0.0.1:8787/api/salud && echo
CRED=(); [ -n "$USUARIO" ] && CRED=(-u "$USUARIO:$CLAVE")
curl -fs "${CRED[@]}" -o /dev/null -w "landing: HTTP %{http_code}\n" http://127.0.0.1/
curl -fs "${CRED[@]}" -o /dev/null -w "app:     HTTP %{http_code}\n" http://127.0.0.1/app/
URL="http://${DOMINIO:-$(curl -fs https://api.ipify.org || hostname -I | awk '{print $1}')}"
[ -n "$DOMINIO" ] && [ -n "$CORREO" ] && URL="https://$DOMINIO"
printf '\n\033[1;32m✓ Lunna está en %s\033[0m\n' "$URL"
echo "  simulación: $URL/simulador · app: $URL/app/ · central: $URL/app/central.html · base: $URL/app/base.html"
echo "  registros:  journalctl -u lunna -f      · actualizar: sudo bash $DIR/despliegue/actualizar.sh"
