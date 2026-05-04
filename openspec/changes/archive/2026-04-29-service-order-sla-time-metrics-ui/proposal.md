# Proposal: Service Order SLA Time Metrics UI

## Intent

Corregir el alcance del cambio para que la visibilidad SLA responda al rol real y para que el supervisor trabaje desde una vista centrada en órdenes. El técnico necesita solo resumen operativo; el supervisor necesita una vista única de órdenes con acuerdo, SLA, chat y detalle operativo.

## Scope

### In Scope
- Mantener en frontend el contrato `sla` y `timeMetrics` de `ServiceOrder`.
- Mostrar en técnico solo etapa actual, transcurrido, restante y brecha.
- Reemplazar `quotes` por `orders` en supervisor, con listado global, filtros, paginación, detalle operativo, acuerdo, SLA y acceso al chat.
- Mantener `inbox` solo como shortcut secundario si sigue aportando acceso rápido a conversaciones.

### Out of Scope
- Cambios de backend o nuevos endpoints.
- Rediseñar ranking o crear un módulo de chat independiente del flujo de órdenes.

## Capabilities

### New Capabilities
- `service-order-sla-time-metrics-ui`: visibilidad SLA por rol, con resumen operativo en técnico y supervisión global centrada en órdenes en supervisor.

### Modified Capabilities
- None.

## Approach

Reusar `ServiceOrderService.findAll()` con `technicianId` para técnico y sin ese filtro para supervisor. Ajustar la pestaña SLA del técnico para ocultar métricas derivadas no operativas y convertir el flujo principal del supervisor en una sección `orders` que consolide acuerdo, SLA, diagnóstico y acceso al chat de WhatsApp. `Inbox` puede sobrevivir como atajo de conversación, pero no como eje principal del panel.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/models/service-orders/service-order.ts` | Modified | Mantener contrato frontend alineado con SLA y métricas del backend |
| `src/app/pages/technician-panel/*` | Modified | Reducir la vista SLA al resumen operativo por rol |
| `src/app/pages/supervisor-panel/*` | Modified | Reemplazar `quotes` por `orders` y consolidar detalle operativo, acuerdo, SLA y acceso a chat |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Estado de paginación compartido en supervisor | Med | Separar estado específico para la sección `orders` |
| Filtros no soportados por backend | Med | Aplicar fallback de filtrado local controlado |
| Duplicidad entre `orders` e `inbox` | Med | Dejar `inbox` como shortcut ligero o retirarlo si duplica el flujo principal |

## Rollback Plan

Revertir el reemplazo de `quotes` por `orders`, restaurar el detalle actual basado en acuerdos y volver a la visualización completa de métricas derivadas en la pestaña SLA del técnico.

## Dependencies

- `ServiceOrderService.findAll()` debe seguir permitiendo consultas sin `technicianId`.

## Success Criteria

- [ ] El técnico ya no ve métricas derivadas irrelevantes o “No computable”.
- [ ] El supervisor puede revisar órdenes de todos los técnicos desde la sección `orders` con filtros y paginación.
- [ ] El detalle del supervisor concentra acuerdo, SLA, métricas derivadas y acceso al chat de la orden.
- [ ] `Inbox`, si permanece, funciona como shortcut y no duplica el flujo principal de supervisión.
