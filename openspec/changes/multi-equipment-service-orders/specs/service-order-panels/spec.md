# Service-order panels specification

## ADDED Requirements

### Requirement: Order Header With Equipment Navigation

Reception, technician, and supervisor panels MUST present the order as the primary record and SHALL allow navigation among its equipment items without duplicating the order card.

#### Scenario: Opening a multi-equipment order

- **GIVEN** an order contains three equipment items
- **WHEN** an operator opens its detail
- **THEN** the UI MUST show one order header
- **AND** all three items MUST be selectable

### Requirement: Actions Target the Selected Item

Diagnosis, technical transition, cancellation, completion, and delivery actions MUST identify the selected item. Technician reassignment MUST remain an order-level action.

#### Scenario: Technician resolves one item

- **GIVEN** the technician selected item two
- **WHEN** resolution is submitted
- **THEN** the request MUST target item two
- **AND** item one MUST remain visually unchanged after refresh

### Requirement: Partial Aggregate Status Is Visible

Panels MUST show both the parent aggregate state and concise counts of item states so partial completion or delivery is not presented as fully complete.

#### Scenario: Some items are ready

- **GIVEN** two of three active items are ready for delivery
- **WHEN** the order card renders
- **THEN** it MUST indicate partial progress such as `2 de 3 listos`
- **AND** it MUST NOT label the whole order as delivered

### Requirement: Detail Modal Remains In Context

Opening service-order details MUST use a modal rather than navigating away. General, diagnosis, and commercial tabs SHALL reflect the selected item and use Spanish empty states.

#### Scenario: Standard service has no diagnosis

- **GIVEN** a selected item belongs to a standard-service order
- **WHEN** the diagnosis tab is opened
- **THEN** it MUST explain in Spanish that this service does not requiere diagnóstico

### Requirement: Common Technician Reassignment

Only reception, supervision, or administration with the assignment permission MAY see the reassignment control, and the action MUST clearly state that it affects all equipment in the order.

#### Scenario: Reception reassigns a multi-equipment order

- **GIVEN** reception opens reassignment
- **WHEN** another technician is confirmed
- **THEN** the UI MUST refresh the header assignment for the whole order
