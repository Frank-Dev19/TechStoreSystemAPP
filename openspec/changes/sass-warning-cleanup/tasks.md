# Tasks: sass-warning-cleanup

## Phase 1: Relevamiento y red local

- [x] 1.1 Catalogar warnings actuales por archivo propio vs tercero durante `npm test -- --watch=false`.
- [x] 1.2 RED `src/app/pages/technician-panel/technician-panel.scss`: reemplazar `lighten()` / `darken()` pendientes por `color.adjust()` o `color.scale()`.
- [x] 1.3 RED `src/assets/sass/components/_button.scss`: completar reemplazo de `map-get` y otras globals pendientes por módulos Sass.

## Phase 2: Helpers y entrypoint global

- [x] 2.1 Modificar `src/assets/sass/abstracts/_functions.scss` para migrar `type-of`, `comparable` y `unquote` a módulos modernos (`meta`, `math`, `string`).
- [x] 2.2 Ajustar `src/styles.scss` y parciales propios para una migración incremental de `@import` a `@use`/`@forward` donde sea seguro.
- [x] 2.3 Verificar que variables/mixins compartidos sigan resolviendo sin romper el theme legacy.

## Phase 3: Verificación y corte de alcance

- [x] 3.1 Correr `npx tsc --noEmit -p tsconfig.app.json`.
- [x] 3.2 Correr los specs afectados (`technician-panel.spec.ts` y cualquier pantalla tocada).
- [x] 3.3 Documentar qué warnings restantes pertenecen a terceros o requieren una migración Sass más profunda.

## Notes

- En la verificación ampliada con `phone.util`, `clients`, `reception-panel` y `technician-panel` no aparecieron warnings Sass visibles en la salida.
