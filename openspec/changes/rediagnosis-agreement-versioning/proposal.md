# Proposal: rediagnosis-agreement-versioning

## Intent
Cuando coordinación genera un nuevo acuerdo después de un rediagnóstico, la UI debe mostrar continuidad real con el acuerdo anterior. El operador tiene que ver qué se hereda, qué queda bloqueado y qué puede cambiar sin romper historial.

## Scope

### In Scope
- Precargar el composer con la versión anterior como base heredada.
- Mostrar líneas heredadas como solo lectura y no eliminables.
- Permitir agregar sólo líneas nuevas y dejar editable únicamente la línea heredada de servicio técnico.
- Reflejar en el flujo del panel técnico que la nueva versión reemplaza a la anterior al confirmarse y consumir el contrato coordinado con la API.

### Out of Scope
- Rediseño visual amplio del modal fuera de los estados necesarios para heredado/bloqueado.
- Cambios en ventas u otras pantallas que no crean el acuerdo derivado.

## Capabilities

### New Capabilities
- `rediagnosis-agreement-versioning`: Experiencia UI para acuerdos derivados por rediagnóstico con líneas heredadas bloqueadas y delta explícito.

### Modified Capabilities
- `technician-panel-workflow`: El panel/coordinación debe soportar la edición controlada de una nueva versión derivada del acuerdo anterior.

## Approach
Adoptar un composer híbrido: la APP renderiza snapshot heredado + espacio para agregados nuevos usando metadata entregada por la API. Las líneas heredadas se muestran bloqueadas, con affordances claras de solo lectura; la línea de servicio técnico se expone como única excepción editable. El submit dejará de mandar un acuerdo “libre” completo y pasará a respetar el contrato derivado/delta acordado con backend.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/pages/technician-panel/technician-panel.ts` | Modified | Hidratar modo derivado y submit coordinado con API. |
| `src/app/pages/technician-panel/technician-panel.html` | Modified | Estados bloqueados/heredados y zona de nuevas líneas. |
| `src/app/pages/technician-panel/technician-panel.scss` | Modified | Soporte visual para solo lectura y excepción editable. |
| `src/app/models/service-orders/*.ts` | Modified | Metadata de herencia/permisos por línea. |
| `src/app/pages/technician-panel/technician-panel.spec.ts` | Modified | Escenarios de herencia y bloqueo. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| UX confusa entre heredado y nuevo | Medium | Separación visual explícita y copy corto. |
| La APP infiera reglas que deberían venir de API | Medium | Consumir metadata de edición desde backend. |

## Rollback Plan
Volver al composer actual que edita snapshots completos y quitar la presentación de líneas heredadas bloqueadas.

## Dependencies
- Contrato API con metadata de herencia, supersedencia y permiso editable de servicio técnico.

## Success Criteria
- [ ] Abrir un acuerdo por rediagnóstico precarga la versión anterior como heredada.
- [ ] La UI bloquea edición/eliminación de líneas heredadas salvo servicio técnico.
- [ ] El submit de la APP respeta el contrato coordinado de versión derivada.
