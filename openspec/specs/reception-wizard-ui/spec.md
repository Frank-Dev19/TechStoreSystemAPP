# Reception Wizard UI Specification

## Purpose

Definir las restricciones visuales y reglas de renderizado para el componente del Wizard de Recepción, imponiendo un estilo corporativo "flat admin".

## Requirements

### Requirement: Flat Admin Styling

El sistema MUST renderizar los elementos `.wizard-hero`, `.wizard-step` y `.wizard-empty-quote-state` usando estilos planos, evitando explícitamente el uso de gradientes y sombras expansivas.

#### Scenario: Rendering the wizard hero header

- GIVEN que el wizard está activo en el DOM
- WHEN el usuario visualiza la sección hero superior
- THEN el fondo MUST ser un color sólido o un flat tint, sin utilizar `radial-gradient` ni `linear-gradient`
- AND el texto `.wizard-eyebrow` MUST mantener un contraste legible contra el nuevo fondo plano

#### Scenario: Rendering active wizard steps

- GIVEN que el wizard está mostrando los pasos de la orden
- WHEN un paso se vuelve activo (`.active`) o completado (`.completed`)
- THEN el elemento MUST NOT elevarse usando un `box-shadow` expansivo (ej: `0 14px 28px`)
- AND el elemento MUST NOT usar animaciones de elevación como `transform: translateY(-1px)`
- AND los colores de fondo MUST ser variantes sólidas tenues de la paleta principal (`$accent`, `$success`, `$primary`)
### Requirement: Client Capture by Kind

The reception wizard MUST capture client data according to `documentType.kind` as the primary classification source, SHALL keep person data separate from company contact data, and SHALL stop mapping company contact name into legal-name fields.

#### Scenario: Capturing a person client inline
- GIVEN the selected document type is classified as `PERSON`
- WHEN no existing client is found
- THEN the wizard MUST request person identity and direct contact fields only
- AND creating the order MUST create the master client and order snapshot from that same person

#### Scenario: Capturing a company client inline
- GIVEN the selected document type is classified as `COMPANY`
- WHEN no existing client is found
- THEN the wizard MUST request company fields and one contact block separately
- AND creating the order MUST create the master company, its first contact, and the order snapshot from that contact

#### Scenario: Preserving company master data for existing company orders
- GIVEN an existing `COMPANY` client is found in the wizard
- WHEN the user continues the order flow
- THEN the wizard MUST display company legal fields from the master client
- AND those legal fields MUST NOT be editable from the order flow
- AND the user MUST only interact with the contact selection or contact-creation area for the order

### Requirement: Company Contact Selection

When the selected client is `COMPANY`, the wizard MUST request exactly one contact for the order, SHOULD preselect the primary contact, and MAY allow inline creation of a new contact.

#### Scenario: Selecting an existing primary contact
- GIVEN an existing `COMPANY` client with multiple contacts
- WHEN the client is selected in the wizard
- THEN the wizard MUST list the related contacts
- AND the primary contact MUST appear preselected as the default order contact

#### Scenario: No contacts available for a company
- GIVEN an existing `COMPANY` client without contacts
- WHEN the user continues the order flow
- THEN the wizard MUST require creating one contact before finishing the order

#### Scenario: Creating a new contact inline for an existing company
- GIVEN an existing `COMPANY` client without a suitable contact selected
- WHEN the user completes the inline contact block
- THEN the wizard MUST persist that contact on the master company
- AND the order MUST use that newly created contact as the selected operational contact

#### Scenario: Legacy person lookup remains unchanged
- GIVEN an existing `PERSON` client is found by document
- WHEN the wizard hydrates the form
- THEN the wizard MUST preserve the legacy person behavior
- AND the person name and phone MUST continue to populate the operative contact snapshot fields directly

### Requirement: Transitional Document Type Fallback in Reception

The reception wizard MUST prefer `documentType.kind` for company/person resolution and MAY fallback only when the selected catalog row is still unclassified.

#### Scenario: Using a classified document type in reception
- GIVEN the selected document type has `kind`
- WHEN the wizard resolves the order flow
- THEN the wizard MUST use that explicit classification

#### Scenario: Using an unclassified legacy document type in reception
- GIVEN the selected document type lacks `kind`
- WHEN the wizard resolves the order flow
- THEN the wizard MAY use the temporary fallback heuristic
- AND the behavior SHALL remain transitional until catalog backfill is complete
