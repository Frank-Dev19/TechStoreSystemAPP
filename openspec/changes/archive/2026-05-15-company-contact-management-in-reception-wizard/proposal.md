# Change Proposal: company-contact-management-in-reception-wizard

## Intent
Restaurar y completar la gestión de contactos para clientes `COMPANY` dentro del wizard de recepción, permitiendo seleccionar un contacto existente o registrar uno nuevo inline antes de crear la orden.

## Scope
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\reception-panel\reception-panel.ts`
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\reception-panel\reception-panel.html`
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\services\clients-api.service.ts`
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\models\clients-request.ts`

## Approach
- Mantener el flujo legacy para clientes `PERSON` sin selector ni alta adicional de contactos.
- Para clientes `COMPANY`, separar explícitamente dos modos operativos dentro del wizard:
  - seleccionar un contacto existente
  - crear un contacto nuevo inline para esa empresa
- Preseleccionar el contacto principal cuando exista.
- Si la empresa no tiene contactos, obligar el modo de creación inline antes de crear la orden.
- Persistir el nuevo contacto en master data de la empresa antes de enviar `clientContactId` al payload de la orden.

## Risks
- Riesgo de duplicar contactos si el guardado inline se reintenta sin controlar bien el estado del wizard.
- Riesgo de sobrescribir contactos existentes si la actualización del cliente no mergea correctamente la colección.
- Riesgo de romper el flujo de personas si la lógica de empresas no queda aislada por `clientKind`.
