# Greensun — Tracking de clientes Odoo

Panel web para identificar clientes que requieren seguimiento, basado en datos
de facturas (`account.move`) extraidos de un Odoo self-hosted via XML-RPC.

## Que hace

- **Clientes inactivos** — sin compras en los ultimos N dias (configurable, default 90).
- **Top en riesgo** — clientes de alto revenue reciente que dejaron de comprar.
- **Quiebre de cadencia** — clientes atrasados respecto a su propia cadencia historica.
- **Segmentacion RFM** — 11 segmentos (Campeones, Leales, En Riesgo, Perdidos...).
- **Revenue decline** — clientes con caida de gasto vs periodo anterior.

## Stack

- Next.js 16.2 (App Router, RSC, Proxy auth)
- React 19 + Tailwind v4
- Postgres 16 (mirror local de Odoo via Drizzle ORM)
- node-cron para sync horario incremental
- iron-session para auth de la app

## Setup inicial (primera vez)

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Configurar variables de entorno

Copia el ejemplo y edita los valores:

```bash
cp .env.example .env.local
```

Llena en `.env.local`:

| Variable          | Que poner                                                                 |
| ----------------- | ------------------------------------------------------------------------- |
| `ODOO_URL`        | URL base de tu Odoo. Ej: `http://192.168.1.50:8069`                       |
| `ODOO_DB`         | Nombre de la base de Odoo                                                 |
| `ODOO_USERNAME`   | Usuario (login email) de Odoo                                             |
| `ODOO_API_KEY`    | API key. Generar en Odoo: _Preferences > Account Security > New API Key_  |
| `APP_PASSWORD`    | Password compartido para entrar al panel                                  |
| `SESSION_SECRET`  | Cadena aleatoria >=32 chars. Genera: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

### 3. Levantar Postgres local

```bash
docker compose up -d
```

Verifica:

```bash
docker compose ps
```

### 4. Aplicar schema a la DB

```bash
pnpm db:push
```

Esto crea las tablas `partners`, `invoices`, `sync_state`, `app_config`.

### 5. Arrancar la app

```bash
pnpm dev
```

Abre http://localhost:3000 — te redirige a `/login`. Entra con tu `APP_PASSWORD`.

### 6. Primer sync

En el panel superior presiona **Sync ahora**. La primera vez puede tomar
varios minutos segun cantidad de facturas. Despues, el cron horario hace
sync incremental automatico (controla con `SYNC_CRON` y `SYNC_CRON_ENABLED`).

## Configuracion en runtime

En **Configuracion** dentro del panel puedes ajustar sin reiniciar:

- Umbral de inactividad (dias)
- Multiplicador de cadencia (default 1.5x)
- Periodo y % minimo para revenue decline
- Ventana de meses para RFM

## Comandos disponibles

```bash
pnpm dev          # dev server (Turbopack)
pnpm build        # build produccion
pnpm start        # arrancar build de produccion
pnpm lint         # ESLint
pnpm db:generate  # generar migration SQL desde schema.ts
pnpm db:migrate   # aplicar migrations
pnpm db:push      # push directo del schema a la DB (rapido para dev)
pnpm db:studio    # GUI de Drizzle Studio
```

## Estructura

```
app/                  # rutas Next 16
  login/              # pagina login
  dashboard/          # tabs protegidos
  api/                # route handlers (auth, sync, config)
components/
  ui/                 # primitivos (Card, Button, Table, Input, Badge)
  shell/              # layout (sidebar, header, sync-button, logout)
  sales/              # tablas de cada analisis
  config/             # form de configuracion
  auth/               # form de login
lib/
  config/env.ts       # validacion zod de variables de entorno
  db/                 # Drizzle schema + cliente
  odoo/               # cliente XML-RPC + tipos + parsing
  sync/               # servicio de sincronizacion + cron
  domain/sales/       # use cases (inactivos, RFM, etc.)
  domain/config/      # AppSettings persistidos en DB
  auth/               # session + guards
proxy.ts              # auth gate (Next 16: ex-middleware.ts)
instrumentation.ts    # registro del cron al arrancar
docker-compose.yml    # Postgres 16
drizzle.config.ts     # config drizzle-kit
```

## Como funciona el sync

1. Cron (default `5 * * * *` = cada hora en :05) ejecuta `runFullSync()`.
2. Para `partners` y `invoices` por separado: lee `sync_state.last_write_date`.
3. Construye dominio Odoo: `[["write_date", ">", lastWriteDate]]` filtrado por
   `customer_rank > 0` (partners) o `move_type in (out_invoice, out_refund)`
   (invoices).
4. Itera en batches de 200, upsert en Postgres.
5. Actualiza `sync_state` con el `write_date` mas reciente visto.

Es **incremental**: solo trae los registros modificados desde el ultimo run.
El boton "Sync ahora" en el header ejecuta el mismo flujo manualmente.

## Notas de seguridad

- `APP_PASSWORD` se compara en tiempo constante (no leak por timing).
- La cookie de sesion va firmada/encriptada con `SESSION_SECRET` (iron-session).
- `HttpOnly`, `SameSite=Lax`, `secure` en produccion.
- El `proxy.ts` bloquea todas las rutas excepto `/login` y `/api/auth/login`.
- Cada route handler revalida sesion con `requireAuth()`.

## Deploy en producción (Docker Compose)

El proyecto se distribuye como dos contenedores: `postgres` (datos) y `app`
(Next.js 16 standalone). Las migraciones se aplican automáticamente al arrancar.

### 1. Preparar el server

Requisitos:
- Docker Engine 24+ y `docker compose` plugin
- 2GB RAM mínimo (1GB postgres + 1GB app)
- Puerto 3000 abierto (o el que configures en `APP_PORT`)

```bash
git clone <tu-repo> /opt/greensun
cd /opt/greensun
cp .env.production.example .env
```

### 2. Configurar variables

Edita `.env`. Los críticos (no usar valores del ejemplo):

| Variable            | Notas                                                                       |
| ------------------- | --------------------------------------------------------------------------- |
| `POSTGRES_PASSWORD` | Password fuerte para Postgres. Solo accesible dentro del network bridge.    |
| `APP_PASSWORD`      | Lo que tipea el usuario al entrar al panel.                                 |
| `SESSION_SECRET`    | ≥32 chars. Genera con: `openssl rand -hex 32`                               |
| `ODOO_URL`          | URL pública de tu Odoo (SaaS o self-hosted)                                 |
| `ODOO_API_KEY`      | API key generada en Odoo (Preferences > Account Security)                   |

### 3. Build y arrancar

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

El build toma 2-4 min la primera vez. Los contenedores arrancan en orden:
1. `postgres` levanta y espera healthy (~10s)
2. `app` corre las migraciones (crea tablas si no existen)
3. `app` inicia Next.js en :3000
4. Healthcheck `/api/health` valida cada 30s

### 4. Verificar

```bash
# Status
docker compose -f docker-compose.prod.yml ps

# Logs en tiempo real
docker compose -f docker-compose.prod.yml logs -f app

# Health
curl http://localhost:3000/api/health
```

Abre `http://server-ip:3000` (o el dominio si tienes reverse proxy delante).

### 5. Primer sync

Entra al panel con tu `APP_PASSWORD` y presiona **Sync ahora**. El cron
horario quedará configurado por `SYNC_CRON_ENABLED=true`.

### Operación

```bash
# Reiniciar app sin tocar DB
docker compose -f docker-compose.prod.yml restart app

# Actualizar a nueva versión
git pull
docker compose -f docker-compose.prod.yml up -d --build app

# Backup manual de Postgres
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U $POSTGRES_USER $POSTGRES_DB | gzip > backups/$(date +%F).sql.gz

# Restore
gunzip < backups/2026-05-12.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U $POSTGRES_USER $POSTGRES_DB

# Shell en la DB
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U $POSTGRES_USER $POSTGRES_DB

# Trigger sync manual via HTTP (necesita login antes)
curl -X POST http://localhost:3000/api/sync/run \
  -H "Cookie: greensun-session=..."
```

### Reverse proxy + HTTPS

Si pones Caddy / Nginx / Traefik delante:

```caddyfile
greensun.miempresa.com {
  reverse_proxy localhost:3000
}
```

La cookie de sesión usa `secure: true` cuando `NODE_ENV=production`, requiere HTTPS.

### Backup automático con cron del host

```cron
0 3 * * * cd /opt/greensun && docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U greensun odoo_mirror | gzip > backups/$(date +\%F).sql.gz && \
  find backups -name '*.sql.gz' -mtime +30 -delete
```

## Limites conocidos

- Auth es password único compartido: sin trazabilidad por usuario.
- El cron corre dentro del proceso Next; para volumen alto considerar mover
  a un job runner dedicado.
- Multi-empresa: `company_id` se guarda pero la UI no filtra por empresa.
- RFM y revenue-decline normalizan USD/DOP con tasa fija ~60. Sin tipo de
  cambio histórico variable.
#   o d o o - c l i e n t s  
 