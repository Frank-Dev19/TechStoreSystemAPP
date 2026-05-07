# Tasks: Inventory Operations Product Search

## Phase 1: Base de búsqueda remota

- [x] 1.1 Confirmar en `src/app/services/inventory/products.service.ts` que `listWithFilter()` consume `GET /inventory/catalogs/products` con `search`, `page` y `limit`, sin crear endpoint nuevo.
- [x] 1.2 Definir en `src/app/pages/inventory/inventory.ts` constantes/estado compartido para operaciones: debounce, mínimo de 2 caracteres, límite remoto, cache por query normalizada y control de requests activas.

## Phase 2: Lógica unificada de operaciones

- [x] 2.1 Implementar en `src/app/pages/inventory/inventory.ts` una rutina única de búsqueda para `entry`, `exit` y `adjustment` basada en `scheduleOperationProductSearch()` y `cancelOperationProductSearch()`.
- [x] 2.2 Normalizar la query antes de buscar, aplicar debounce y evitar llamadas remotas cuando la búsqueda tenga menos de 2 caracteres.
- [x] 2.3 Reutilizar resultados cacheados por query repetida entre operaciones y guardar productos en `productMap` para mantener el contexto compartido.
- [x] 2.4 Mantener fuera del cache el stock actual y, al seleccionar producto en cada operación, refrescarlo con `getCurrentStock(product.id)` antes de recalcular el contexto.

## Phase 3: Wiring de UI en Operaciones

- [x] 3.1 Ajustar `src/app/pages/inventory/inventory.html` para que los autocompletes de entrada, salida y ajuste reflejen estados remotos de carga, mínimo requerido y ausencia de resultados.
- [x] 3.2 Mantener sin cambios la UX de la pestaña Products y limitar el alcance visual a Operaciones.
- [x] 3.3 Usar copy de UI en español neutral para los estados del autocomplete: `Buscando...`, `Introduce al menos 2 caracteres` y `Sin resultados`.

## Phase 4: Verificación automatizada

- [x] 4.1 Cubrir en `src/app/pages/inventory/inventory.spec.ts` que entrada no consulta remoto con menos de 2 caracteres.
- [x] 4.2 Cubrir en `src/app/pages/inventory/inventory.spec.ts` el debounce y la reutilización del cache compartido entre `entry` y `exit`.
- [x] 4.3 Cubrir en `src/app/pages/inventory/inventory.spec.ts` que `exit` y `adjustment` refrescan stock con `getCurrentStock(product.id)` al seleccionar producto.
