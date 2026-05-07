# Design: pdf-build-warnings-cleanup

## Technical Approach

Aplicar una limpieza conservadora sobre la cadena PDF actual, sin cambiar el motor que hoy sostiene layouts ya estabilizados. La intervención se limita a:

1. detectar imports y dependencias PDF realmente muertos;
2. removerlos solo si no participan en ningún flujo real;
3. preservar `jspdf` y `jspdf-autotable` en los módulos donde hoy modelan documentos productivos;
4. usar `npm run build` como verificación objetiva del impacto sobre los warnings.

La intención NO es “modernizar toda la capa PDF”, sino reducir ruido técnico verificable sin romper salidas documentales existentes.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|----------|--------|-------------------------|-----------|
| Motor PDF principal | Mantener `jspdf` y `jspdf-autotable` | Migrar a otro motor ESM-first | Los módulos ya tienen layouts mapeados y estabilizados; reemplazar el motor elevaría riesgo sin relación directa con esta cleanup |
| Dependencias no usadas | Eliminar solo las verificadas como muertas | Dejar todo intacto | La cleanup debe atacar deuda real y medible, no solo documentar warnings |
| Validación del cambio | Build productivo + verificación puntual de flujos afectados | Solo inspección estática | El objetivo del cambio es justamente el warning surface del build |
| Alcance sobre PDFs | No rediseñar layouts | Rehacer documentos para “aprovechar” la cleanup | Mezclar cleanup técnica con rediseño documental rompería scope y trazabilidad |

## Data / Dependency Flow

```text
package.json
  -> html2canvas
  -> jspdf
  -> jspdf-autotable

inventory.ts
  -> imports PDF helpers
  -> exportReviewToPdf()
  -> exportReviewToExcel()

sales renderer
  -> jspdf
  -> jspdf-autotable
  -> sale receipt PDFs

service-order documents
  -> jspdf
  -> jspdf-autotable
  -> order summary / sticker PDFs

build (ng build)
  -> resolves dependency graph
  -> reports CommonJS/AMD warnings from active PDF chain
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Remover dependencias PDF muertas si se confirma que ningún flujo activo las necesita |
| `src/app/pages/inventory/inventory.ts` | Modify | Eliminar imports muertos o dependencias no utilizadas relacionadas a PDF |
| `src/app/services/sales/js-pdf-sale-receipt.renderer.ts` | Verify / Minimal modify | Confirmar que sigue usando `jspdf` por necesidad real; tocar solo si aparece import redundante |
| `src/app/services/service-orders/service-order-documents.service.ts` | Verify / Minimal modify | Confirmar uso real de `jspdf`/`jspdf-autotable` y evitar cambios de layout |
| `openspec/changes/pdf-build-warnings-cleanup/verify-report.md` | Future update | Registrar impacto real de la cleanup sobre los warnings del build |

## Verification Strategy

### Static verification
- Confirmar si `html2canvas` tiene cero usos reales.
- Confirmar que `jspdf` y `jspdf-autotable` sí están anclados a flujos documentales activos.

### Runtime / build verification
- Ejecutar `npm run build`.
- Comparar warnings antes y después.
- Clasificar:
  - warnings eliminados por dependencia muerta removida;
  - warnings remanentes por dependencias necesarias y aceptadas.

### Functional regression check
- Verificar al menos los puntos donde se generan:
  - PDF de revisión de inventario
  - PDF de comprobantes/ventas
  - PDF de documentos de órdenes de servicio

No hace falta rediseño visual del documento; solo asegurar que el flujo siga operativo.

## Risks

- Un import aparentemente muerto puede seguir siendo necesario en un flujo no cubierto visualmente.
- La cleanup puede bajar parcialmente los warnings, pero no llevarlos a cero si `jspdf` mantiene dependencias transitivas CommonJS.
- Tocar servicios PDF compartidos puede impactar módulos que no estaban en el radar si se elimina una dependencia sin verificación suficiente.

## Rollout / Rollback

### Rollout
1. remover dependencia/import muerto más evidente;
2. correr build;
3. verificar que no se rompieron los flujos PDF afectados;
4. documentar resultado en verify.

### Rollback
Si un flujo PDF deja de funcionar:
- restaurar import/dependencia removida;
- dejar documentado que ese warning corresponde a una dependencia activa y todavía necesaria.
