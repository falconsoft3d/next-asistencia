# Deploy a producción — paso a paso

Guía de comandos para llevar `next-asistencia` a un servidor remoto con
Docker. Sustituye los valores entre `<...>` por los tuyos:

- `<usuario>@<ip-servidor>` — o el alias que tengas en `~/.ssh/config`
- `<url-odoo-publica>` — ej. `https://odoo.midominio.com` (la URL de Odoo
  que debe usar el frontend, ver [DOCKER.md](DOCKER.md) para por qué esto
  se fija en build-time)
- `<dominio-frontend>` — ej. `asistencia.midominio.com`

---

## 0. Requisitos en el servidor (una sola vez)

```bash
ssh <usuario>@<ip-servidor>
```

**Opción A — script oficial (recomendado, incluye el plugin `docker compose` v2):**

```bash
curl -fsSL https://get.docker.com | sh
```

**Opción B — paquetes de Ubuntu/Debian vía apt (si prefieres no usar `curl | sh`):**

```bash
apt update
apt install -y docker.io docker-compose-v2
systemctl enable --now docker
```

Si tu usuario **no** es `root`, añádelo al grupo `docker` para no tener que
usar `sudo` en cada comando (si ya estás como `root`, sáltate esto):

```bash
usermod -aG docker $USER
# cierra la sesión SSH y vuelve a entrar para que el grupo tenga efecto
exit
```

Verifica la instalación:

```bash
ssh <usuario>@<ip-servidor>
docker --version
docker compose version
```

---

## 1. Llevar el código al servidor

**Opción A — Git (recomendado si el repo está en un remoto accesible desde el servidor):**

```bash
ssh <usuario>@<ip-servidor>
git clone <url-del-repo> next-asistencia
cd next-asistencia/next-asistencia   # o la ruta donde esté el proyecto Next.js
```

**Opción B — copiar directamente desde tu máquina con rsync (sin pasar por git):**

```bash
# desde tu Mac, en la carpeta del proyecto
rsync -avz --exclude node_modules --exclude .next \
  ./ <usuario>@<ip-servidor>:~/next-asistencia/
```

---

## 2. Configurar la variable de entorno de build

En el servidor, dentro de la carpeta del proyecto:

```bash
cd ~/next-asistencia   # ajusta la ruta si usaste git clone con subcarpeta
echo "NEXT_PUBLIC_ODOO_API_URL=<url-odoo-publica>" > .env
```

Esto es lo que lee `docker-compose.yml` como build-arg. Si cambias esta URL
más adelante, tendrás que reconstruir la imagen (paso 3), no basta con
reiniciar el contenedor.

---

## 3. Build y arranque

```bash
docker compose up --build -d
```

Verifica que está corriendo:

```bash
docker compose ps
docker compose logs -f --tail=100
```

Prueba local en el propio servidor:

```bash
curl -I http://localhost:3000/asistencia/login
```

---

## 4. Reverse proxy con TLS (Nginx + Let's Encrypt)

El contenedor solo sirve HTTP en el puerto 3000. En producción ponlo detrás
de Nginx con certificado TLS.

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Crea `/etc/nginx/sites-available/next-asistencia`:

```nginx
server {
    listen 80;
    server_name <dominio-frontend>;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/next-asistencia /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Certificado TLS automático (también configura el redirect a https)
sudo certbot --nginx -d <dominio-frontend>
```

A partir de aquí, la app queda accesible en `https://<dominio-frontend>`.

---

## 5. CORS en Odoo

Los endpoints en
[`controllers/api.py`](../soltec/hr_attendance_soltec/controllers/api.py)
ya declaran `cors='*'`, así que Odoo aceptará peticiones desde
`https://<dominio-frontend>` sin configuración adicional.

---

## 6. Redeploy tras un cambio de código

```bash
ssh <usuario>@<ip-servidor>
cd ~/next-asistencia
git pull            # si usaste la opción A
docker compose up --build -d
```

Si usaste rsync (opción B), repite el `rsync` desde tu Mac y luego el
`docker compose up --build -d` en el servidor.

---

## 7. Rollback rápido

```bash
# ver imágenes anteriores
docker images next-asistencia

# volver a una imagen concreta (ejemplo con un tag/sha previo)
docker tag next-asistencia:<sha-anterior> next-asistencia:latest
docker compose up -d --no-build
```

Por eso conviene, antes de cada `up --build`, etiquetar la imagen actual:

```bash
docker tag next-asistencia:latest next-asistencia:backup-$(date +%Y%m%d%H%M)
```

---

## 8. Comandos útiles de mantenimiento

```bash
docker compose logs -f            # logs en vivo
docker compose restart            # reiniciar sin rebuild
docker compose down               # parar y eliminar el contenedor
docker system prune -f            # limpiar imágenes/capas viejas sin usar
```
