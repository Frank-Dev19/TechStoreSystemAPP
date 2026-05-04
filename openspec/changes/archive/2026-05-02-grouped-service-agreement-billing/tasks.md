# Tasks: grouped-service-agreement-billing

## Phase 1 — Frontend Contracts
- [x] 1.1 Adaptar modelos/DTOs de ventas para soportar facturación agrupada por acuerdos.
- [x] 1.2 Modelar payload de contribuyente fiscal separado del cliente operativo.

## Phase 2 — Ventas UI
- [x] 2.1 Agregar modo de facturación agrupada en `ventas`.
- [x] 2.2 Permitir selección múltiple de acuerdos pendientes del mismo cliente operativo.
- [x] 2.3 Mostrar preview con una línea por acuerdo: `Servicio técnico - Orden SO...`.
- [x] 2.4 Capturar tipo de comprobante (`BOLETA`/`FACTURA`).
- [x] 2.5 Resolver contribuyente fiscal existente o alta mínima inline.
- [x] 2.6 Bloquear combinaciones inválidas y acuerdos parciales.

## Phase 3 — Technician/Delivery UX Consistency
- [x] 3.1 Reflejar correctamente en la UI qué órdenes del grupo quedaron liberadas para entrega.
- [x] 3.2 Evitar ambigüedad visual entre acuerdos pagados del grupo y acuerdos aún pendientes.

## Phase 4 — Frontend Tests
- [x] 4.1 Agregar/ajustar specs focalizados para multiselección de acuerdos.
- [x] 4.2 Agregar/ajustar specs para elección de comprobante y contribuyente fiscal.
- [x] 4.3 Agregar/ajustar specs de reglas visuales de órdenes liberadas vs pendientes.

## Phase 5 — Verification
- [x] 5.1 Ejecutar type-check focalizado.
- [x] 5.2 Ejecutar specs focalizados de ventas y flujos afectados.
- [x] 5.3 Actualizar apply-progress y artifacts de verificación.

