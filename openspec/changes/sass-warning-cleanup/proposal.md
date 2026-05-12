# Proposal: sass-warning-cleanup

## Intent
Reducir de forma segura los warnings deprecados de Sass que siguen apareciendo en tests y compilación del frontend, priorizando primero código propio del repo antes que dependencias de terceros.

## Scope

### In Scope
- Reemplazar usos locales de `darken()` / `lighten()` por `color.adjust()` o `color.scale()`.
- Migrar helpers propios que todavía usan funciones globales deprecated (`type-of`, `comparable`, `unquote`, `map-get`, etc.) a los módulos modernos de Sass.
- Evaluar la migración incremental de imports propios de `@import` a `@use`/`@forward` sin romper variables compartidas.
- Limpiar warnings pendientes en `technician-panel.scss`, `styles.scss` y `src/assets/sass/**` controlado por el repo.

### Out of Scope
- Parchear `node_modules` o forks de Bootstrap.
- Rediseñar estilos por estética.
- Cambiar el contrato funcional de pantallas.

## Capabilities

### Modified Capabilities
- `frontend-styles-foundation`: La base Sass del proyecto deja de depender de APIs deprecadas en código propio.
- `technician-panel-workflow`: El panel técnico conserva su UI actual pero sin warnings Sass propios evitables.

## Approach
Atacar primero warnings de archivos propios con cobertura de typecheck/tests ya existente. Donde `@use` requiera reestructurar dependencias Sass compartidas, hacerlo por capas para no romper el theme legacy ni la resolución de variables globales.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/styles.scss` | Modified | Entrada global Sass; revisar imports propios. |
| `src/assets/sass/abstracts/*.scss` | Modified | Helpers/functions legacy con APIs deprecadas. |
| `src/assets/sass/components/_button.scss` | Modified | Completar migración a módulos Sass modernos. |
| `src/app/pages/technician-panel/technician-panel.scss` | Modified | Reemplazar funciones de color deprecated restantes. |
| `src/app/pages/supervisor-panel/supervisor-panel.scss` | Optional | Revisar si quedaron warnings propios en esa pantalla. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Romper variables globales al migrar de `@import` a `@use` | Medium | Migración incremental, validando typecheck y specs después de cada bloque. |
| Mezclar deuda del theme legacy con estilos del repo | Medium | Cortar alcance en código propio primero y documentar lo tercero que quede. |

## Rollback Plan
Revertir el bloque puntual de estilos/helpers que introduzca regresión visual o de compilación.

## Dependencies
- Mantener verificaciones de Karma y `npx tsc --noEmit -p tsconfig.app.json` en verde.

## Success Criteria
- [ ] Los warnings Sass evitables del código propio se reducen de forma medible.
- [ ] `technician-panel.scss` deja de emitir warnings por `darken()` / `lighten()`.
- [ ] Los helpers Sass propios dejan de usar funciones globales deprecated críticas.
