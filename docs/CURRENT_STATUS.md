# Estado actual

Estado funcional validado el 3 de octubre de 2026.

## Backend

El MVP NestJS está implementado y es la autoridad de datos, cálculos y permisos. Incluye:

- registro, login, refresh rotation, logout, sesiones revocables y perfil;
- workspaces PERSONAL/BUSINESS, roles OWNER/ADMIN/STAFF/VIEWER y aislamiento multi-tenant;
- BusinessProfile, miembros e invitaciones internas o con aceptación por token;
- cuentas compartidas por todos los miembros activos del workspace, categorías jerárquicas,
  movimientos, transferencias y saldos calculados;
- presupuestos y avance, definiciones recurrentes, dashboard y reportes;
- validación, rate limiting, Swagger y OpenAPI generado.
- configuración productiva por entorno, Swagger desactivable y build aislado con generación de
  Prisma para Vercel.

PostgreSQL se usa a través de Prisma. Los montos viajan como strings decimales y las aplicaciones
cliente no acceden directamente a la base de datos.

## Frontend web

La aplicación Next.js implementa las rutas funcionales:

| Ruta                  | Función                                                        |
| --------------------- | -------------------------------------------------------------- |
| `/login`, `/register` | Autenticación y creación de sesión                             |
| `/dashboard`          | KPIs, presupuestos, categorías, saldos y movimientos recientes |
| `/transactions`       | CRUD, búsqueda, filtros y paginación                           |
| `/accounts`           | CRUD y saldos                                                  |
| `/categories`         | CRUD jerárquico de ingresos y gastos                           |
| `/transfers`          | CRUD y paginación                                              |
| `/budgets`            | CRUD mensual y avance                                          |
| `/recurring`          | CRUD de definiciones recurrentes                               |
| `/reports`            | Resumen, ingresos/gastos, categorías y saldos                  |
| `/members`            | Miembros, roles y remoción                                     |
| `/invitations`        | Administración de invitaciones                                 |
| `/my-invitations`     | Invitaciones pendientes recibidas por el usuario               |
| `/accept-invitation`  | Aceptación por token y retorno después de autenticarse         |
| `/settings/business`  | BusinessProfile                                                |
| `/settings/workspace` | Edición y archivado del workspace                              |
| `/profile`            | Perfil del usuario                                             |

La web usa TanStack Query para estado servidor, React Context para sesión/workspace y un cliente REST
central con refresh compartido ante respuestas 401. Los tokens actuales se guardan en
`sessionStorage`.

## Validación vigente

La última ejecución local terminó correctamente:

- ESLint y TypeScript;
- 4 archivos Vitest y 12 pruebas;
- 4 suites e2e de API y 18 pruebas;
- build de Next.js con 20 rutas de aplicación y el icono local;
- smoke visual desktop/mobile, cambio de workspace, guards y CRUD crítico;
- smoke de aceptación de invitaciones y roles OWNER/ADMIN/STAFF/VIEWER;
- smoke de errores de autenticación y CRUD, conservando los valores de formulario;
- health de API y web contra PostgreSQL local.

Los artefactos visuales están en `apps/web/.visual-artifacts`.

## Limitaciones conocidas

- `FinancialAccountAccess` permanece reservado para una futura opción de cuentas restringidas; no
  limita las cuentas compartidas del MVP.
- La protección inicial y por rol de la web es cliente; el backend conserva la autorización real.
- Los refresh tokens de la web aún no usan cookie HttpOnly.
- No existe envío real de emails para invitaciones; al crearlas se muestra una sola vez un enlace
  manual de desarrollo.
- Las definiciones recurrentes no tienen scheduler/cron.
- Faltan tests de componentes y ejecución reproducible de los smokes en CI.
- Mobile no está implementado.
- GitHub/Vercel están documentados y el CI dispone de PostgreSQL efímero, pero todavía no se han
  creado el repositorio remoto, los dos proyectos Vercel, PostgreSQL administrado ni los dominios.
- Para datos financieros reales siguen pendientes cookies HttpOnly, CSP, observabilidad, backups
  probados y procedimientos de rotación de secretos.

## Próximos pasos

1. Crear el repositorio privado y exigir el check de CI en `main`.
2. Proveer PostgreSQL administrado, aplicar migraciones y crear los dos proyectos Vercel siguiendo
   `docs/DEPLOYMENT_GUIDE.md`.
3. Migrar el refresh token a cookie HttpOnly antes de incorporar datos reales de terceros.
4. Añadir tests de componentes y ejecutar los tres smokes en CI.
5. Diseñar el modo opcional de cuentas restringidas antes de reactivar `FinancialAccountAccess`.
