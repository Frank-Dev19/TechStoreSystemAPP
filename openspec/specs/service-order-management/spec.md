# batch-service-order-creation Service Order Management Specification (APP)

## Purpose

Definir el contrato frontend y la experiencia de confirmación para enviar una creación batch de órdenes al backend.

## Requirements

### Requirement: Explicit Batch Submission

The frontend MUST submit batch service order creation through an explicit batch contract and SHALL NOT simulate the feature by issuing many unrelated single-create requests from the wizard.

#### Scenario: Sending one batch payload
- GIVEN the receptionist confirms a batch with many candidate orders
- WHEN the frontend submits the creation request
- THEN it MUST send one explicit batch payload
- AND that payload MUST contain shared context plus the collection of order candidates

### Requirement: Created Orders Feedback

The frontend MUST present the result of the batch operation as a collection of created orders and SHALL preserve individual traceability in the response handling.

#### Scenario: Showing many created orders after successful submission
- GIVEN the backend created many service orders successfully
- WHEN the frontend receives the response
- THEN it MUST expose the created orders as individual records
- AND it MUST make their identifiers or codes available for follow-up actions
