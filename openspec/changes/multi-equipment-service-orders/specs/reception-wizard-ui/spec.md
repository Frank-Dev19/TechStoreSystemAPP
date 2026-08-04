# Reception wizard multi-equipment delta

## MODIFIED Requirements

### Requirement: One Wizard Submission Creates One Order

The reception wizard MUST represent one service order containing one or more equipment items. It SHALL send one aggregate request and MUST NOT create one independent order per candidate.

#### Scenario: Reception registers several equipment items

- **GIVEN** reception added three equipment items in one wizard session
- **WHEN** the wizard is submitted successfully
- **THEN** it MUST send one order request containing three items
- **AND** the completion view MUST show one parent code and three child codes

### Requirement: Shared Technician and Service Type

The wizard MUST capture one technician and one service type for the whole order. It MUST NOT render an item-level technician or service-type selector.

#### Scenario: Adding a second equipment item

- **GIVEN** technician and service type were already selected
- **WHEN** reception adds another equipment item
- **THEN** the new item MUST inherit that shared context
- **AND** only item-level fields such as priority and equipment data MAY differ

### Requirement: Recoverable Aggregate Draft

The reception wizard MUST persist the current step, shared header data, all equipment items, editing state, and initial commercial drafts for up to 24 hours using the new aggregate-draft version.

#### Scenario: Restoring several equipment items

- **GIVEN** an unfinished wizard contains several items
- **WHEN** reception reloads or returns within 24 hours
- **THEN** the wizard MUST restore one aggregate order draft
- **AND** it MUST NOT reinterpret each item as an independent order

#### Scenario: Legacy draft is found

- **GIVEN** local storage contains a draft for the former batch contract
- **WHEN** the new wizard initializes
- **THEN** it MUST NOT submit that payload to the new API
- **AND** it MUST either migrate only safe fields or request that the operator discard it

## ADDED Requirements

### Requirement: Per-Item Priority Defaults to Low

Every equipment editor MUST offer its own priority and SHALL initialize it as `Baja`.

#### Scenario: Adding a new item

- **GIVEN** reception starts a blank equipment item
- **WHEN** its form appears
- **THEN** priority MUST display `Baja`

### Requirement: Single Creation Request

The wizard MUST treat the aggregate API response as the only creation success boundary.

#### Scenario: API rejects one child

- **GIVEN** the backend rejects the aggregate request
- **WHEN** the error is returned
- **THEN** the wizard MUST retain the local draft and all entered items
- **AND** it MUST NOT report a partial success
