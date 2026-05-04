# service-order-economic-workflow Specification

## Purpose

Definir la regla operativa de entrega por orden cuando existe facturación agrupada de acuerdos.

## Requirements

### Requirement: Delivery by Order-Level Economic Coverage

The system MUST allow delivery decisions per order, even when many agreements were billed together, and SHALL use the economic coverage of each individual order agreement as the release criterion.

#### Scenario: Delivering one fully covered order from a grouped bill
- GIVEN many service orders from the same operational client were billed in one grouped document
- AND one order agreement is fully covered
- AND another order agreement from that same grouped set remains pending
- WHEN the user attempts to deliver the fully covered order
- THEN the system MUST allow delivery of that order

#### Scenario: Blocking delivery for a non-covered order inside a grouped bill
- GIVEN many service orders from the same operational client were billed together
- WHEN a specific order agreement is not fully covered
- THEN that order MUST remain blocked for delivery
- AND the payment state of the other grouped orders MUST NOT unlock it
