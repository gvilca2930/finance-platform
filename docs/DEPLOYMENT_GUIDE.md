# GitHub y despliegue en Vercel

Esta guía deja el MVP preparado para publicarse como **dos proyectos de Vercel conectados al mismo
repositorio**:

| Proyecto Vercel        | Root Directory | Responsabilidad         |
| ---------------------- | -------------- | ----------------------- |
| `finance-platform-api` | `apps/api`     | NestJS y API REST       |
| `finance-platform-web` | `apps/web`     | Next.js y aplicación UI |

PostgreSQL es un servicio persistente separado. No debe ejecutarse dentro de Vercel ni exponerse al
navegador.

## 1. Comprobación previa

Desde la raíz:

```powershell
pnpm install --frozen-lockfile
pnpm db:validate
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm format:check
```

El workflow `.github/workflows/ci.yml` repite estas comprobaciones con un PostgreSQL efímero. Sus
credenciales son exclusivamente de CI y no son secretos de producción.

## 2. Crear y subir el repositorio de GitHub

La carpeta puede inicializarse localmente así:

```powershell
git init -b main
git add .
git status
git commit -m "Prepare Finance Platform for deployment"
```

Revise `git status` antes del commit. No deben aparecer `.env`, `.env.local`, `.vercel`, builds,
clientes Prisma generados ni capturas locales.

Opción con GitHub CLI, después de `gh auth login`:

```powershell
gh repo create finance-platform --private --source=. --remote=origin --push
```

Opción con un repositorio vacío creado desde github.com:

```powershell
git remote add origin https://github.com/TU_USUARIO/finance-platform.git
git push -u origin main
```

Se recomienda mantener el repositorio privado, proteger `main` y exigir el check `CI / validate`
antes de hacer merge. Nunca copie secretos al repositorio ni a GitHub Actions.

## 3. Preparar PostgreSQL de producción

Use PostgreSQL administrado y una cadena de conexión compatible con conexiones serverless. Cuando el
proveedor ofrezca un endpoint con pool de conexiones, úselo para `DATABASE_URL`; active TLS con la
opción indicada por el proveedor (habitualmente `sslmode=require`). Conserve además un endpoint
directo si el proveedor lo exige para migraciones.

Antes de la primera publicación, aplique las migraciones una sola vez desde un entorno confiable:

```powershell
$env:DATABASE_URL = 'CADENA_DE_PRODUCCION_OBTENIDA_DEL_PROVEEDOR'
pnpm db:migrate:deploy
Remove-Item Env:DATABASE_URL
```

No ejecute `db:seed` en producción: contiene datos y credenciales demostrativas. Tampoco ejecute
migraciones automáticamente en cada build de Vercel; dos builds concurrentes no deben administrar el
schema.

## 4. Desplegar la API

En Vercel seleccione **Add New → Project**, importe el repositorio y configure:

- Root Directory: `apps/api`.
- Framework Preset: NestJS (detección automática).
- Node.js: `24.x`.
- Install y Build Commands: conservar la detección automática.
- Include source files outside the Root Directory: activado; Vercel suele activarlo por defecto para
  monorepos y es necesario para los paquetes `workspace:*`.

Variables del proyecto API para **Production**:

| Variable                 | Valor                                         |
| ------------------------ | --------------------------------------------- |
| `NODE_ENV`               | `production`                                  |
| `DATABASE_URL`           | secreto entregado por PostgreSQL              |
| `JWT_ACCESS_SECRET`      | secreto aleatorio único de 48 bytes o más     |
| `JWT_REFRESH_SECRET`     | otro secreto aleatorio, distinto del anterior |
| `JWT_ACCESS_EXPIRES_IN`  | `15m`                                         |
| `JWT_REFRESH_EXPIRES_IN` | `30d`                                         |
| `CORS_ORIGINS`           | origen exacto de la web, sin `/` final        |
| `SWAGGER_ENABLED`        | `false`                                       |

No configure `PORT` en Vercel: la plataforma lo asigna al proceso. Para otro hosting consulte
`apps/api/.env.production.example` y defínalo explícitamente.

Genere los JWT localmente y pegue únicamente el resultado en Vercel; ejecute dos veces:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

No reutilice secretos entre Development, Preview y Production. Para el primer despliegue, si todavía
no conoce el dominio web definitivo, use temporalmente un origen HTTPS controlado, despliegue la web
y luego corrija `CORS_ORIGINS` y vuelva a desplegar la API. Nunca use `*`.

Compruebe:

```text
https://DOMINIO_API/api/v1/health
```

## 5. Desplegar la web

Importe de nuevo el mismo repositorio como otro proyecto:

- Root Directory: `apps/web`.
- Framework Preset: Next.js.
- Node.js: `24.x`.
- Install y Build Commands: detección automática.
- Include source files outside the Root Directory: activado.

Variable para **Production**:

```env
NEXT_PUBLIC_API_URL=https://DOMINIO_API/api/v1
```

`NEXT_PUBLIC_API_URL` es pública por diseño y nunca debe contener credenciales. Después del primer
despliegue copie el origen exacto de la web, por ejemplo `https://finance-platform-web.vercel.app`, a
`CORS_ORIGINS` de la API y redepliegue la API.

## 6. Dominios, HTTPS y certificados

Una distribución recomendada es:

```text
app.tudominio.com  → proyecto web
api.tudominio.com  → proyecto API
```

Agregue cada dominio en **Project → Settings → Domains** y cree los registros DNS que Vercel indique.
Vercel emite y renueva los certificados TLS automáticamente. Después de asignarlos:

1. cambie `NEXT_PUBLIC_API_URL` a `https://api.tudominio.com/api/v1`;
2. cambie `CORS_ORIGINS` a `https://app.tudominio.com`;
3. redepliegue ambos proyectos;
4. verifique que HTTP redirija a HTTPS y que health, login e invitaciones funcionen.

La web añade HSTS y cabeceras contra MIME sniffing, iframes y permisos innecesarios en producción.
La API usa Helmet, validación estricta, rate limiting y una lista exacta de orígenes. Un certificado
protege el tráfico en tránsito, pero no reemplaza estas medidas ni la rotación de secretos.

## 7. Preview y producción

Vercel crea previews por branch. Use bases de datos y JWT separados si habilita una API Preview. Una
web Preview no podrá llamar a la API Production mientras su origen no esté en `CORS_ORIGINS`; esto es
intencional. No habilite un comodín `*.vercel.app` para evitar esa restricción.

Los cambios de variables solo aplican a nuevos deployments. Tras modificarlas, redepliegue el
proyecto correspondiente.

## 8. Verificación posterior

- `GET /api/v1/health` responde 200.
- registro, login, refresh y logout funcionan por HTTPS;
- un workspace BUSINESS comparte cuentas entre sus miembros;
- crear, listar, aceptar y rechazar invitaciones funciona;
- el enlace `/accept-invitation?token=...` conserva el flujo de login/registro;
- no se muestra Swagger en producción cuando `SWAGGER_ENABLED=false`;
- los logs de Vercel no contienen tokens, contraseñas ni cadenas de conexión;
- el dominio web es el único origen de producción permitido por CORS.

## 9. Limitaciones de seguridad pendientes

El MVP guarda access y refresh tokens en `sessionStorage`. HTTPS evita su lectura en tránsito, pero no
los protege frente a JavaScript inyectado por una vulnerabilidad XSS. Antes de manejar datos
financieros reales de terceros debe priorizarse migrar el refresh token a una cookie `HttpOnly`,
`Secure` y `SameSite`, además de definir CSP, monitoreo, backups probados y un procedimiento de
rotación de secretos. Estas mejoras no requieren hardcodear valores ni cambiar el modelo multiusuario.
