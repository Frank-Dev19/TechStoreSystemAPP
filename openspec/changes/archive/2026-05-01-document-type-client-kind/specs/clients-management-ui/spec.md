# Delta for clients-management-ui

## MODIFIED Requirements

### Requirement: Company Creation from Clients

When the clients view is used to create a new company client, the UI MUST derive the company flow from the selected document type classification, MUST collect at least one contact together with the company master data, and SHALL submit both as a single creation flow.
(Previously: the company flow could resolve from the selected document or classification without a catalog-backed `documentType.kind`.)

#### Scenario: Creating a company client from clients view
- GIVEN the user starts a new client creation
- AND the selected document type is classified as `COMPANY`
- WHEN the user completes company legal data and one contact
- THEN the clients view MUST submit the company with its first contact in the same operation
- AND the first contact MUST become the primary contact unless the user explicitly chooses another primary contact

#### Scenario: Blocking company save without contact
- GIVEN the user is creating a company client from the clients view
- WHEN no valid contact is provided
- THEN the UI MUST block the save action
- AND the user MUST receive feedback that at least one contact is required

#### Scenario: Handling legacy document types without kind
- GIVEN the selected document type still lacks `kind`
- WHEN the clients view resolves person vs company
- THEN the view MAY use the temporary fallback strategy
- AND the fallback MUST remain documented as transitional behavior