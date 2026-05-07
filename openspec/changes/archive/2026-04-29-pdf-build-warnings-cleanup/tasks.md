# Tasks: pdf-build-warnings-cleanup

## Phase 1: Verification of active PDF chain

- [x] 1.1 Confirmar en `src/app/pages/inventory/inventory.ts` si `html2canvas` está completamente sin uso y si puede eliminarse sin afectar exportaciones.
- [x] 1.2 Confirmar en `src/app/services/sales/js-pdf-sale-receipt.renderer.ts` que `jspdf` y `jspdf-autotable` siguen siendo dependencias activas y necesarias para los layouts existentes.
- [x] 1.3 Confirmar en `src/app/services/service-orders/service-order-documents.service.ts` que `jspdf` y `jspdf-autotable` siguen siendo dependencias activas y necesarias para los documentos de órdenes.

## Phase 2: Cleanup implementation

- [x] 2.1 Remover de `src/app/pages/inventory/inventory.ts` los imports PDF verificados como muertos.
- [x] 2.2 Remover de `package.json` cualquier dependencia PDF que quede sin consumidores reales después de la limpieza.
- [x] 2.3 Revisar si hay tipos o paquetes asociados (por ejemplo `@types/html2canvas`) que también deban eliminarse para mantener consistencia.

## Phase 3: Regression and build verification

- [x] 3.1 Verificar que los flujos de generación PDF de inventario, ventas y órdenes de servicio sigan disponibles después de la cleanup.
- [x] 3.2 Ejecutar `npm run build` y comparar el warning surface antes y después del cambio.
- [x] 3.3 Documentar en el verify qué warnings desaparecieron y cuáles permanecen por dependencias aún necesarias.
