# Tasks: rediagnosis-agreement-versioning

## Phase 1: Modelos y estado derivado

- [x] 1.1 RED `src/app/pages/technician-panel/technician-panel.spec.ts`: cubrir apertura de rediagnóstico mostrando la última versión activa sólo cuando la orden ya tuvo acuerdo confirmado y llegó a ejecución.
- [x] 1.2 Modificar `src/app/models/service-orders/service-agreement.ts`, `service-agreement-request.ts` y `src/app/services/service-orders/service-agreement.service.ts` para alinear `derivedFromAgreementId`, `provenance`, permisos, `baseAgreementId`, `technicalServiceAmount` y `newProducts`.
- [x] 1.3 Modificar `src/app/pages/technician-panel/technician-panel.ts` para separar estado en “Acuerdo anterior heredado”, excepción editable de servicio técnico y “Nuevos agregados”.

## Phase 2: Flujo UI y contrato delta

- [x] 2.1 GREEN `src/app/pages/technician-panel/technician-panel.ts`: hidratar la base heredada desde la versión activa, conservar notas como texto propio de la nueva versión y evitar modo derivado fuera del caso válido.
- [x] 2.2 RED `src/app/pages/technician-panel/technician-panel.spec.ts`: bloquear edición/eliminación de heredadas no técnicas y permitir sólo editar monto en la línea heredada de servicio técnico.
- [x] 2.3 GREEN `src/app/pages/technician-panel/technician-panel.ts` y `technician-panel.html`: ocultar acciones prohibidas, dejar monto editable sólo en servicio técnico heredado y renderizar separados heredado vs agregados nuevos.
- [x] 2.4 RED `src/app/pages/technician-panel/technician-panel.spec.ts`: verificar que el submit envía sólo `baseAgreementId`, `technicalServiceAmount`, `notes` y `newProducts`, sin mutaciones libres de heredadas.
- [x] 2.5 GREEN `src/app/pages/technician-panel/technician-panel.ts` y `src/app/services/service-orders/service-agreement.service.ts`: enviar payload delta y refrescar historial mostrando que la nueva versión reemplaza la anterior.

## Phase 3: Presentación y verificación

- [x] 3.1 Modificar `src/app/pages/technician-panel/technician-panel.scss` y `technician-panel.html` para resaltar readonly heredado, título “Acuerdo anterior heredado”, bloque “Nuevos agregados” y banner de reemplazo.
- [x] 3.2 REFACTOR `src/app/pages/technician-panel/technician-panel.ts` y `technician-panel.spec.ts` para consolidar helpers de permisos/render y cubrir los escenarios del spec de continuidad y confirmación.
