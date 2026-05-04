# Tasks: Service Order SLA Time Metrics UI

## Phase 1: Foundation

- [x] 1.1 Actualizar `src/app/pages/supervisor-panel/supervisor-panel.ts` para reemplazar `quotes` por `orders` en `activeSection` y separar estado de filtros, paginación y selección por órdenes.
- [x] 1.2 Añadir en `src/app/pages/supervisor-panel/supervisor-panel.ts` la carga global de órdenes con `ServiceOrderService.findAll()` y la carga derivada de acuerdo/diagnóstico por `serviceOrderId`.
- [x] 1.3 Verificar en `src/app/models/service-orders/service-order.ts` que el contrato `sla/timeMetrics` cubra todo lo requerido y ajustar solo si aparece un faltante real.

## Phase 2: Core Implementation

- [x] 2.1 Modificar `src/app/pages/technician-panel/technician-panel.html` para que el tab `sla` renderice solo etapa actual, transcurrido, restante y brecha.
- [x] 2.2 Limpiar en `src/app/pages/technician-panel/technician-panel.scss` los estilos del grid de métricas derivadas que queden sin uso en técnico.
- [x] 2.3 Reemplazar en `src/app/pages/supervisor-panel/supervisor-panel.html` la vista `quotes` por una vista `orders` con listado global, filtros, paginación y selección.
- [x] 2.4 Construir en `src/app/pages/supervisor-panel/supervisor-panel.html` el detalle de orden consolidado con datos operativos, acuerdo relacionado, SLA completo, métricas derivadas y contexto de diagnóstico.
- [x] 2.5 Integrar en `src/app/pages/supervisor-panel/supervisor-panel.html` el acceso al chat desde el detalle de orden y decidir si `inbox` queda como shortcut explícito.

## Phase 3: Integration and Styling

- [x] 3.1 Ajustar `src/app/pages/supervisor-panel/supervisor-panel.ts` para que la selección de orden gobierne el detalle y `selectedServiceOrderAgreement` pase a ser información derivada.
- [x] 3.2 Actualizar `src/app/pages/supervisor-panel/supervisor-panel.scss` para soportar la composición `orders` respetando la paleta y jerarquía visual actuales.
- [x] 3.3 Revisar `src/app/pages/supervisor-panel/supervisor-panel.html` y `.ts` para que `inbox`, si permanece, funcione como shortcut y no como flujo principal duplicado.

## Phase 4: Testing

- [x] 4.1 Escribir prueba RED del panel técnico que falle si el tab `sla` sigue renderizando métricas derivadas.
- [x] 4.2 Escribir prueba RED del supervisor que falle si `orders` no reemplaza a `quotes` como flujo principal o si el detalle no muestra SLA completo.
- [x] 4.3 Implementar GREEN/REFACTOR de las pruebas anteriores con Karma + Jasmine y verificar escenarios de filtros, selección de orden y chat secundario.
