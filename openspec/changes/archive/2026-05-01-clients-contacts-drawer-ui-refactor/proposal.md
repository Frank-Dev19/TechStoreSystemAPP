# Change Proposal: clients-contacts-drawer-ui-refactor

## Intent
Refactorizar la UI del drawer de contactos en la pantalla de clientes sin cambiar la lógica existente.

## Scope
- Mejorar header, jerarquía visual y contexto de empresa
- Rediseñar empty state y listado de contactos
- Reorganizar visualmente el bloque de alta de contacto
- Mejorar footer y acciones del drawer

## Out of Scope
- Cambios de dominio, contratos o comportamiento funcional
- Cambios en API

## Approach
Refactor liviano de markup + SCSS, preservando el comportamiento actual de `clients.ts`.
