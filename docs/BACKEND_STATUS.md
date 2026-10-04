# Estado del backend

## Preparación productiva

La API valida todas sus variables al arrancar. El build de `@finance/api` genera el cliente Prisma
antes de compilar, por lo que también funciona cuando Vercel construye únicamente `apps/api`.
`SWAGGER_ENABLED=false` permite no publicar la interfaz de documentación en producción; OpenAPI
continúa generándose desde el código en desarrollo.

CORS acepta solo orígenes completos separados por coma y rechaza `*`; en producción debe contener el
dominio HTTPS exacto de la web. Helmet, DTO validation y rate limiting continúan activos. La guía de
migraciones, secretos, PostgreSQL y Vercel está en `docs/DEPLOYMENT_GUIDE.md`.

## Cuentas compartidas

Todos los miembros activos de un workspace pueden consultar sus cuentas, saldos, movimientos,
transferencias, definiciones recurrentes, dashboard y reportes. El aislamiento sigue aplicándose por
`workspaceId`; pertenecer a un workspace no concede acceso a otro.

Los roles conservan la autorización de escritura: OWNER y ADMIN administran cuentas; STAFF registra
operaciones dentro de sus permisos; VIEWER solo consulta. `FinancialAccountAccess` se conserva en el
esquema para una futura modalidad opcional de cuentas restringidas, pero no filtra el MVP actual.

## Invitaciones internas

El backend mantiene `WorkspaceInvitation` como fuente única para invitaciones administrativas,
internas y futuras entregas por email.

- `GET /api/v1/workspace-invitations/me` obtiene las invitaciones `PENDING`, no vencidas y asociadas
  al email normalizado del JWT.
- `POST /api/v1/workspace-invitations/:invitationId/accept` valida identidad, vigencia y workspace,
  crea la membresía con el rol ofrecido y marca la invitación como `ACCEPTED` en una transacción.
- `POST /api/v1/workspace-invitations/:invitationId/reject` valida la misma identidad y cambia el
  estado a `REJECTED` sin crear membresía.
- `POST /api/v1/workspace-invitations/accept` continúa aceptando el token de un solo uso.

Las respuestas internas seleccionan campos seguros y nunca incluyen `tokenHash` ni token. El token
plano solo existe en la respuesta de creación; la base de datos conserva únicamente SHA-256. Las
invitaciones vencidas se excluyen de `/me` y no requieren cron.

No existe integración con proveedores de correo. El contrato actual permite incorporar más adelante
un servicio de entrega que use el mismo enlace de aceptación sin cambiar el modelo de seguridad.
