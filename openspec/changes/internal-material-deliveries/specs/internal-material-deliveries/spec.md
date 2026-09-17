# Internal material UI

## ADDED Requirements

### Requirement: Equipment materials

The UI MUST expose approved products, exact serial selection, partial deliveries, factory-defect returns and reconciliation per equipment.

#### Scenario: Confirmation before service starts

- GIVEN an equipment item that is not EN_EJECUCION
- WHEN its materials are shown
- THEN confirmation MUST remain disabled with guidance to start service first.

#### Scenario: Returned product visibility

- GIVEN a delivered product that inventory received for a reported factory defect
- WHEN materials are shown
- THEN it MUST appear in a dedicated returned-products section with serial, guide, date, reason and review condition, separate from products held by the technician.

#### Scenario: Report fault

- GIVEN a delivered serial
- WHEN inventory receives it as faulty with a reason
- THEN the UI MUST show UNDER_REVIEW and only admin MAY resolve it.

#### Scenario: Reconciliation mismatch

- GIVEN two approved RAM and one returned for a reported factory defect
- WHEN the technician confirms use
- THEN the server error MUST remain visible and billing MUST not silently lower quantity.

#### Scenario: Navigation during loading

- GIVEN a request for equipment A
- WHEN the user switches to B
- THEN late A results MUST NOT overwrite B.

### Requirement: Inherited sale materials

The sale UI MUST display the installed serials from reconciled deliveries as read-only. Server validation SHALL remain authoritative.

### Requirement: Guided and accessible material actions

The UI MUST show authorized, delivered and pending quantities by product, excluding faulty returns and combining duplicate quote products. Server validation remains authoritative.

#### Scenario: Pending or mismatched materials

- GIVEN missing deliveries or outstanding products outside the accepted quote
- WHEN the user views confirmation
- THEN the UI MUST explain the blocker and prevent confirmation.

#### Scenario: Deliberate review

- GIVEN an admin opens a serial review
- WHEN no result is chosen
- THEN the UI MUST NOT submit or assume that the piece is usable.

#### Scenario: Stock lookup

- GIVEN availability is loading or failed
- WHEN the delivery editor is open
- THEN the UI MUST distinguish loading, error and empty stock and offer retry on error.

#### Scenario: Accessible editing

- GIVEN a delivery, fault receipt or review editor is opened
- WHEN keyboard or narrow-screen users interact
- THEN labels, visible focus, contextual feedback and explicit cancellation MUST remain available.
