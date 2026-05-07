# Clients Management UI Specification

## Purpose

Definir la gestión de contactos empresariales desde la vista de clientes y el flujo de alta de empresa con contacto inicial.

## Requirements

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

When the clients view is used to create a new company client, the UI MUST derive the company flow from the selected document type classification, MUST collect at least one contact together with the company master data, and SHALL submit both as a single creation flow.

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

### Requirement: Company Contacts Drawer Visual Composition

The company contacts drawer in the clients view MUST present a clear and consistent visual composition without changing existing behavior.

#### Scenario: Header with stronger context
- WHEN the user opens the company contacts drawer
- THEN the header MUST provide visual context for contact management
- AND it MUST show the company name clearly

#### Scenario: Contacts list and empty state are easier to read
- WHEN the company has contacts or no contacts
- THEN the drawer MUST communicate that state through a clearer count, cards, or empty state presentation

#### Scenario: Contact creation block is visually grouped
- WHEN the user adds a new contact from the drawer
- THEN the form MUST appear as a differentiated and coherent block
- AND existing validations and actions MUST remain unchanged
