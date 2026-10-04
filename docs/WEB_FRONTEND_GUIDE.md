# Guía del frontend web

## Producción y tema

La web recibe la API únicamente por `NEXT_PUBLIC_API_URL`; el valor productivo se configura en
Vercel y no se hardcodea. En producción sirve HSTS y cabeceras contra MIME sniffing, iframes y
permisos de navegador innecesarios. Vercel administra el certificado TLS del dominio.

La paleta global y de gráficos está centralizada en las variables de
`apps/web/src/app/globals.css`. Nombre, icono y puntos de marca están inventariados en
`docs/BRANDING_GUIDE.md`; el procedimiento completo está en `docs/DEPLOYMENT_GUIDE.md`.

## Cuentas compartidas

En un workspace BUSINESS, la pantalla `/accounts` muestra las mismas cuentas y saldos a todos sus
miembros activos. La interfaz continúa ocultando acciones de administración según el rol: STAFF y
VIEWER no reciben controles para crear, editar o eliminar cuentas.

No existe una configuración de acceso por cuenta en el MVP. Las restricciones individuales quedan
reservadas para una fase posterior.

## Invitaciones internas

`/invitations` sigue siendo la pantalla administrativa para OWNER y ADMIN de un workspace BUSINESS.
Al crear una invitación muestra una sola vez el email, el rol y el enlace completo de desarrollo con
un botón para copiarlo. Al cerrar el modal no intenta recuperar el token.

`/my-invitations` pertenece al usuario autenticado y usa la query key `['my-invitations']`. Presenta
el workspace, su tipo, el rol ofrecido, quién invitó y la fecha de vencimiento. Aceptar recarga las
invitaciones y los workspaces para actualizar el selector; rechazar pide confirmación. El menú de
usuario muestra un badge neutro con la cantidad pendiente sin bloquear el shell ni abrir modales
automáticos.

`/accept-invitation?token=...` continúa disponible para personas que reciben un enlace manual. Login
y registro conservan únicamente rutas de retorno internas, evitando redirecciones abiertas. El
backend sigue siendo la autoridad para comprobar que el email autenticado sea el invitado.

El frontend no incluye envío de email ni un centro genérico de notificaciones.
