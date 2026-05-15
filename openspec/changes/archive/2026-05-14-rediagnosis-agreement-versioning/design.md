# Design: rediagnosis-agreement-versioning

## Technical Approach
El technician panel dejará de tratar el acuerdo como snapshot libre editable. Al abrir un rediagnóstico, cargará el acuerdo activo como base heredada, separará visualmente líneas heredadas vs nuevas y enviará un payload delta-compatible con API. La UI mantendrá editable sólo la línea heredada de servicio técnico, permitirá agregar productos nuevos y explicará que confirmar la versión nueva reemplaza la anterior.

## Architecture Decisions

### Decision: split composer state by intent
**Choice**: reemplazar `agreementItems` plano por estado con `inheritedItems`, `editableTechnicalService`, `newItems`.
**Alternatives considered**: mantener array único con muchos `if` por fila.
**Rationale**: el modal actual hidrata todo como editable; separar estado reduce errores de borrado/edición accidental.

### Decision: API-driven permissions
**Choice**: extender modelos con metadata (`provenance`, `canEdit`, `canDelete`, `derivedFromAgreementId`).
**Alternatives considered**: inferir reglas desde status o código de servicio.
**Rationale**: el frontend muestra reglas; no las inventa.

### Decision: explicit replacement messaging
**Choice**: banner y copy de confirmación indicando “esta versión reemplaza el acuerdo activo”.
**Alternatives considered**: confiar sólo en historial/status badge.
**Rationale**: el cambio de versión ocurre al confirmar; si no se comunica, la UX queda ambigua.

## Data Flow

```text
openAgreementModal()
  -> GET agreements
  -> elegir draft o confirmed activo
  -> si no hay draft y hay rediagnóstico: crear modo derivado desde baseAgreementId
  -> render inherited locked block + editable technical service + new products block
  -> submit delta payload
  -> confirm -> refresh history showing previous version as replaced
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/app/models/service-orders/service-agreement.ts` | Modify | Metadata de versión/procedencia/permisos. |
| `src/app/models/service-orders/service-agreement-request.ts` | Modify | Payload delta con `baseAgreementId` y `newProducts`. |
| `src/app/services/service-orders/service-agreement.service.ts` | Modify | Tipos de request/response alineados con API. |
| `src/app/pages/technician-panel/technician-panel.ts` | Modify | Estado derivado, hidratación y submit controlado. |
| `src/app/pages/technician-panel/technician-panel.html` | Modify | Bloques heredado/nuevo + affordances readonly. |
| `src/app/pages/technician-panel/technician-panel.scss` | Modify | Estilos de línea heredada, excepción editable y banner de reemplazo. |
| `src/app/pages/technician-panel/technician-panel.spec.ts` | Modify | Casos de continuidad, bloqueo y submit delta. |

## Interfaces / Contracts

```ts
interface AgreementLineUiMeta {
  provenance: 'INHERITED' | 'NEW'
  canEdit: boolean
  canDelete: boolean
  derivedFromItemId?: number | null
}

interface ServiceOrderAgreementRequest {
  serviceOrderId?: number
  diagnosisId?: number
  baseAgreementId?: number
  notes?: string
  technicalServiceAmount?: number
  newProducts?: ServiceOrderAgreementProductRequest[]
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Hidratación separa heredado/nuevo | `technician-panel.spec.ts` |
| Unit | UI bloquea borrar/editar heredados no técnicos | spec sobre handlers + template state |
| Unit | Submit envía sólo delta permitido | assert de `agreementService.create/update` |
| Component | Mensaje de reemplazo al confirmar | render del modal en modo derivado |

## Migration / Rollout

Sin migración frontend. Requiere compatibilidad con el nuevo contrato API antes de habilitar el modo derivado. Si la metadata no llega, el modal debe seguir en modo sólo lectura para evitar inferencias incorrectas.

## Open Questions

- [ ] ¿El draft derivado se crea apenas se abre el modal o recién en el primer guardar/confirmar?
- [ ] ¿Las notas del acuerdo deben mostrarse como heredadas con indicación visual o basta tratarlas como texto editable de la nueva versión?
