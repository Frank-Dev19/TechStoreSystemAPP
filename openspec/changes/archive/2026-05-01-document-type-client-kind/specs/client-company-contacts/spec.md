# Delta for client-company-contacts

## MODIFIED Requirements

### Requirement: Client Kind Classification

The system MUST classify each client as `PERSON` or `COMPANY`, and business rules SHALL use `documentType.kind` as the primary source when the classification originates from the document catalog instead of inferring behavior directly from labels in the UI.
(Previously: business rules used client classification without requiring `documentType.kind` as the catalog source.)

#### Scenario: Creating a natural person client
- GIVEN a client identified as a person
- WHEN the client is created
- THEN the system MUST persist `kind = PERSON`
- AND the client MAY exist without related contacts

#### Scenario: Creating a company client
- GIVEN a client identified as a company
- WHEN the client is created
- THEN the system MUST persist `kind = COMPANY`
- AND company-only contact rules MUST become applicable

#### Scenario: Resolving classification from document type
- GIVEN a document type selected from the catalog
- WHEN the client flow needs to resolve person vs company
- THEN the system MUST use `documentType.kind` as the primary source
- AND it MAY only fallback to legacy inference when the catalog row still lacks that classification