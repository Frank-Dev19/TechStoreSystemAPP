# Delta for reception-wizard-ui

## ADDED Requirements

### Requirement: Client Capture by Kind

The reception wizard MUST capture client data according to `Client.kind`, SHALL keep person data separate from company contact data, and SHALL stop mapping company contact name into legal-name fields.

#### Scenario: Capturing a person client inline
- GIVEN the document resolves to a `PERSON` client flow
- WHEN no existing client is found
- THEN the wizard MUST request person identity and direct contact fields only
- AND creating the order MUST create the master client and order snapshot from that same person

#### Scenario: Capturing a company client inline
- GIVEN the document resolves to a `COMPANY` client flow
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

#### Scenario: Temporary fallback remains active for non-catalog-classified documents
- GIVEN document types are not yet explicitly classified by `DocumentType.kind`
- WHEN the wizard infers the client flow
- THEN it MUST continue using the temporary fallback strategy already defined for person/company inference
- AND that inference MUST remain documented as transitional behavior
