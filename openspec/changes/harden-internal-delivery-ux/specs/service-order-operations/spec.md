# Service-order operations UI

## Requirements

### Requirement: Product lookup is server-backed

Product selectors MUST wait until the operator enters at least three characters and query the products endpoint instead of filtering a bounded local page. Quote editors SHALL debounce for 500 ms; technician supply requests SHALL follow the dispatch workflow's 250 ms debounce and 20-result cap.

#### Scenario: Search beyond the initial catalog page

- **GIVEN** a product is absent from the initially loaded options
- **WHEN** the operator types three or more matching characters and pauses for the selector's configured debounce
- **THEN** the selector displays matches returned by the server

### Requirement: Material actions reflect the workflow gate

The delivery action MUST be disabled until the selected equipment is En servicio, and confirmation failures MUST remain enforced by the API.

#### Scenario: Authorized but not started equipment

- **GIVEN** quoted products exist and the equipment is not En servicio
- **WHEN** inventory opens the materials section
- **THEN** delivery is unavailable and the interface explains the required state

### Requirement: Service-order panels can refresh explicitly

Reception, Technician, and Supervisor panels MUST expose an Actualizar action that reloads their order data.

#### Scenario: Another operator changed an order

- **WHEN** the current user presses Actualizar
- **THEN** the panel requests a fresh list and updates its current state

### Requirement: Cash and card totals are distinguishable

The sale modal MUST show and submit the total rounded to the nearest S/ 0.10 for cash, and MUST preserve the exact total for card payments.

#### Scenario: Total ends in two cents

- **GIVEN** the fiscal total is S/ 508.52
- **WHEN** cash is selected
- **THEN** the payable amount is S/ 508.50 and the exact fiscal total remains visible
