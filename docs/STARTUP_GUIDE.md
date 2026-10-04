# Guía de inicio local

## Requisitos

- Node.js `>=24.11 <25`.
- pnpm `>=10.17 <11` (el repositorio fija `pnpm@10.17.1`).
- Docker Desktop con Docker Compose.

Si pnpm no está habilitado:

```powershell
corepack enable
corepack prepare pnpm@10.17.1 --activate
```

## Primera instalación

Desde la raíz del repositorio:

```powershell
pnpm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
if (-not (Test-Path apps/api/.env)) { Copy-Item apps/api/.env.example apps/api/.env }
if (-not (Test-Path apps/web/.env.local)) { Copy-Item apps/web/.env.example apps/web/.env.local }
```

No sobrescriba archivos `.env` existentes sin revisar antes sus valores. La contraseña de
`DATABASE_URL` en `apps/api/.env` debe coincidir con `POSTGRES_PASSWORD` en `.env`. Los secretos JWT
deben ser diferentes entre sí y tener al menos 32 caracteres.

La web debe conservar esta URL local:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

## Preparar PostgreSQL

```powershell
docker compose up -d postgres
docker compose ps
pnpm db:migrate:deploy
pnpm db:seed
```

Espere a que `docker compose ps` muestre PostgreSQL como `healthy` antes de ejecutar migraciones o
el seed. El seed es idempotente y puede repetirse.

## Iniciar API y web

Abra dos terminales desde la raíz.

Terminal 1 — API:

```powershell
pnpm --filter @finance/api dev
```

Terminal 2 — web:

```powershell
pnpm --filter @finance/web dev
```

Servicios disponibles:

- Web: `http://localhost:3000`
- API: `http://localhost:3001/api/v1`
- Health: `http://localhost:3001/api/v1/health`
- Swagger: `http://localhost:3001/api/docs`

Swagger está habilitado en desarrollo mediante `SWAGGER_ENABLED=true`. La plantilla de producción lo
deshabilita; no cambie ese valor salvo que exista una necesidad operativa controlada.

El seed actual crea el usuario local `demo@finance.local` con la contraseña de desarrollo
`Demo1234!`. No use esa credencial fuera del entorno local.

## Comprobar los servicios

```powershell
Invoke-WebRequest http://localhost:3001/api/v1/health -UseBasicParsing
Invoke-WebRequest http://localhost:3000 -UseBasicParsing
```

Ambas solicitudes deben responder HTTP 200.

## Publicación

La preparación de GitHub, PostgreSQL administrado, dos proyectos Vercel, variables, dominios y
certificados está en [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md). La configuración local no debe
copiarse literalmente a producción y nunca debe versionarse un archivo `.env`.

## Validar el frontend web

Validaciones que no necesitan navegador:

```powershell
pnpm --filter @finance/web lint
pnpm --filter @finance/web typecheck
pnpm --filter @finance/web test
pnpm --filter @finance/web build
```

Con PostgreSQL, API y web iniciados, configure las credenciales locales sólo en la terminal actual:

```powershell
$env:WEB_SMOKE_EMAIL = 'demo@finance.local'
$env:WEB_SMOKE_PASSWORD = 'Demo1234!'
pnpm --filter @finance/web test:visual
pnpm --filter @finance/web test:invitation
pnpm --filter @finance/web test:errors
```

Los smokes usan Microsoft Edge mediante `playwright-core`. Puede definir `WEB_BROWSER_PATH` si Edge
está instalado en otra ubicación.

## Invitaciones internas

Una invitación dirigida al email de un usuario registrado aparece en `/my-invitations`. El usuario
puede aceptarla o rechazarla desde su sesión, sin copiar el token. Si todavía no tiene cuenta, el
administrador debe compartir el enlace que se muestra una sola vez al crear la invitación. Ese
enlace conserva el flujo `/accept-invitation?token=...` y permite volver de login o registro mediante
una ruta interna segura.

El email automático sigue pendiente. No se necesita configurar Gmail, Outlook, SMTP ni otro
proveedor para probar ninguno de los dos flujos.

## Validar el backend

```powershell
pnpm --filter @finance/api lint
pnpm --filter @finance/api typecheck
pnpm --filter @finance/api test
pnpm --filter @finance/api test:e2e
pnpm --filter @finance/api build
```

Los tests e2e requieren PostgreSQL local disponible.

## Detener los servicios

Detenga API y web con `Ctrl+C` en sus terminales. Después detenga PostgreSQL sin borrar datos:

```powershell
docker compose stop postgres
```

El volumen `finance_postgres_data` se conserva. No ejecute `docker compose down -v` salvo que quiera
eliminar definitivamente la base local.
