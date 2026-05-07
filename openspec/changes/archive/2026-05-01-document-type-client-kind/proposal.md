# Proposal: DocumentType client kind classification

## Intent

Eliminar la heurística actual (`RUC` / `11 dígitos`) para distinguir cliente natural vs empresa y volver `DocumentType.kind` la fuente de verdad para los flujos que dependen de `Client.kind`.

## Scope

### In Scope
- Agregar `kind = PERSON | COMPANY` a `document_types` en backend y frontend.
- Hacer obligatorio el selector de `kind` en crear/editar tipos de documento.
- Actualizar `clients` y `reception-panel` para usar `documentType.kind`, con fallback transitorio si falta en datos viejos.

### Out of Scope
- Rediseño visual amplio de `document-types`.
- Quitar en este mismo cambio TODO fallback legacy si aún hay catálogos sin migrar.

## Capabilities

### New Capabilities
- `document-types-classification`: administra y expone la clasificación `PERSON | COMPANY` en tipos de documento.

### Modified Capabilities
- `client-company-contacts`: los flujos empresa/persona pasan a depender de `documentType.kind` como fuente principal.
- `clients-management-ui`: el alta/edición de clientes usa la clasificación explícita del tipo de documento.
- `reception-wizard-ui`: el wizard resuelve el flujo PERSON/COMPANY desde el catálogo, no desde heurísticas por nombre/dígitos.

## Approach

Agregar `kind` al catálogo de tipos de documento, propagar el contrato API/UI, exigir su captura en la pantalla de `document-types`, y reemplazar la inferencia por nombre/dígitos por lectura de `documentType.kind` con fallback temporal controlado.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `TechStoreSystemAPI/src/catalogs/document-types/**` | Modified | Entidad, DTOs, service, tests |
| `TechStoreSystemAPP/src/app/pages/document-types/**` | Modified | Form, modal y validaciones |
| `TechStoreSystemAPP/src/app/models/document-types/**` | Modified | Request/response contracts |
| `TechStoreSystemAPP/src/app/pages/clients/clients.ts` | Modified | Reemplazo de inferencia legacy |
| `TechStoreSystemAPP/src/app/pages/reception-panel/reception-panel.ts` | Modified | Reemplazo de inferencia legacy |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Tipos existentes sin `kind` | High | Fallback temporal + migración/backfill |
| Romper flujos empresa/persona | Med | Tests focalizados en clients y recepción |
| Datos inconsistentes entre catálogo y cliente | Med | Validar create/update y usar catálogo como fuente principal |

## Rollback Plan

Revertir contratos/UI de `document-types` y restaurar la inferencia legacy por nombre/dígitos en `clients` y `reception-panel`.

## Dependencies

- Catálogo actual de `document_types` necesita backfill o estrategia transitoria.

## Success Criteria

- [ ] Crear/editar `document-types` obliga seleccionar `PERSON` o `COMPANY`.
- [ ] `clients` y `reception-panel` usan `documentType.kind` como fuente principal.
- [ ] El fallback legacy queda solo como transición documentada para datos viejos.