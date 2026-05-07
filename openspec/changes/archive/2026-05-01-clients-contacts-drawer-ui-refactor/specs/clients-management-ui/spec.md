# Spec Delta: clients-management-ui

## Requirement
El drawer de contactos de empresa en la pantalla de clientes MUST presentar una composición visual clara y consistente sin alterar el comportamiento existente.

### Scenario: header con mayor contexto
- **WHEN** el usuario abre el drawer de contactos
- **THEN** debe ver un header con contexto visual de gestión de contactos y nombre de empresa

### Scenario: lista y empty state más legibles
- **WHEN** existen o no existen contactos
- **THEN** la sección de contactos registrados debe comunicar mejor el estado mediante count, cards o empty state

### Scenario: bloque de alta mejor agrupado
- **WHEN** el usuario agrega un contacto
- **THEN** el formulario debe verse como un bloque diferenciado y claro, preservando validaciones y acciones actuales
