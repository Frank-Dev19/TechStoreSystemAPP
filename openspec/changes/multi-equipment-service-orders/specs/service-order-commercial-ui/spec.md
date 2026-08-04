# Service-order commercial UI specification

## ADDED Requirements

### Requirement: Consolidated Proposal With Item Decisions

The commercial UI MUST show one consolidated order proposal and SHALL display the current commercial version and decision for each active item.

#### Scenario: One item requested changes

- **GIVEN** item one is accepted and item two requested changes
- **WHEN** the proposal editor opens
- **THEN** item one MUST appear accepted and locked
- **AND** item two MUST be editable as a new version

### Requirement: Manual Decision Capture

Authorized reception, technician, and supervisor users MUST be able to record decision, channel, and optional observation for a current item version.

#### Scenario: Recording a WhatsApp acceptance

- **GIVEN** a response was received through WhatsApp
- **WHEN** an operator selects `Aceptado` and channel `WhatsApp`
- **THEN** the UI MUST send the exact item commercial version
- **AND** it MUST refresh the consolidated agreement state

### Requirement: Discount Editing and Limits

Authorized reception, technician, and supervisor users MUST be able to apply discounts per commercial line. The UI SHALL display base, discount, and net amounts and MUST preserve backend validation messages.

#### Scenario: Technician applies an allowed discount

- **GIVEN** the technician may edit the assigned order
- **WHEN** a valid discount is applied
- **THEN** the line and consolidated totals MUST refresh

#### Scenario: Discount exceeds permitted limit

- **GIVEN** the backend rejects the discount limit
- **WHEN** the response is displayed
- **THEN** the UI MUST explain that supervisor authorization is required

### Requirement: No Automatic Client Response Simulation

The frontend MUST NOT label an internal operator action as if the client acted directly and MUST NOT generate free-text WhatsApp notification content.

#### Scenario: Operator records a decision

- **GIVEN** an internal user submits a client decision
- **WHEN** the timeline renders it
- **THEN** it MUST identify who recorded the response and through which channel
