# Design: technician-multiple-active-diagnoses

## Summary
El cambio elimina la política de exclusividad global de diagnóstico en el panel técnico. La capacidad de múltiples diagnósticos activos se resolverá quitando el estado derivado que hoy modela una única revisión activa por técnico, manteniendo intacta la lógica de historial y registro de diagnósticos por orden.

## Current Design
Hoy `technician-panel.ts` deriva:
- `orderInDiagnosis: boolean`
- `currentOrderInDiagnosisId: number | null`

Luego `startDiagnosis(order)` bloquea una segunda orden cuando ya existe otra con `EN_DIAGNOSTICO`.

Esta política no nace del backend de workflow ni del módulo de diagnósticos por orden; es una decisión de UI/orquestación local del panel técnico.

## Target Design
### 1. Remove global active-diagnosis guard
Eliminar:
- la semántica de `orderInDiagnosis`
- la semántica de `currentOrderInDiagnosisId`
- el warning de concurrencia en `startDiagnosis(order)`

### 2. Keep diagnosis status grouping by order
Se mantiene:
- `diagnosisOrders = orders.filter(order => order.technicalStatus === EN_DIAGNOSTICO)`
- la capacidad de listar múltiples órdenes en la pestaña de diagnóstico
- la carga de historial por orden seleccionada

### 3. Preserve per-order diagnosis history behavior
No cambia:
- `ServiceOrderDiagnosisService`
- historial de diagnósticos por orden
- política de un único diagnóstico `CURRENT` por orden

## Affected Files
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\technician-panel\technician-panel.ts`
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\technician-panel\technician-panel.html`
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\technician-panel\technician-panel.spec.ts`

## Testing Strategy
- actualizar tests del panel técnico que hoy esperan una única orden activa en diagnóstico
- agregar/ajustar escenario donde dos órdenes distintas pueden pasar a `EN_DIAGNOSTICO`
- verificar que la lista de la pestaña diagnóstico muestre múltiples órdenes

## Risks
- algunos mensajes o badges podrían seguir comunicando una sola revisión activa si no se revisan completamente
- tests previos pueden enmascarar la política vieja si no se actualizan todos los assertions relevantes

## Open Questions
- Ninguna crítica por ahora; backend no requiere cambio salvo que aparezca una validación no detectada durante apply.
