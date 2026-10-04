# Personalización visual

## Colores y forma general

La paleta central está en `apps/web/src/app/globals.css`, dentro de `:root`. Cambie ahí:

- `--primary` y `--primary-hover`: acciones, enlaces y foco;
- `--background`, `--surface`, `--surface-muted`, `--border`: fondos y contenedores;
- `--text` y `--text-muted`: tipografía;
- `--success`, `--danger`, `--warning`: estados e importes;
- `--sidebar` y `--sidebar-muted`: navegación lateral;
- `--chart-1` a `--chart-6`: categorías de gráficos;
- `--radius` y `--shadow`: redondeo y profundidad.

Los componentes y gráficos consumen esas variables; no se necesitan variables de entorno para el
tema porque los colores no son secretos ni configuración operativa. Algunos tonos secundarios de
estados permanecen en el mismo `globals.css`, junto a `.badge`, `.notice`, `.auth-context` y otras
clases, para que toda la apariencia continúe localizada en un archivo.

## Nombre, textos e icono

- Título y descripción HTML: `apps/web/src/app/layout.tsx`.
- Icono/favicone: `apps/web/src/app/icon.svg`.
- Marca del shell: `apps/web/src/components/layout/app-shell.tsx`.
- Marca de login/registro: `apps/web/src/components/auth/auth-form.tsx`.
- Marca del flujo por token: `apps/web/src/components/auth/accept-invitation.tsx`.

Actualmente la marca visual es la letra `F` y el texto `Finance`. Si se incorpora un logotipo, guarde
el SVG en `apps/web/src/app` o en `apps/web/public` y mantenga texto accesible para lectores de
pantalla.

## Validación después de cambiar el tema

```powershell
pnpm --filter @finance/web lint
pnpm --filter @finance/web typecheck
pnpm --filter @finance/web test
pnpm --filter @finance/web build
pnpm --filter @finance/web test:visual
```

Revise contraste, estados hover/focus, desktop y mobile antes de publicar.
