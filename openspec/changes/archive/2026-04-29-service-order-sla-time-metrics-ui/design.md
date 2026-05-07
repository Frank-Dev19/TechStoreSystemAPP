# Design: Service Order SLA Time Metrics UI

## Technical Approach

Mantener `ServiceOrder.sla` y `ServiceOrder.timeMetrics` como contrato compartido, pero cambiar el centro operativo por rol. En técnico, el tab `sla` conserva solo resumen operativo. En supervisor, `orders` reemplaza a `quotes` como flujo principal y concentra listado, filtros, paginación, detalle, acuerdo, SLA, diagnóstico y acceso al chat; `inbox` queda solo como shortcut opcional.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|----------|--------|-------------------------|-----------|
| Eje del supervisor | Reemplazar `quotes` por `orders` | Agregar `orders` como cuarta pestaña | El código actual concentra detalle en acuerdos; si `orders` fuera lateral, seguiría mandando el flujo equivocado |
| Chat supervisor | Integrarlo desde el detalle de orden y dejar `inbox` opcional | Mantener `inbox` como flujo principal separado | La supervisión debe partir de la orden completa, no de una conversación aislada |
| Datos de órdenes supervisor | Reusar `ServiceOrderService.findAll/findOne` | Derivar órdenes desde acuerdos | El servicio de órdenes ya entrega listado global y evita acoplar supervisión a acuerdos |
| SLA técnico | Ocultar métricas derivadas y mantener resumen | Eliminar tab SLA completo | El técnico sí necesita etapa, transcurrido, restante y brecha para operar |

## Data Flow

```text
TechnicianPanel
  CurrentUserService -> technicianId
  -> ServiceOrderService.findAll({ technicianId, page, limit })
  -> selectedServiceOrder
  -> SLA tab renders summary only

SupervisorPanel
  activeSection: ranking | inbox | orders
  -> ServiceOrderService.findAll({ page, limit, filters... })
  -> selectedOrder
  -> ServiceOrderService.findOne(id)
  -> AgreementService.findAll({ serviceOrderId })
  -> DiagnosisService.findAll({ serviceOrderId, status: CURRENT })
  -> direct chat shortcut from drawer
  -> inbox remains as secondary tab shortcut
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/app/pages/technician-panel/technician-panel.html` | Modify | Quitar cards de métricas derivadas del tab SLA y dejar solo resumen operativo |
| `src/app/pages/technician-panel/technician-panel.scss` | Modify | Limpiar estilos del grid de métricas derivadas si quedan sin uso |
| `src/app/pages/supervisor-panel/supervisor-panel.ts` | Modify | Cambiar `activeSection` para usar `orders` en lugar de `quotes`; separar estado, filtros, paginación y selección de órdenes |
| `src/app/pages/supervisor-panel/supervisor-panel.html` | Modify | Reemplazar la pestaña y layout de acuerdos por una vista `orders` con detalle operacional consolidado |
| `src/app/pages/supervisor-panel/supervisor-panel.scss` | Modify | Estilar la nueva composición `orders` manteniendo la paleta actual |
| `src/app/models/service-orders/service-order.ts` | Keep/Verify | Confirmar contrato SLA/métricas ya existente como base del cambio |

## Interfaces / Contracts

No se requieren endpoints nuevos. Se reutilizan:

```ts
findAll(params: Record<string, string | number | boolean | undefined>)
findOne(id: number): Observable<ServiceOrder>
```

En supervisor se debe introducir estado específico para órdenes:

```ts
type SupervisorSection = "ranking" | "inbox" | "orders"

interface SupervisorOrderFilters {
  searchTerm: string
  operativeStatus: string
  technicianId: number | null
  startDate: string
  endDate: string
}
```

Además, `selectedServiceOrderAgreement` deja de ser la llave principal del detalle y pasa a ser información derivada de la orden seleccionada.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Unit | Helpers de filtrado/paginación de `orders` en supervisor | Tests de métodos puros o getters del componente |
| Unit | Render condicional del SLA técnico sin métricas derivadas | Spec del componente validando DOM según `selectedServiceOrder` |
| Integration | Selección de orden supervisor y carga encadenada de detalle, acuerdo y diagnóstico | Mocks de `ServiceOrderService`, `ServiceOrderAgreementService` y `ServiceOrderDiagnosisService` |
| Integration | `inbox` como shortcut secundario | Validar que no altere el flujo principal de `orders` |

## Migration / Rollout

No migration required.

## Resolved Decisions

- En la primera iteración, `orders` expone **acceso directo al chat desde el drawer**.
- `inbox` se mantiene como **tab secundario** y shortcut de conversaciones, no como flujo principal.
