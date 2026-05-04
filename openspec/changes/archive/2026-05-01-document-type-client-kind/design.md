# Design: DocumentType client kind classification (APP)

## Technical Approach

El frontend va a capturar `DocumentType.kind` en la pantalla de administración de tipos de documento y va a consumirlo como fuente primaria en `document-types`, `clients` y `reception-panel`. La heurística legacy por nombre/dígitos se conserva solo como fallback transitorio cuando el catálogo aún no tenga `kind`.

## Architecture Decisions

### Decision: usar `DocumentType.kind` como fuente primaria
**Choice**: resolver PERSON/COMPANY desde el catálogo cargado.
**Alternatives considered**: seguir con heurística `RUC` / `11 dígitos`.
**Rationale**: evita duplicación, acoplamiento a nombres y reglas frágiles en múltiples pantallas.

### Decision: mantener fallback transitorio
**Choice**: si `documentType.kind` viene vacío, usar la inferencia legacy existente.
**Alternatives considered**: cortar el fallback de inmediato.
**Rationale**: permite rollout gradual mientras el backend/catálogo se completa.

### Decision: no introducir selector manual de kind en consumers
**Choice**: `clients` y `reception-panel` derivan el flujo desde el document type elegido.
**Alternatives considered**: dejar al usuario elegir kind aparte del docType.
**Rationale**: evita doble fuente de verdad y reduce inconsistencias.

## Data Flow

`document-types form` → `DocumentTypesApiService` → API catalog with `kind`

`selected documentType` → `DocumentType.kind` → `clients/reception-panel` flow selection

fallback only if:
`documentType.kind == null` → legacy inference by name/digits

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\models\document-types\document-types-request.ts` | Modify | Add `kind` to save/update contracts. |
| `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\models\document-types\document-types-response.ts` | Modify | Add `kind` to catalog responses. |
| `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\document-types\document-types.ts` | Modify | Add form control, payload mapping, edit hydration. |
| `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\document-types\document-types.html` | Modify | Render mandatory kind selector. |
| `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\document-types\document-types.spec.ts` | Modify | Cover create/edit kind behavior. |
| `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\clients\clients.ts` | Modify | Replace primary inference with `documentType.kind`. |
| `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\reception-panel\reception-panel.ts` | Modify | Replace primary inference with `documentType.kind`. |
| `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\clients\clients.spec.ts` | Modify | Verify company/person resolution from catalog kind. |
| `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\reception-panel\reception-panel.spec.ts` | Modify | Verify wizard resolution from catalog kind. |

## Interfaces / Contracts

```ts
export type DocumentTypeKind = 'PERSON' | 'COMPANY';

export interface DocumentTypeSaveRequest {
  name: string;
  digits: number;
  description: string;
  kind: DocumentTypeKind;
}

export interface DocumentTypeResponse {
  id: number;
  name: string;
  digits: number;
  description: string;
  kind?: DocumentTypeKind | null;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Form/payload mapping in `document-types` | Angular spec on component state and save payload |
| Unit | `clients` kind resolution | Existing component spec with classified vs legacy doc types |
| Unit | `reception-panel` kind resolution | Existing component spec with classified vs legacy doc types |

## Migration / Rollout

No UI migration required. Rollout is phased by contract:
1. APP supports `kind` capture and consumption.
2. If backend returns old rows without `kind`, APP uses fallback.
3. Fallback can be removed in a later change after backfill.

## Open Questions

- [ ] Si el catálogo ya tiene rows existentes, ¿el backend devolverá `null` temporalmente o habrá backfill inmediato?