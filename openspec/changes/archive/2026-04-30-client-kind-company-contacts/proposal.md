# Proposal: Client kind and company contacts

## Intent

Separar persona natural de empresa en `Client`, modelar contacto empresarial explícito y cerrar el flujo operativo completo para que empresa + contactos se puedan crear y gestionar correctamente sin mezclar razón social con persona de trato.

## Scope

### In Scope
- Agregar `kind` en `Client` para distinguir `PERSON` vs `COMPANY`.
- Introducir contacto empresarial relacionado al cliente y usarlo cuando el cliente sea empresa.
- Ajustar wizard de recepción para que empresa capture razón social y contacto por separado.
- Mantener la creación de cliente empresa **inline en el wizard** cuando no exista el cliente, incluyendo alta de 1..N contactos en el mismo flujo.
- Agregar gestión de contactos en `clients` para clientes empresa, desde una acción dedicada de la grilla.
- Evitar que la orden edite datos maestros de empresa; desde la orden solo se selecciona cliente/contacto y se guardan snapshots.
- Corregir el create backend para que el alta de cliente empresa sea atómica y no deje cliente persistido si fallan los contactos.

### Out of Scope
- Clasificar `DocumentType` explícitamente como `PERSON` vs `COMPANY`.
- Migraciones masivas o normalización histórica fuera de lo necesario para compatibilidad.

## Capabilities

### New Capabilities
- `client-company-contacts`: modela contactos empresariales asociados a clientes tipo empresa.

### Modified Capabilities
- `reception-wizard-ui`: cambia el comportamiento del wizard para separar datos del cliente y del contacto según `Client.kind`.
- `clients-management-ui`: agrega administración de contactos para clientes empresa.

## Approach

Agregar `kind` en backend/frontend, crear entidad de contacto ligada a `Client`, mantener snapshot en `ServiceOrder`, dejar la creación de empresa + contactos inline en el wizard, agregar gestión de contactos en `clients`, e inferir inicialmente `PERSON`/`COMPANY` desde el documento mientras `DocumentType.kind` queda para otro change.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `TechStoreSystemAPI/src/clients/*` | Modified | `Client.kind`, contactos y create atómico |
| `TechStoreSystemAPI/src/service-orders/*` | Modified | selección/snapshot del contacto en la orden |
| `TechStoreSystemAPP/src/app/pages/reception-panel/*` | Modified | wizard con razón social + contacto separados |
| `TechStoreSystemAPP/src/app/pages/clients/*` | Modified | gestión de contactos empresa desde clientes |
| `TechStoreSystemAPP/src/app/models/clients*` | Modified | contrato frontend de cliente/contacto |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Confundir datos legacy de clientes empresa | Med | definir fallback temporal desde snapshots y documento |
| Romper autocompletado del wizard | Med | mantener compatibilidad mientras exista cliente sin contacto |
| Dejar clientes huérfanos si falla alta de contactos | Med | volver atómico el create backend y validar contactos antes de confirmar persistencia |

## Rollback Plan

Revertir `Client.kind`, desactivar gestión de contactos empresa en wizard/clients y volver al mapeo actual basado en snapshots de orden.

## Dependencies

- Confirmar regla inicial de mapeo `DNI -> PERSON`, `RUC -> COMPANY`.
- Coordinación APP/API para contratos de cliente y orden.
- Dejar explícito que `DocumentType.kind` se resolverá en otro change.

## Success Criteria

- [ ] El wizard distingue razón social y persona de contacto cuando el cliente es empresa.
- [ ] El wizard permite crear empresa y sus contactos inline sin salir del flujo.
- [ ] La vista `clients` permite gestionar contactos solo para clientes empresa.
- [ ] El cliente maestro deja de mezclar nombre legal con contacto empresarial.
- [ ] El alta de cliente empresa falla de forma atómica si falta o falla el contacto.
- [ ] La orden sigue preservando snapshot del contacto usado al crearla.
