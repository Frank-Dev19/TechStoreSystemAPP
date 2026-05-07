# Proposal: technician-multiple-active-diagnoses

## Summary
Permitir que un técnico pueda iniciar y mantener varias órdenes distintas en estado `EN_DIAGNOSTICO` al mismo tiempo desde el panel técnico.

## Problem
Hoy el panel técnico bloquea la apertura de una segunda orden en diagnóstico cuando ya existe otra orden activa en `EN_DIAGNOSTICO` para ese técnico. La restricción vive en frontend y obliga a terminar una revisión antes de empezar otra, aunque el backend ya opera por orden y no impone exclusividad global del técnico.

## Scope
- Eliminar la restricción de una sola orden activa en diagnóstico por técnico en el panel técnico.
- Ajustar badges, acciones y tests del `technician-panel` para reflejar la nueva política.
- Mantener la regla existente de un solo diagnóstico `CURRENT` por orden.

## Non-Goals
- No cambiar el modelo de diagnósticos por orden.
- No introducir multitarea visual compleja ni edición simultánea de múltiples modales.
- No cambiar contratos backend salvo que durante implementación aparezca una validación oculta.

## Approach
- Quitar el bloqueo basado en `orderInDiagnosis` y `currentOrderInDiagnosisId` en `technician-panel.ts`.
- Revisar helpers/UI que asumen una única revisión activa.
- Actualizar specs del panel técnico para permitir múltiples órdenes en `EN_DIAGNOSTICO` para el mismo técnico.
- Verificar que backend sigue consistente con la política nueva.

## Risks
- La UI puede perder claridad si había copy o estados pensados para una sola revisión activa.
- Algunos tests actuales codifican la restricción vieja y deberán cambiarse.

## Affected Areas
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\technician-panel\technician-panel.ts`
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\technician-panel\technician-panel.html`
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\technician-panel\technician-panel.spec.ts`
