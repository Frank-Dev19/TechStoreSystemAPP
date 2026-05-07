# Delta for reception-wizard-ui

## ADDED Requirements

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

## MODIFIED Requirements

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
