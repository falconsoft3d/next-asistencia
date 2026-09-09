# next-asistencia

App Next.js para fichaje (empleados y contactos/subcontratas), partes de
trabajo, viajes, imputación de partidas y vacaciones. Consume la API JSON
(Bearer token) expuesta por el módulo Odoo `hr_attendance_soltec`
(`controllers/api.py`).

## Desarrollo

```bash
cp .env.local.example .env.local   # ajusta NEXT_PUBLIC_ODOO_API_URL si hace falta
npm install
npm run dev
```

Abre `http://localhost:3000`. La home tiene dos botones: **Soy empleado**
(`/asistencia`) y **Soy contacto / subcontrata** (`/asistencia-partner`).

## Backend requerido

El módulo `hr_attendance_soltec` debe tener cargado
`controllers/api.py` (se registra en `controllers/__init__.py`). Tras
añadir o modificar ese fichero, Odoo necesita un reinicio o
`-u hr_attendance_soltec` para exponer las rutas `/api/asistencia/...` y
`/api/asistencia-partner/...`.

## Notas

- El token de sesión se guarda en `localStorage` (claves
  `asistencia_token` / `asistencia_partner_token`), por separado para cada
  flujo.
- Las llamadas van directas del navegador a `NEXT_PUBLIC_ODOO_API_URL`
  (CORS habilitado en el backend), sin proxy intermedio.
- El alcance del flujo de contacto/subcontrata replica exactamente lo que
  existe hoy en Odoo (login, entrar, salir, parte diario) — no incluye
  vacaciones, viajes, imputar partida ni listado de asistencias.
