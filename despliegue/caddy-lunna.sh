#!/usr/bin/env bash
# Publica los dominios de Lunna con HTTPS a través del Caddy de OTRO proyecto que corre en Docker y ya tiene el 80/443.
#
# No edita su Caddyfile ni reinicia su contenedor: agrega UNA ruta (con @id "lunna") por la API de administración de
# Caddy, que sólo escucha dentro del contenedor. Para hablarle usa un contenedor temporal de curl que comparte su red
# (se borra al terminar). Antes respalda la configuración completa. Caddy saca solo los certificados.
#
#   sudo bash caddy-lunna.sh            agrega (o actualiza) la ruta de Lunna
#   sudo bash caddy-lunna.sh quitar     la quita y deja Caddy como estaba
#   sudo bash caddy-lunna.sh restaurar ARCHIVO.json   vuelve a cargar un respaldo completo
#
# Variables: CONTENEDOR (pulso-web-1), DOMINIOS ("lunna.danaus.dev app.lunna.danaus.dev"), PUERTO_WEB (8088).
# Ojo: un cambio por la API dura mientras el contenedor siga vivo; si el otro proyecto lo reinicia, vuelve a correrlo.
set -euo pipefail
CONTENEDOR="${CONTENEDOR:-pulso-web-1}"
DOMINIOS="${DOMINIOS:-lunna.danaus.dev app.lunna.danaus.dev}"
PUERTO_WEB="${PUERTO_WEB:-8088}"
ACCION="${1:-agregar}"
CURL_IMG=curlimages/curl:8.11.1
ADMIN=http://localhost:2019

api() { docker run --rm --network "container:$CONTENEDOR" "$CURL_IMG" -fsS "$@"; }
alto() { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }
[ "$(id -u)" -eq 0 ] || alto "Córrelo como root (sudo)."
docker inspect "$CONTENEDOR" >/dev/null 2>&1 || alto "No existe el contenedor $CONTENEDOR."

# Respaldo de la configuración completa de Caddy (siempre, antes de tocar nada)
mkdir -p /root/lunna-respaldos
RESPALDO="/root/lunna-respaldos/caddy-$(date +%Y%m%d-%H%M%S).json"
api "$ADMIN/config/" > "$RESPALDO" || alto "La API de administración de Caddy no responde dentro de $CONTENEDOR."
echo "respaldo de la configuración de Caddy: $RESPALDO"

if [ "$ACCION" = restaurar ]; then
  [ -s "${2:-}" ] || alto "Uso: caddy-lunna.sh restaurar ARCHIVO.json"
  docker run --rm -i --network "container:$CONTENEDOR" "$CURL_IMG" -fsS -X POST -H 'Content-Type: application/json' \
    --data-binary @- "$ADMIN/load" < "$2"
  echo "✓ configuración restaurada desde $2"; exit 0
fi

# Quita la ruta anterior de Lunna, si existe (idempotente)
api -X DELETE "$ADMIN/id/lunna" >/dev/null 2>&1 || true
if [ "$ACCION" = quitar ]; then echo "✓ dominios de Lunna quitados de Caddy"; exit 0; fi

# Servidor HTTPS de Caddy (el que escucha en :443) y puerta de enlace de su red hacia el host
SRV="$(python3 -c 'import json,sys
d=json.load(open(sys.argv[1]))["apps"]["http"]["servers"]
print(next(k for k,v in d.items() if any(l.endswith(":443") for l in v.get("listen",[]))))' "$RESPALDO")" \
  || alto "No encontré el servidor de Caddy que escucha en :443."
GW="$(docker inspect "$CONTENEDOR" --format '{{range .NetworkSettings.Networks}}{{.Gateway}} {{end}}' | awk '{print $1}')"
[ -n "$GW" ] || alto "No encontré la puerta de enlace de la red de $CONTENEDOR."

HOSTS="$(printf '"%s",' $DOMINIOS)"; HOSTS="[${HOSTS%,}]"
RUTA='{"@id":"lunna","match":[{"host":'"$HOSTS"'}],"handle":[{"handler":"reverse_proxy","upstreams":[{"dial":"'"$GW:$PUERTO_WEB"'"}],"flush_interval":-1}],"terminal":true}'
# Se inserta al principio de las rutas del servidor :443, para que una ruta general del otro proyecto no la tape
api -X PUT -H 'Content-Type: application/json' -d "$RUTA" "$ADMIN/config/apps/http/servers/$SRV/routes/0" >/dev/null \
  || { echo "Falló; restaurando el respaldo…" >&2
       docker run --rm -i --network "container:$CONTENEDOR" "$CURL_IMG" -fsS -X POST -H 'Content-Type: application/json' \
         --data-binary @- "$ADMIN/load" < "$RESPALDO" || true
       alto "No se pudo agregar la ruta; Caddy quedó como estaba."; }

echo "✓ ruta de Lunna agregada a Caddy ($SRV): $DOMINIOS → $GW:$PUERTO_WEB"
echo "  Caddy pedirá los certificados HTTPS (unos segundos). Prueba:"
for d in $DOMINIOS; do echo "    curl -sI https://$d | head -1"; done
echo "  Para quitarla: sudo bash $(readlink -f "$0") quitar"
