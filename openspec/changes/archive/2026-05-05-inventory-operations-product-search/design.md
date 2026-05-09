# Design: Inventory Operations Product Search

## Technical Approach

La implementación de Operaciones reutiliza `ProductsService.listWithFilter()` contra `GET /inventory/catalogs/products` para reemplazar la dependencia de `/all` sin alterar la UX de Products. En `inventory.ts` se concentra una rutina compartida para entry, exit y adjustment que normaliza la query, exige mínimo 2 caracteres, aplica debounce con `timer(300)` y cachea resultados por query repetida. Al seleccionar un producto, cada flujo refresca stock y coste medio con `stockSvc.getCurrentStock(product.id)`, manteniendo fuera del cache cualquier dato volátil.

## Architecture Decisions

### Decision: Reutilizar el endpoint paginado existente

| Opción | Tradeoff | Decisión |
|---|---|---|
| Crear endpoint nuevo para autocomplete | Más superficie backend y mantenimiento | No |
| Reutilizar `GET /inventory/catalogs/products` con `search`, `page=1`, `limit=20` | Mantiene contrato existente y reduce cambios | Sí |

**Rationale**: cumple el objetivo real del cambio, evita tocar backend y conserva aislada la UX de la pestaña Products.

### Decision: Compartir lógica de búsqueda en el componente

| Opción | Tradeoff | Decisión |
|---|---|---|
| Tres implementaciones separadas | Duplica debounce, cache y control de concurrencia | No |
| Rutina común parametrizada por modo (`entry`/`exit`/`adjustment`) | Requiere helpers de estado por modo | Sí |

**Rationale**: garantiza simetría funcional entre operaciones y reduce divergencias futuras.

### Decision: Cachear solo resultados de búsqueda

| Opción | Tradeoff | Decisión |
|---|---|---|
| Cachear resultados y stock | Riesgo alto de mostrar stock obsoleto | No |
| Cachear solo productos por query normalizada | Evita llamadas repetidas sin comprometer stock actual | Sí |

**Rationale**: el catálogo es relativamente estable por query; el stock no lo es y debe recalcularse al seleccionar.

## Data Flow

```text
Input operación
  -> normalizeOperationProductSearchQuery()
  -> validación mínimo 2 caracteres
  -> cache Map<query, Product[]>
      -> hit: actualiza dropdown
      -> miss: timer(300) -> productsSvc.listWithFilter()
                   -> guarda resultados en cache y productMap
                   -> actualiza dropdown del modo activo
Selección de producto
  -> setea form + selectedProduct*
  -> stockSvc.getCurrentStock(product.id)
  -> refresca stock_qty / avg_cost
  -> ejecuta onProductChange* específico
```

El control `operationProductSearchRequestVersion` evita que respuestas antiguas pisen una búsqueda más reciente del mismo modo.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/app/pages/inventory/inventory.ts` | Modify | Centraliza búsqueda remota, debounce, mínimo 2 caracteres, cache por query y refresh de stock al seleccionar. |
| `src/app/pages/inventory/inventory.html` | Modify | Mantiene los tres autocompletes de Operaciones con estados de carga, mínimo de caracteres y sin cambios en Products. |
| `src/app/pages/inventory/inventory.spec.ts` | Modify | Verifica mínimo 2 caracteres, debounce, cache compartida entre modos y refresh de stock. |
| `src/app/services/inventory/products.service.ts` | Modify | Expone `listWithFilter()` paginado sobre el endpoint existente. |

## Interfaces / Contracts

```ts
type OperationProductSearchMode = 'entry' | 'exit' | 'adjustment';

productsSvc.listWithFilter({
  search: string,
  page: 1,
  limit: 20,
}): Observable<PaginatedResponse<Product>>
```

Textos de UI previstos para Operaciones: “Buscando…”, “Introduce al menos 2 caracteres” y “Sin resultados”. No se define ningún endpoint nuevo.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Normalización, mínimo de caracteres, cache y control por modo | Specs sobre `Inventory` con spies de `ProductsService` y `StockService` |
| Integration | Selección de producto y refresh de stock/coste medio | Tests del componente verificando `getCurrentStock(product.id)` |
| E2E | No requerido para este artifact | Cambio ya verificado PASS en implementación existente |

## Migration / Rollout

No migration required.

## Open Questions

- [ ] Ninguna bloqueante; el cambio ya está implementado y verificado PASS.
