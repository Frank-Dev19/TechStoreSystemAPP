# client-company-contacts Specification

## Purpose

Definir clientes `PERSON` y `COMPANY`, y los contactos asociados a clientes empresa.

## Requirements

### Requirement: Client Kind Classification

The system MUST classify each client as `PERSON` or `COMPANY`, and business rules SHALL use that classification instead of inferring behavior directly from labels in the UI.

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

### Requirement: Company Contact Registry

The system MUST allow a `COMPANY` client to own multiple contacts, SHALL allow exactly one primary contact at a time, and SHALL NOT require contacts for `PERSON` clients.

#### Scenario: Registering the first company contact
- GIVEN a new `COMPANY` client without contacts
- WHEN a contact is created with the client
- THEN the system MUST store that contact linked to the client
- AND the first contact MUST become `isPrimary = true`

#### Scenario: Replacing the primary contact later
- GIVEN a `COMPANY` client with an existing primary contact
- WHEN another contact is marked as primary
- THEN the new contact MUST become `isPrimary = true`
- AND the previous primary contact MUST stop being primary

#### Scenario: Registering additional contacts over time
- GIVEN an existing `COMPANY` client with one or more contacts
- WHEN the user adds a new non-primary contact later
- THEN the system MUST persist the new contact linked to the same client
- AND the existing primary contact MUST remain primary unless the user explicitly changes it

### Requirement: Atomic Company Creation

The system MUST create `COMPANY` clients atomically together with their required contacts, and SHALL NOT persist a company client if the required contact registration fails.

#### Scenario: Rejecting company creation without contact
- GIVEN a create-client request for a `COMPANY` client without at least one valid contact
- WHEN the request is processed
- THEN the system MUST reject the request
- AND no master client record SHALL remain persisted

#### Scenario: Rejecting company creation when contact persistence fails
- GIVEN a valid `COMPANY` create request
- AND contact persistence fails during processing
- WHEN the request completes
- THEN the system MUST rollback the company creation
- AND the user MUST not end up with a master company without contacts

### Requirement: Service Order Contact Snapshot

When a service order is created for a `COMPANY` client, the system MUST use one selected contact and SHALL preserve that contact as an immutable order snapshot.

#### Scenario: Creating an order with selected company contact
- GIVEN a `COMPANY` client with multiple contacts
- WHEN the user creates a service order choosing one contact
- THEN the order MUST reference that chosen contact or its equivalent selection source
- AND the order MUST persist snapshot name, phone, and email from that contact

#### Scenario: Creating an order without modifying company master data
- GIVEN an existing `COMPANY` client selected in the service-order flow
- WHEN the user creates an order
- THEN the order flow MUST use the master company legal data as read-only source
- AND the order flow MUST only choose or create the operational contact used for that order
