# Proposal: Inventory Operations Product Search

## Intent

Eliminar la dependencia de `/inventory/catalogs/products/all` en la pestaña Operaciones de `/inventory` y usar la búsqueda remota paginada existente para reducir carga inicial y mantener resultados acotados sin cambiar la UX de Products.

## Scope

### In Scope
- Buscar productos de entrada, salida y ajuste con `GET /inventory/catalogs/products` (`listWithFilter`).
- Aplicar debounce, mínimo 2 caracteres y cache por query normalizada compartida entre operaciones.
- Mantener `getCurrentStock(product.id)` al seleccionar producto y conservar stock fuera del cache.

### Out of Scope
- Crear endpoints nuevos o cambiar contratos backend.
- Cambiar UX, filtros o comportamiento de la pestaña Products.

## Capabilities

### New Capabilities
- `inventory-operations-product-search`: búsqueda remota paginada de productos para operaciones con debounce, mínimo de caracteres y reutilización de resultados por query.

### Modified Capabilities
- None.

## Approach

Centralizar la búsqueda de productos de operaciones en `inventory.ts` con una rutina compartida por entry/exit/adjustment, cacheada por query normalizada, debounceada con timer RxJS y conectada al endpoint existente `listWithFilter`; al seleccionar, reconsultar stock actual con `getCurrentStock`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/pages/inventory/inventory.ts` | Modified | Unifica búsqueda remota, debounce, cache por query y selección con refresh de stock. |
| `src/app/pages/inventory/inventory.html` | Modified | Ajusta mensajes/estados del autocomplete de operaciones sin tocar Products. |
| `src/app/pages/inventory/inventory.spec.ts` | Modified | Cubre mínimo 2 caracteres, debounce, cache compartida y refresh de stock. |
| `src/app/services/inventory/products.service.ts` | Modified | Reutiliza `listWithFilter` paginado existente para búsqueda remota. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Respuestas viejas pisan búsquedas nuevas | Med | Versionado/cancelación por operación antes de aplicar resultados. |
| Stock desactualizado en resultados cacheados | Med | No cachear stock; recalcular con `getCurrentStock` al seleccionar. |

## Rollback Plan

Revertir `inventory.ts`, `inventory.html`, `inventory.spec.ts` y `products.service.ts` al flujo previo basado en lista completa para operaciones, sin tocar Products.

## Dependencies

- Endpoint existente `GET /inventory/catalogs/products` con `search`, `page` y `limit`.

## Success Criteria

- [ ] Operaciones usa búsqueda remota paginada sin depender de `/all`.
- [ ] Entry, exit y adjustment comparten debounce, mínimo 2 caracteres y cache por query repetida.
- [ ] El stock mostrado después de seleccionar proviene de `getCurrentStock(product.id)`.
