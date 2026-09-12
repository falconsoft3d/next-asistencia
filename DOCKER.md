# Deploy con Docker

Esta app (`next-asistencia`) es un frontend Next.js que consume la API de Odoo
expuesta por el módulo `hr_attendance_soltec` (endpoints `/api/asistencia/...`).
No tiene base de datos propia ni backend: solo necesita saber a qué URL de
Odoo debe llamar.

## Archivos añadidos

- **`Dockerfile`**: build multi-stage (deps → builder → runner) que produce
  una imagen final mínima basada en `node:20-alpine`, usando el modo
  [`output: "standalone"`](next.config.ts) de Next.js.
- **`.dockerignore`**: evita copiar `node_modules`, `.next`, `.git`, etc. al
  contexto de build.
- **`docker-compose.yml`**: forma cómoda de construir y levantar el
  contenedor sin recordar el comando completo de `docker build`/`run`.

## La variable de entorno importante

```
NEXT_PUBLIC_ODOO_API_URL=http://tu-servidor-odoo:8069
```

Es la única variable que usa la app (ver [`lib/api.ts`](lib/api.ts)). Como
empieza por `NEXT_PUBLIC_`, Next.js la **incrusta en el JavaScript del
navegador durante el build** — no se puede cambiar después arrancando el
contenedor con un `-e` distinto. Por eso el Dockerfile la recibe como
`ARG` y la fija como `ENV` **antes** de `npm run build`:

```dockerfile
ARG NEXT_PUBLIC_ODOO_API_URL
ENV NEXT_PUBLIC_ODOO_API_URL=$NEXT_PUBLIC_ODOO_API_URL
```

Si necesitas apuntar a otro Odoo (staging, producción, etc.) tienes que
**reconstruir la imagen** pasando el nuevo valor como build-arg; no basta con
cambiar una variable de entorno del contenedor en marcha.

## Build y run manual

```bash
# Construir la imagen, apuntando al Odoo real (ajusta la URL)
docker build \
  --build-arg NEXT_PUBLIC_ODOO_API_URL=http://mi-odoo.example.com \
  -t next-asistencia:latest .

# Levantar el contenedor
docker run -d \
  --name next-asistencia \
  -p 3000:3000 \
  next-asistencia:latest
```

La app queda disponible en `http://localhost:3000/asistencia/entrar` (o la
ruta que corresponda).

## Build y run con docker-compose

```bash
# Opción 1: exportando la variable antes de levantar
export NEXT_PUBLIC_ODOO_API_URL=http://mi-odoo.example.com
docker compose up --build -d

# Opción 2: creando un .env junto al docker-compose.yml
echo "NEXT_PUBLIC_ODOO_API_URL=http://mi-odoo.example.com" > .env
docker compose up --build -d
```

Si no defines la variable, `docker-compose.yml` usa por defecto
`http://localhost:8069`, útil solo para probar el contenedor en tu propia
máquina.

Para reconstruir tras un cambio de código o de URL de Odoo:

```bash
docker compose up --build -d
```

Para bajarlo:

```bash
docker compose down
```

## Por qué el Dockerfile tiene 3 etapas

1. **`deps`**: instala dependencias con `npm ci` (usa `package-lock.json`
   para builds reproducibles) en una capa que Docker puede cachear mientras
   no cambie `package.json`/`package-lock.json`.
2. **`builder`**: copia el código, reutiliza `node_modules` de `deps` y
   ejecuta `next build`. Aquí es donde se fija `NEXT_PUBLIC_ODOO_API_URL`.
3. **`runner`**: imagen final. Solo copia lo estrictamente necesario para
   ejecutar en producción gracias a `output: "standalone"`:
   - `.next/standalone` → `server.js` + un `node_modules` mínimo (solo lo
     que realmente se usa en runtime, no todo `node_modules`).
   - `.next/static` → JS/CSS de los assets estáticos.
   - `public` → archivos públicos (si los hay).

   Esto reduce mucho el tamaño de la imagen final frente a copiar todo el
   proyecto con `node_modules` completo, y evita que las dependencias de
   build (TypeScript, ESLint, Tailwind, etc.) viajen a producción.

   El contenedor corre como usuario `nextjs` sin privilegios (no root), y
   arranca con `node server.js` escuchando en `0.0.0.0:3000`.

## Notas para producción real

- **Reverse proxy / HTTPS**: esta imagen sirve HTTP plano en el puerto 3000.
  En producción ponla detrás de un proxy (Nginx, Traefik, Caddy, el propio
  Odoo, etc.) que termine TLS y reenvíe a `next-asistencia:3000`.
- **CORS en Odoo**: los endpoints en
  [`controllers/api.py`](../soltec/hr_attendance_soltec/controllers/api.py)
  ya declaran `cors='*'`, así que no hace falta configurar nada adicional en
  Odoo para que este frontend, sirviéndose desde otro origen/puerto, pueda
  llamarlos.
- **Healthcheck** (opcional): puedes añadir en `docker-compose.yml`:
  ```yaml
  healthcheck:
    test: ["CMD", "wget", "-qO-", "http://localhost:3000/asistencia/login"]
    interval: 30s
    timeout: 5s
    retries: 3
  ```
- **Multi-arquitectura**: si el servidor de deploy no es el mismo arch que
  tu máquina (p. ej. build en Mac Apple Silicon, deploy en un VPS x86_64),
  construye con `docker buildx build --platform linux/amd64 ...` o hazlo
  directamente en el servidor de destino.
