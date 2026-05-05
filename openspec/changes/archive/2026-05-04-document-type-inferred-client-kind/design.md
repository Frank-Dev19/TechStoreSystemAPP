# Design: document-type-inferred-client-kind

## Technical Approach

Eliminar el toggle manual de `clientKind` (Persona/Empresa) del wizard, ya que la inferencia automática desde `documentType.kind` ya está implementada en `onDocumentTypeChange()`. El formulario mantiene el campo `clientKind` (necesario para lógica interna), pero la UI ya no permite cambiarlo manualmente. Opcionalmente se muestra un badge no-interactivo con el tipo inferido.

## Architecture Decisions

### Decision: Mantener campo `clientKind` en el formulario

**Choice**: Conservar `clientKind` como `FormControl` pero ocultar el toggle UI
**Alternatives considered**: Eliminar el control del formulario y usar variable interna
**Rationale**: El campo `clientKind` se usa en múltiples lugares (`submitCreateServiceOrder`, `applyPartnerData`, `setCustomerFieldsEnabled`). Removerlo requeriría refactor masivo innecesario. Solo necesitamos ocultar el toggle.

### Decision: No requerir `clientKind` en el formulario para inferencia

**Choice**: La inferencia ocurre en `onDocumentTypeChange()` usando el `kind` del documento seleccionado
**Alternatives considered**: Forzar selección manual cuando el documento no tiene `kind`
**Rationale**: El fallback ya existe (línea 868): si no hay `kind`, usa heurística de dígitos (`expectedDocumentDigits >= 11 → COMPANY`). Mostrar un toggle manual rompe el flujo de la recepcionista.

## Data Flow

```
User selects document type
        │
        ▼
onDocumentTypeChange()
        │
        ├─ Find documentType by ID
        ├─ Read documentType.kind (PERSON/COMPANY)
        ├─ Fallback: digits >= 11 → COMPANY, else PERSON
        └─ Patch form: clientKind = inferredKind
                │
                ▼
  UI renders company fields (companyName, companyTradeName)
  based on clientKind === COMPANY
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/app/pages/reception-panel/reception-panel.html` | Modify | Remover div `.client-kind-toggle` (líneas 792-814). Opcionalmente agregar badge no-interactivo que muestre el kind inferido. |
| `src/app/pages/reception-panel/reception-panel.ts` | Modify | Eliminar `clientKind` del formGroup inicial (línea 361) o dejarlo pero asegurar que no haya forma de cambiarlo manualmente. Verificar que `onDocumentTypeChange()` siga funcionando. |
| `src/app/pages/reception-panel/reception-panel.spec.ts` | Modify | Eliminar tests que validen el toggle manual. Agregar tests que validen que `clientKind` se infiere automáticamente al cambiar `documentTypeId`. |

## Interfaces / Contracts

No hay cambios en interfaces o contratos. El modelo `ClientKind` se mantiene igual:
```typescript
export enum ClientKind {
  PERSON = "PERSON",
  COMPANY = "COMPANY"
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (Karma/Jasmine) | `onDocumentTypeChange()` infers PERSON when `documentType.kind === PERSON` | Set `documentTypeId`, spy on `documentTypes.find()`, call `onDocumentTypeChange()`, expect `clientKind` patched |
| Unit (Karma/Jasmine) | `onDocumentTypeChange()` infers COMPANY when `documentType.kind === COMPANY` | Same approach with COMPANY kind |
| Unit (Karma/Jasmine) | UI does NOT render toggle buttons | Test that `.client-kind-toggle` is not present in the DOM |
| Unit (Karma/Jasmine) | Company fields show/hide based on inferred kind | Set `clientKind` to COMPANY, expect company fields visible |

## Migration / Rollout

No migration required. El cambio es puramente de UI y no afecta datos ni API.

## Open Questions

- [ ] ¿Mostrar un badge/no-interactive indicator del kind inferido? (El delta spec dice "MAY display")
- [ ] ¿Qué hacer si el usuario selecciona un tipo de documento, se infiere COMPANY, y luego cambia a otro tipo que es PERSON? (La lógica actual sobrescribe `clientKind`, está bien)
