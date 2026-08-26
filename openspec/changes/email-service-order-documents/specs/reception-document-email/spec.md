# reception-document-email Specification

## Requirements

### Requirement: Conditional email actions

The reception panel SHALL keep document-email actions available even when the service order has no registered customer email.

#### Scenario: Email is registered
- GIVEN an order has a registered email
- WHEN its actions menu opens
- THEN the user can send the intake summary by email
- AND, if an active sale is linked, can send its electronic receipt by email

#### Scenario: Email is not registered
- GIVEN an order has no registered email
- WHEN its actions menu opens
- THEN the available document-email actions are rendered
- AND selecting one opens a recipient capture modal
- AND a valid email is required only for that delivery

### Requirement: Accepted electronic receipt

The linked receipt SHALL only be emailed after the electronic document is accepted.

#### Scenario: Receipt is accepted
- WHEN the user selects email receipt
- THEN the existing electronic-billing email endpoint receives the linked sale and registered order email

#### Scenario: Receipt is pending or rejected
- WHEN the electronic document is not accepted
- THEN no email is sent
- AND the panel explains why the receipt is unavailable
