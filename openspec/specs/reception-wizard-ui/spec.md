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
### Requirement: No Manual Client Kind Toggle

The reception wizard MUST NOT present any manual toggle, button group, or selector for choosing between "Person" and "Company" client kinds. The system SHALL infer the client kind exclusively from the selected `documentType.kind` field.

#### Scenario: Wizard loads without kind toggle
- GIVEN the receptionist opens the new service order wizard
- WHEN the client capture step is displayed
- THEN the wizard MUST NOT render any Person/Company toggle or selector
- AND the UI MUST only show the document type selector and document number input

#### Scenario: Automatic inference feedback
- GIVEN the receptionist selects a document type with `kind: COMPANY`
- WHEN the selection is applied
- THEN the wizard MAY display a non-interactive indicator (badge/text) showing "Empresa"
- AND the user MUST NOT be able to change this classification manually

### Requirement: Client Capture by Kind

The reception wizard MUST capture client data according to `documentType.kind` as the primary classification source, SHALL keep person data separate from company contact data, and SHALL stop mapping company contact name into legal-name fields. The wizard MUST NOT ask the user to manually select the client kind.

(Previously: The reception wizard MUST capture client data according to `documentType.kind` as the primary classification source, SHALL keep person data separate from company contact data, and SHALL stop mapping company contact name into legal-name fields.)

#### Scenario: Capturing a person client inline
- GIVEN the selected document type is classified as `PERSON`
- WHEN no existing client is found
- THEN the wizard MUST request person identity and direct contact fields only
- AND creating the order MUST create the master client and order snapshot from that same person
- AND the wizard MUST NOT show company fields (companyName, companyTradeName)

#### Scenario: Capturing a company client inline
- GIVEN the selected document type is classified as `COMPANY`
- WHEN no existing client is found
- THEN the wizard MUST request company fields and one contact block separately
- AND creating the order MUST create the master company, its first contact, and the order snapshot from that contact
- AND the wizard MUST show company fields (companyName, companyTradeName) automatically

#### Scenario: Preserving company master data for existing company orders
- GIVEN an existing `COMPANY` client is found in the wizard
- WHEN the user continues the order flow
- THEN the wizard MUST display company legal fields from the master client
- AND those legal fields MUST NOT be editable from the order flow
- AND the user MUST only interact with the contact selection or contact-creation area for the order

#### Scenario: Inferring kind from document type selection
- GIVEN the receptionist selects a document type from the catalog
- WHEN the document type has `kind` field defined
- THEN the wizard MUST automatically set the client kind to match `documentType.kind`
- AND MUST NOT prompt the user to confirm or change this classification

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

### Requirement: Cohesive Phone Input Alignment

The reception wizard MUST render the `app-phone-input` country selector and national-number field as a cohesive form-control pair, and SHALL align their label, borders, heights, and focus treatment with adjacent native inputs in the same form row.

#### Scenario: Aligning phone input with native contact fields
- GIVEN the receptionist is on the customer/contact step of the service-order wizard
- WHEN the contact row shows `Nombre de contacto`, `Correo`, and `Teléfono`
- THEN the `Teléfono` label MUST align vertically with the native labels beside it
- AND the country selector plus national-number input MUST share the same visible height and border language as the adjacent native inputs
- AND the selected country prefix MUST appear vertically centered inside its control

#### Scenario: Preserving alignment during validation
- GIVEN the phone field becomes invalid and displays helper text
- WHEN the wizard renders the error state
- THEN the phone controls MUST remain horizontally aligned with the neighboring native inputs
- AND the error/meta area MUST reserve enough space to avoid collapsing or jumping the control row

### Requirement: Transitional Document Type Fallback in Reception

The reception wizard MUST prefer `documentType.kind` for company/person resolution and MAY fallback only when the selected catalog row is still unclassified. The wizard MUST NOT present a manual kind selector as part of the fallback.

(Previously: The reception wizard MUST prefer `documentType.kind` for company/person resolution and MAY fallback only when the selected catalog row is still unclassified.)

#### Scenario: Using a classified document type in reception
- GIVEN the selected document type has `kind`
- WHEN the wizard resolves the order flow
- THEN the wizard MUST use that explicit classification
- AND MUST NOT show any manual override control

#### Scenario: Using an unclassified legacy document type in reception
- GIVEN the selected document type lacks `kind`
- WHEN the wizard resolves the order flow
- THEN the wizard MAY use the temporary fallback heuristic
- AND the behavior SHALL remain transitional until catalog backfill is complete
- AND the wizard MUST NOT present a manual Person/Company toggle as fallback
