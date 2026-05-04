## Why

El build productivo de la app pasa, pero deja warnings de CommonJS/AMD asociados a la cadena de generación PDF. Durante la exploración se verificó además un problema concreto y accionable: `html2canvas` sigue declarado e importado en `inventory.ts` aunque no aparece uso real del símbolo. Esto introduce ruido técnico en una parte sensible del sistema sin aportar valor funcional.

La intención de esta change NO es rediseñar la capa de PDFs ni migrar de motor. El sistema ya tiene layouts PDF mapeados y estabilizados, por lo que un reemplazo de `jspdf` sería una decisión desproporcionada para el problema actual.

## What Changes

- limpiar dependencias PDF muertas o no usadas, empezando por `html2canvas` si se confirma que no participa en ningún flujo real;
- limpiar imports asociados a esa cadena en los módulos afectados;
- conservar `jspdf` y `jspdf-autotable` en los flujos donde sí sostienen layouts existentes;
- volver a correr build para medir si el warning baja o se mantiene solo por dependencias realmente necesarias.

## Scope

### In scope
- `package.json`
- `src/app/pages/inventory/inventory.ts`
- validación de los módulos que generan PDFs en:
  - `src/app/services/sales/js-pdf-sale-receipt.renderer.ts`
  - `src/app/services/service-orders/service-order-documents.service.ts`
- verificación con `npm run build`

### Out of scope
- migrar de `jspdf` a otro motor PDF
- rediseñar layouts PDF existentes
- rehacer flujos de exportación funcionales
- optimizaciones de bundle no relacionadas a la cadena PDF

## Approach

Tomar una estrategia conservadora:

1. identificar y remover dependencias/imports PDF que no tengan uso real;
2. preservar intactos los flujos que hoy dependen de `jspdf` y `jspdf-autotable`;
3. verificar por build qué warnings desaparecen y cuáles quedan como deuda aceptada por compatibilidad con layouts existentes.

## Risks

- Puede existir algún flujo indirecto que todavía espere `html2canvas`, aunque no aparezca en el uso directo del archivo inspeccionado.
- La limpieza puede reducir warnings pero no eliminarlos del todo, porque parte de la cadena PDF seguirá viva por decisión deliberada del sistema.

## Rollback

Si la limpieza rompe algún flujo de exportación, se revierte la remoción de la dependencia/import correspondiente y se documenta que ese warning queda aceptado por uso real.
