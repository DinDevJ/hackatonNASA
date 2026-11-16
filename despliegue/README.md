> 🌐 **Español** · [English](README.en.md)

# Despliegue en un VPS

Publica Lunna en un servidor: la **landing** en `/` y, detrás, el backend en **modo simulación** con todas las
interfaces (`/app/`, `/app/central.html`, `/app/base.html`, `/reloj/`, `/simulador`).

**Pensado para un VPS que ya aloja otro proyecto.** El instalador no toca lo ajeno: no borra ni cambia otros
sitios de nginx (tampoco `default`), no cambia el Node.js del sistema y, sin dominio, usa un puerto propio.

```
navegador ──► nginx :8088 (o :80/:443 con dominio) ──┬─ /            landing/ (estática)
                                                     ├─ /video/ /recursos/   archivos
                                                     ├─ /estado      página de estado del backend
                                                     └─ todo lo demás ──► backend 127.0.0.1:8787 (systemd «lunna»)
```

## 1. Revisar el VPS (sólo lee)

Antes de instalar, mira qué hay en el servidor: puertos ocupados, sitios de nginx, versión de Node y quién la usa,
memoria y firewall. No cambia nada.

```bash
sudo bash revisar-vps.sh
```

(Si todavía no tienes el repo en el VPS, descárgalo igual que el instalador, cambiando `instalar.sh` por `revisar-vps.sh`.)

## 2. Instalar

### Con el repositorio privado (token)

1. En GitHub: **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
   Repository access: sólo `DinDevJ/lunna`. Permissions: **Contents: Read-only**. Copia el token.
2. En el VPS (pega el token cuando lo pida; no se ve en pantalla ni queda en el historial):

```bash
read -rs TOKEN
```

```bash
curl -fsSL -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github.raw" https://api.github.com/repos/DinDevJ/lunna/contents/despliegue/instalar.sh | sudo TOKEN="$TOKEN" bash
```

Al terminar muestra la dirección, por ejemplo `http://TU-IP:8088`. El token se guarda sólo en
`/opt/lunna/.git/config` (permisos 600) para que `actualizar.sh` pueda traer cambios. Para revocarlo, bórralo en
GitHub; para quitarlo del VPS: `sudo git -C /opt/lunna config --unset http.https://github.com/.extraheader`.

| Variable | Para qué | Si se omite |
|---|---|---|
| `TOKEN` | Clonar el repo privado | Clona sin credenciales (sólo repo público) |
| `PUERTO_WEB` | Puerto público de Lunna | `8088` sin dominio · `80` con dominio |
| `DOMINIO` | Nombre del sitio (comparte el 80 con otros sitios por nombre) | Responde por IP en su puerto |
| `CORREO` | HTTPS de Let's Encrypt y HTTP/2 (requiere `DOMINIO` y `PUERTO_WEB=80`) | Sólo http |
| `PUERTO_BACKEND` | Puerto local del backend | `8787` |
| `AJUSTAR_NGINX` | `0` para no subir `worker_connections` | `1` |
| `RAMA`, `DIR` | Rama y carpeta | `main`, `/opt/lunna` |

Ejemplo con otro puerto: `… | sudo TOKEN="$TOKEN" PUERTO_WEB=8090 bash`.

### Qué hace y qué NO hace

| Hace | No hace |
|---|---|
| Revisa antes que los puertos estén libres y **se detiene** si algo choca | No borra ni edita otros sitios de nginx |
| Instala sólo los paquetes que falten (`--no-upgrade`) | No actualiza paquetes existentes |
| Usa un Node 22 propio en `/opt/lunna-node` (descarga oficial, firma sha256 verificada) | No cambia el Node del sistema |
| Respalda `/etc/nginx` en `/root/lunna-respaldos/` y valida con `nginx -t` | No usa `default_server` |
| Si la configuración falla, **restaura el respaldo** y no recarga | No reinicia nginx: usa `reload` (sin cortes) |
| Compara cómo responden los otros sitios antes y después | No abre el puerto del backend al exterior |
| Sube `worker_connections` a 4096 si es menor (lo único global) | No baja ningún límite |

## 3. Seguridad y carga (mucha gente a la vez)

La demo queda **abierta a todos** (decisión del equipo). Para que aguante y no se pueda abusar:

- **El backend sólo escucha en `127.0.0.1`**: a internet se llega únicamente por nginx.
- **Límites por IP**, generosos porque en una sede muchos comparten la IP del Wi-Fi:
  lectura 300/s (ráfaga 1 000; la micro-caché de 1 s protege al backend); escrituras 20/s con cola de 1 000 (no se rechazan las ráfagas de «Prepare mission»);
  **reiniciar la demo: 6 por minuto**; eventos en vivo: 400 por IP y 3 000 en total. Al pasarse responde 429.
- **Cabeceras de seguridad**: `nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy`,
  `Cross-Origin-Opener-Policy`; sin versión de nginx; sin CORS (ninguna otra página puede escribir en la API).
- **Servicio aislado**: usuario `lunna` sin shell, sólo escribe en su carpeta, `MemoryMax=500M` para no quitarle
  memoria al otro proyecto.
- **Rendimiento**: compresión gzip (el JS de la app pasa de 172 KB a 50 KB), caché del navegador para videos e
  imágenes, conexiones persistentes hacia Node.

Riesgo que queda por ser abierta: cualquiera puede reiniciar la demo (máximo 6 veces por minuto por IP) o mandar
datos simulados. No hay datos reales ni personales.

## Actualizar y desinstalar

```bash
sudo bash /opt/lunna/despliegue/actualizar.sh
```

Para quitar Lunna sin tocar lo demás (servicio, sitio y snippets de nginx; conserva el código y los respaldos):

```bash
sudo bash /opt/lunna/despliegue/desinstalar.sh
```

## Operación

| Qué | Comando |
|---|---|
| Ver registros | `journalctl -u lunna -f` |
| Reiniciar el backend | `sudo systemctl restart lunna` |
| Estado | `systemctl status lunna` · `http://TU-IP:8088/estado` |
| Empezar la demo de cero | En `/simulador`: «Prepare mission» |
| Deshacer nginx | `sudo rm /etc/nginx/sites-enabled/lunna && sudo systemctl reload nginx` |

La base de la simulación vive en `/opt/lunna/Simulacion/eva-simulacion.db` y no se versiona.

## Qué se probó

En un VPS simulado (Ubuntu 24.04, nginx 1.24) con **otro proyecto ya en el puerto 80**:

- El instalador **se detiene** si el puerto web está tomado por otro sitio sin dominio, si lo ocupa otro programa
  o si el puerto del backend está en uso.
- La instalación completa termina; el otro proyecto responde igual antes y después; el backend queda en
  `127.0.0.1`; la landing, el celular, la central, el reloj y el simulador cargan por `IP:8088`.
- Cabeceras de seguridad presentes, gzip activo, eventos en vivo sin búfer, reiniciar limitado (429 a la 5.ª),
  60 escrituras simultáneas aceptadas.
- `desinstalar.sh` quita sólo lo de Lunna.
- **Carga**: 50 visitantes saliendo por una misma IP (como una sede con un Wi-Fi), cada uno con la central, el
  celular y 5 eventos en vivo (250 en total), durante 30 s: 3 578 peticiones, todas 200, p50 1 ms y p95 5 ms; el
  backend siguió respondiendo en ~1 ms y usó ~165 MB. «Prepare mission» por nginx: 11,7 s.

No se probó con systemd real ni con certbot: el entorno de prueba no tiene systemd ni dominio.

## Archivos

| Archivo | Qué es |
|---|---|
| `revisar-vps.sh` | Revisión previa del servidor (sólo lee) |
| `instalar.sh` | Instalación segura para VPS compartido; se puede volver a correr |
| `actualizar.sh` | Trae lo último de la rama y reinicia sólo Lunna |
| `desinstalar.sh` | Quita Lunna sin tocar lo demás |
| `lunna.service` | Servicio de systemd (usuario `lunna`, sólo local, límite de memoria) |
| `nginx-lunna.conf` | Sitio de nginx (plantilla; `instalar.sh` la completa) |
| `nginx-lunna-proxy.conf`, `nginx-lunna-cabeceras.conf` | Snippets: cabeceras hacia el backend y de seguridad |
