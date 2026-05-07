# batch-service-order-creation Specification (APP)

## Purpose

Definir el comportamiento del wizard de recepción para registrar múltiples órdenes de servicio individuales en una sola sesión de alta.

## Requirements

### Requirement: Shared Reception Context

The reception wizard MUST allow capturing one shared reception context and SHALL reuse that context across multiple candidate service orders when applicable.

#### Scenario: Shared client and intake context across many candidate orders
- GIVEN the receptionist starts a new batch reception session
- WHEN the receptionist defines shared data such as client, request origin, priority, and common intake metadata
- THEN the wizard MUST preserve that shared context
- AND every candidate order created inside the session MUST inherit that context unless an order-level override is explicitly supported

### Requirement: Multiple Candidate Orders in One Wizard Session

The reception wizard MUST allow adding more than one equipment/order candidate before final confirmation and SHALL keep each candidate visually separated.

#### Scenario: Adding many equipment entries in one session
- GIVEN the receptionist is inside the batch creation wizard
- WHEN the receptionist adds multiple equipment entries
- THEN the wizard MUST represent each one as its own candidate order
- AND each candidate MUST preserve its own equipment-specific fields

#### Scenario: Reviewing the batch before confirmation
- GIVEN the receptionist already added many candidate orders
- WHEN the receptionist reaches the review step
- THEN the wizard MUST show the full collection to be created
- AND it MUST make clear that each item will become an independent service order

### Requirement: Independent Order Identity and Traceability

The batch creation wizard MUST preserve the individuality of each candidate order and SHALL NOT model the batch as one grouped order.

#### Scenario: Distinguishing one candidate order from another
- GIVEN many candidate orders inside the same batch
- WHEN the receptionist edits or removes one of them before submission
- THEN the wizard MUST affect only that candidate
- AND the rest of the batch MUST remain intact

### Requirement: Compatibility with Grouped Billing

The reception batch creation flow MUST remain compatible with later grouped billing, but SHALL NOT perform grouped billing itself.

#### Scenario: Batch-created orders remain eligible for later grouped sales
- GIVEN many service orders were created from one reception batch
- WHEN those orders later progress to agreements and sales
- THEN the system MUST allow them to participate in grouped billing flows later
- AND the reception wizard MUST NOT emit a grouped bill during creation
