# Delta for reception-wizard-ui

## MODIFIED Requirements

### Requirement: Client Capture by Kind

The reception wizard MUST capture client data according to `documentType.kind` as the primary classification source, SHALL keep person data separate from company contact data, and SHALL stop mapping company contact name into legal-name fields.
(Previously: the wizard captured by `Client.kind` with a transitional inference not explicitly tied to catalog classification.)

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

## ADDED Requirements

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