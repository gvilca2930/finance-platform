# Finance Platform

Monorepo de gestión financiera personal y para pequeños negocios. NestJS es la única fuente de
verdad del negocio; la aplicación web consume su API REST y nunca accede directamente a Prisma o
PostgreSQL.

## Estado actual

- Backend MVP funcional: autenticación, usuarios, workspaces, miembros, invitaciones, cuentas,
  categorías, movimientos, transferencias, presupuestos, recurrentes, dashboard y reportes.
- Frontend web funcional: autenticación, selector y onboarding de workspaces, módulos financieros,
  administración BUSINESS, aceptación de invitaciones, perfil y diseño responsive.
- PostgreSQL local mediante Docker Compose, migraciones Prisma y seed idempotente.
- Mobile conserva únicamente su scaffold; no es una aplicación funcional.
- El repositorio está preparado para CI en GitHub y para desplegar web/API como proyectos separados
  de Vercel; la creación de cuentas, dominios y secretos sigue siendo una operación del propietario.

El detalle vigente, las limitaciones conocidas y las últimas validaciones están en
[`docs/CURRENT_STATUS.md`](docs/CURRENT_STATUS.md).

## Inicio local

La instalación, configuración de entorno, arranque, comprobaciones y apagado seguro están en
[`docs/STARTUP_GUIDE.md`](docs/STARTUP_GUIDE.md).

Referencia adicional:

- Swagger con la API iniciada: `http://localhost:3001/api/docs`.
- OpenAPI generado: `apps/api/openapi/openapi.json`.
- Requests manuales: [`docs/http/finance-api.http`](docs/http/finance-api.http).
- GitHub, Vercel, PostgreSQL, dominios y TLS: [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md).
- Colores, marca, textos e icono: [`docs/BRANDING_GUIDE.md`](docs/BRANDING_GUIDE.md).
