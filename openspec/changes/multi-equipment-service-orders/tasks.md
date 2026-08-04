# Tasks: Órdenes de servicio con múltiples equipos (APP)

## Alcance del corte desplegable 2026-08-04

- El corte actual permite trabajar las órdenes sin facturación hasta su ejecución; la entrega seguirá dependiendo de cobertura económica `TOTAL` o `EXONERADO` informada por el API.
- Garantía, inbox centrado en cliente y el ajuste adicional de permisos quedan diferidos; sus tareas permanecen abiertas y no se consideran parte de este despliegue.
- Los refactors estructurales del wizard y del panel técnico se difieren para no introducir riesgo antes de publicar. El frontend ya consume el contrato agregado y no usa el endpoint batch retirado.

## 1. Contratos y servicios

- [ ] 1.1 RED: actualizar specs de modelos para cabecera, items, estados parciales y comerciales versionados.
- [x] 1.2 GREEN: introducir modelos tipados y adaptar servicios HTTP al contrato agregado.
- [x] 1.3 RED: cubrir que no se use `POST /service-orders/batch` ni wrappers comerciales legacy.
- [x] 1.4 GREEN: retirar el consumo de endpoints incompatibles cuando el backend agregado esté disponible.

## 2. Wizard agregado

- [x] 2.1 RED: cubrir técnico/tipo comunes, prioridad `Baja` por item y envío de una sola orden.
- [x] 2.2 GREEN: adaptar candidatos a `items[]` sin perder los cambios locales de orden de pasos.
- [x] 2.3 RED: cubrir borrador local v2, recuperación de varios items y rechazo seguro de drafts legacy.
- [x] 2.4 GREEN: migrar persistencia local y conservar el borrador ante errores del API.
- [ ] 2.5 REFACTOR: extraer estado/composición del wizard desde `reception-panel.ts` a una fachada testeable.

## 3. Recepción y PDF

- [ ] 3.1 RED: cubrir una cabecera con selector de equipos y estados parciales.
- [ ] 3.2 GREEN: adaptar listados, detalle modal, reasignación global y descarga de un PDF por orden.
- [x] 3.3 RED: cubrir cancelación y entrega dirigidas al item seleccionado.
- [x] 3.4 GREEN: implementar acciones y refresco focalizado de cabecera/items.

## 4. Panel técnico

- [ ] 4.1 RED: cubrir visibilidad de órdenes asignadas y navegación por items.
- [ ] 4.2 GREEN: adaptar listas y acciones técnicas a `serviceOrderItemId`.
- [x] 4.3 RED: cubrir diagnóstico/rediagnóstico por item y bloqueo de ejecución mientras exista una decisión pendiente.
- [ ] 4.4 GREEN: extraer diagnóstico y workflow de item del componente monolítico.

## 5. Comercial y descuentos

- [x] 5.1 RED: cubrir consolidado, item aceptado bloqueado y edición solo del item con cambios.
- [x] 5.2 GREEN: implementar compositor por item y resumen global.
- [x] 5.3 RED: cubrir captura manual de decisión, canal, actor y mensajes de error.
- [x] 5.4 GREEN: implementar modal de decisión para recepción, técnico y supervisor.
- [x] 5.5 RED: cubrir descuentos por línea, totales base/neto y autorización supervisada.
- [x] 5.6 GREEN: integrar selector de descuento sin recalcular snapshots aceptados.

## 6. Cancelación y entrega parcial

- [x] 6.1 RED: diferenciar cancelación inmediata, solicitada y resuelta.
- [x] 6.2 GREEN: implementar acciones preejecución y resolución supervisada postinicio.
- [x] 6.3 RED: cubrir progreso `n de m`, entrega por item y bloqueo económico global.
- [x] 6.4 GREEN: adaptar recepción, técnico y supervisor a estados parciales.

## 7. Garantía

- [ ] 7.1 RED: cubrir cero, una y varias coincidencias de serie.
- [ ] 7.2 GREEN: implementar búsqueda, selección y autocompletado no vinculante.
- [ ] 7.3 RED: cubrir advertencia informativa de plazo sin aprobar/rechazar automáticamente.

## 8. Inbox

- [ ] 8.1 RED: cubrir etiqueta `Órdenes recientes del cliente` y ausencia total de controles de vínculo.
- [ ] 8.2 GREEN: adaptar contexto por cliente y detalle modal multi-equipo.
- [ ] 8.3 RED: cubrir badge por usuario, marcado al abrir y refresco SSE focalizado.
- [ ] 8.4 GREEN: consumir recibos individuales preservando conversación y borrador de mensaje.

## 9. Supervisor y permisos visuales

- [ ] 9.1 RED: cubrir acciones visibles según permisos para reasignar, cotizar, descontar y resolver cancelaciones.
- [ ] 9.2 GREEN: alinear los tres paneles con las acciones backend sin hardcodear permisos contradictorios por rol.

## 10. Verificación

- [x] 10.1 Ejecutar specs focalizados después de cada corte RED/GREEN.
- [ ] 10.2 Ejecutar todos los tests, `npx tsc --noEmit -p tsconfig.app.json`, `npm run build` y `git diff --check`.
- [ ] 10.3 Comparar cada escenario del cambio con su prueba o evidencia y crear `verify-report.md`.
- [ ] 10.4 Ejecutar checklist E2E manual en español peruano; no marcar completo sin una ejecución real registrada.
