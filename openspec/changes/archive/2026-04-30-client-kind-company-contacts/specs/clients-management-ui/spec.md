# Delta for clients-management-ui

## ADDED Requirements

### Requirement: Company Contact Management from Clients

The clients management view MUST allow contact administration only for company clients, and SHALL expose a dedicated action for viewing and maintaining those contacts without leaving the clients context.

#### Scenario: Showing contact management only for company clients
- GIVEN the clients table contains both `PERSON` and `COMPANY` clients
- WHEN the user reviews row-level actions
- THEN company clients MUST expose a dedicated contact-management action
- AND person clients MUST NOT expose that action

#### Scenario: Opening company contact management
- GIVEN a `COMPANY` client in the clients view
- WHEN the user opens contact management
- THEN the UI MUST show the existing related contacts for that company
- AND the UI MUST allow registering a new contact and updating the primary contact

### Requirement: Company Creation from Clients

When the clients view is used to create a new company client, the UI MUST collect at least one contact together with the company master data and SHALL submit both as a single creation flow.

#### Scenario: Creating a company client from clients view
- GIVEN the user starts a new client creation
- AND the selected document or classification resolves to a company flow
- WHEN the user completes company legal data and one contact
- THEN the clients view MUST submit the company with its first contact in the same operation
- AND the first contact MUST become the primary contact unless the user explicitly chooses another primary contact

#### Scenario: Blocking company save without contact
- GIVEN the user is creating a company client from the clients view
- WHEN no valid contact is provided
- THEN the UI MUST block the save action
- AND the user MUST receive feedback that at least one contact is required
