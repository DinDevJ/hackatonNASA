> 🌐 **Español** · [English](README.en.md)

# Despliegue en un VPS

Deja Lunna público en un servidor: la **landing** en `/` y, detrás, el backend en **modo simulación** con todas
las interfaces (`/app/`, `/app/central.html`, `/app/base.html`, `/reloj/`, `/simulador`).

```
navegador ──► nginx :80/:443 ──┬─ /            landing/ (estática)
                               ├─ /video/      video/
                               ├─ /estado      página de estado del backend
                               └─ todo lo demás ──► backend :8787 (systemd «lunna», modo simulación)
```

## Requisitos

- Ubuntu 22.04/24.04 o Debian 12, con acceso `root` o `sudo`.
- Puertos 80 y 443 abiertos.
- Opcional: un dominio con su registro A apuntando a la IP del VPS (para HTTPS).

El script instala lo que falte: git, nginx y Node.js 22.

## Instalar (un comando)

```bash
curl -fsSL https://raw.githubusercontent.com/DinDevJ/lunna/main/despliegue/instalar.sh \
  | sudo DOMINIO=lunna.ejemplo.com CORREO=tu@correo.com USUARIO=monarcas CLAVE='una-clave' bash
```

| Variable | Para qué | Si se omite |
|---|---|---|
| `DOMINIO` | Nombre del sitio | Responde por la IP |
| `CORREO` | Certificado HTTPS de Let's Encrypt (requiere `DOMINIO`) | Sólo http |
| `USUARIO`, `CLAVE` | Contraseña para todo el sitio | Sitio abierto |
| `RAMA` | Rama a desplegar | `main` |
| `DIR` | Carpeta del código | `/opt/lunna` |

⚠️ **Recomendado poner contraseña.** El sistema no tiene autenticación: cualquier visitante podría pulsar
«Preparar misión» o «Reiniciar» en el simulador y cambiar la demo para todos.

Con el repositorio ya clonado también vale `sudo DOMINIO=… bash despliegue/instalar.sh`. El script se puede
volver a correr: deja todo igual y actualiza el código.

## Actualizar

```bash
sudo bash /opt/lunna/despliegue/actualizar.sh
```

## Operación

| Qué | Comando |
|---|---|
| Ver registros | `journalctl -u lunna -f` |
| Reiniciar el backend | `sudo systemctl restart lunna` |
| Estado | `systemctl status lunna` · `https://tu-dominio/estado` |
| Empezar la demo de cero | En `/simulador`: «Preparar misión» |

La base de la simulación vive en `/opt/lunna/Simulacion/eva-simulacion.db` y no se versiona.

## Qué se probó

Con este mismo `nginx-lunna.conf` sobre Ubuntu 24.04 y nginx 1.24:

- Sin contraseña responde 401.
- Con contraseña cargan la landing, las cuatro interfaces, el simulador y el video (con rangos: se puede adelantar).
- Los eventos en vivo (`/api/stream`) pasan sin búfer.
- El celular dentro de la landing muestra los datos reales de LUNNA.

No se probó el servicio de systemd ni certbot, porque el entorno de prueba no tiene systemd ni dominio.

## Archivos

| Archivo | Qué es |
|---|---|
| `instalar.sh` | Instalación completa e idempotente |
| `actualizar.sh` | Trae lo último de la rama y reinicia |
| `lunna.service` | Servicio de systemd (usuario `lunna`, reinicio automático) |
| `nginx-lunna.conf` | Sitio de nginx (plantilla; `instalar.sh` la completa) |
