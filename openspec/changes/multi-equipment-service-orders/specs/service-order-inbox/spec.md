# Service-order inbox context delta

## MODIFIED Requirements

### Requirement: Live Inbox Updates Preserve Per-User Read State

The inbox MUST refresh messages and the authenticated user's unread counts after `inbox.changed` without reloading the page. Opening a thread SHALL mark it read only for that user.

#### Scenario: New message arrives in an open inbox

- **GIVEN** an operator has the inbox open
- **WHEN** SSE emits `inbox.changed`
- **THEN** the thread list and selected conversation MUST refresh
- **AND** badges MUST reflect the authenticated user's unread counts

#### Scenario: Operator opens an unread thread

- **GIVEN** the selected thread has unread messages for the operator
- **WHEN** the conversation opens successfully
- **THEN** the UI MUST mark it read
- **AND** its badge MUST disappear without affecting another user's read state

## ADDED Requirements

### Requirement: Recent Client Orders Are Informational

The right panel MUST be titled `Órdenes recientes del cliente` and SHALL display client-context orders without claiming or allowing a conversation link.

#### Scenario: Context panel renders

- **GIVEN** a conversation resolves to a client with recent orders
- **WHEN** the inbox loads its context
- **THEN** recent orders MUST be displayed
- **AND** no selector, checkbox, link action, or `Órdenes vinculadas` wording may appear

### Requirement: Order Context Opens a Modal

Selecting a recent client order MUST open the in-place detail modal with general, diagnosis, and commercial tabs.

#### Scenario: Recent order is selected

- **GIVEN** the right panel lists a recent order
- **WHEN** the operator selects `Ver detalles`
- **THEN** the inbox MUST remain mounted
- **AND** the order detail MUST open in a modal

### Requirement: Phone Masking Follows Viewer Authorization

The inbox MUST display the complete client phone only when the API marks it visible for a supervisor or administrator. Reception and technician views SHALL keep it masked.

#### Scenario: Reception views a thread

- **GIVEN** the current viewer is reception
- **WHEN** the thread header renders
- **THEN** the complete phone number MUST NOT appear in the DOM
