# Landing de Lunna

Página de presentación: muestra **cada dispositivo como se ve de verdad** (celular, reloj, computadora central y
base en Tierra, cada uno con su interfaz real funcionando dentro de su marco) y después la entrada a la
simulación de la nave.

Las interfaces se cargan desde el backend de Lunna, así que tiene que estar corriendo.

## Verla en local

```bash
# 1. El backend en modo simulación (sirve /app/, /reloj/, /simulador…)
cd Simulacion
npm start
```

```bash
# 2. La landing, servida desde la raíz del repositorio (así encuentra ../video/)
python3 -m http.server 3000
```

Abre http://localhost:3000/landing/. En local la landing busca el backend en `http://localhost:8787`. Otro se
indica con `?backend=http://host:puerto`.

## En el VPS

La sirve nginx en `/` y el resto va al backend en el mismo dominio: ver [`../despliegue/`](../despliegue/README.md).
Al compartir dominio, el celular abre directo en su pantalla principal, sin el tutorial de bienvenida.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | Portada, dispositivos, simulación, cómo funciona, respaldo, video y equipo |
| `styles.css` | Estilos (marcos de teléfono, reloj y monitor; diseño adaptable) |
| `main.js` | Escala cada interfaz a su marco, la carga al acercarse y la activa con «Toca para usar» |
