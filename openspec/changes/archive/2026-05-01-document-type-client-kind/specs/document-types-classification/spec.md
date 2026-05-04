# document-types-classification Specification

## Purpose

Definir la clasificación explícita `PERSON | COMPANY` en tipos de documento y su captura obligatoria en la UI administrativa.

## Requirements

### Requirement: Document Type Kind Capture

The system MUST require every document type to declare whether it identifies a `PERSON` or a `COMPANY`.

#### Scenario: Creating a document type
- GIVEN the user starts a new document type
- WHEN the user completes the form
- THEN the form MUST require selecting `PERSON` or `COMPANY`
- AND the create request MUST submit that classification together with name, digits, and description

#### Scenario: Editing an existing document type
- GIVEN an existing document type
- WHEN the user edits it
- THEN the current `kind` MUST be visible in the form
- AND saving MUST persist the selected classification

### Requirement: Transitional Catalog Consumption

Consumers of document types MUST use `documentType.kind` as the primary source for flow classification and MAY use a temporary fallback only when older catalog rows still lack that value.

#### Scenario: Using classified document types
- GIVEN a loaded document type with `kind`
- WHEN a client or order flow resolves person vs company
- THEN the flow MUST use `documentType.kind` first

#### Scenario: Using legacy document types without classification
- GIVEN a loaded document type without `kind`
- WHEN a client or order flow resolves person vs company
- THEN the flow MAY use the documented temporary fallback
- AND that fallback SHALL remain transitional behavior only