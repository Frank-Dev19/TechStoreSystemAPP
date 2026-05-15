# Change Spec: company-contact-management-in-reception-wizard

## Related Specs
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\openspec\specs\client-company-contacts\spec.md`
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\openspec\specs\reception-wizard-ui\spec.md`

## Requirements

### Requirement: Company-only Contact Management in Reception

El wizard de recepción MUST habilitar gestión de contactos únicamente cuando el cliente resuelto sea `COMPANY`, y SHALL mantener el flujo legacy sin selector para clientes `PERSON`.

#### Scenario: Person flow remains unchanged
- GIVEN el cliente resuelto en el wizard es `PERSON`
- WHEN la recepcionista continúa con la orden
- THEN el wizard MUST NOT mostrar selector de contactos ni modo de alta inline de contacto empresa
- AND el nombre, correo y teléfono operativos MUST seguir comportándose como snapshot directo de la persona

#### Scenario: Company flow activates contact management
- GIVEN el cliente resuelto en el wizard es `COMPANY`
- WHEN la recepcionista continúa con la orden
- THEN el wizard MUST mostrar un área explícita de gestión de contacto para la orden
- AND los campos legales de la empresa MUST permanecer de solo lectura

### Requirement: Selecting Existing Company Contacts

Cuando la empresa ya tenga contactos activos, el wizard MUST permitir seleccionar exactamente uno para la orden y SHOULD preseleccionar el contacto principal.

#### Scenario: Primary contact is preselected
- GIVEN una empresa existente con múltiples contactos activos
- WHEN el wizard hidrata la empresa encontrada
- THEN el contacto principal MUST quedar preseleccionado por defecto
- AND el snapshot operativo de nombre, correo y teléfono MUST reflejar ese contacto

#### Scenario: Choosing a different existing company contact
- GIVEN una empresa existente con múltiples contactos activos
- WHEN la recepcionista selecciona otro contacto de la empresa
- THEN el wizard MUST actualizar el snapshot operativo con ese contacto
- AND la orden MUST enviarse con el `clientContactId` correspondiente a ese contacto

### Requirement: Inline Contact Creation for Existing Companies

Cuando la empresa existente no tenga contactos adecuados, el wizard MUST permitir registrar uno inline antes de crear la orden, y SHALL persistirlo en la empresa antes de usarlo en la orden.

#### Scenario: Company without contacts requires inline creation
- GIVEN una empresa existente sin contactos activos
- WHEN la recepcionista intenta continuar con la orden
- THEN el wizard MUST exigir completar un contacto inline
- AND la orden MUST NOT enviarse mientras no exista un contacto válido para esa empresa

#### Scenario: Creating a new contact from the company selector area
- GIVEN una empresa existente con o sin contactos previos
- WHEN la recepcionista elige crear un nuevo contacto inline
- THEN el wizard MUST persistir ese contacto en el master de la empresa
- AND el contacto recién creado MUST quedar seleccionado para la orden
- AND la orden MUST enviarse con el `clientContactId` del contacto recién creado

### Requirement: No Null Company Contact on Order Submission

Una orden asociada a un cliente `COMPANY` MUST salir del wizard con un contacto resuelto, ya sea existente o recién creado inline.

#### Scenario: Reject company order without resolved contact
- GIVEN una orden para una empresa existente
- AND no hay contacto seleccionado ni contacto nuevo persistido
- WHEN la recepcionista intenta confirmar la orden
- THEN el wizard MUST bloquear la acción
- AND MUST mostrar un mensaje indicando que la empresa requiere un contacto para continuar
