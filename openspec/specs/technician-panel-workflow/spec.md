# Capability: technician-panel-workflow

## ADDED Requirements

### Requirement: Technician can start diagnosis on multiple assigned orders
The technician panel MUST allow a technician to move more than one assigned service order into `EN_DIAGNOSTICO` without blocking on another active diagnosis from the same technician.

#### Scenario: Starting a second diagnosis while another assigned order is already in diagnosis
- **GIVEN** the technician already has an assigned service order in `EN_DIAGNOSTICO`
- **AND** another assigned service order is eligible to start diagnosis
- **WHEN** the technician starts diagnosis on the second order
- **THEN** the panel allows the transition
- **AND** the second order also moves to `EN_DIAGNOSTICO`
- **AND** the panel does not show a warning requiring the technician to complete the previous review first

#### Scenario: Diagnosis tab lists all orders currently in diagnosis
- **GIVEN** the technician has multiple assigned orders with technical status `EN_DIAGNOSTICO`
- **WHEN** the technician opens the diagnosis tab
- **THEN** all those orders are listed there
- **AND** none are hidden because another diagnosis is already active

### Requirement: Diagnosis concurrency remains isolated per order
Allowing multiple orders in diagnosis MUST NOT change the existing rule that each service order has only one diagnosis entry marked as `CURRENT` at a time.

#### Scenario: Creating a new diagnosis on one order does not affect another order in diagnosis
- **GIVEN** two different service orders are both in `EN_DIAGNOSTICO`
- **WHEN** the technician registers a diagnosis for one order
- **THEN** only that order's diagnosis history is updated
- **AND** the other order remains available in `EN_DIAGNOSTICO`
- **AND** the other order's diagnosis history is unchanged

### Requirement: Technician panel UI must not imply a single active diagnosis globally
The technician panel MUST remove UI state and behavior that imply only one diagnosis can be active per technician at a time.

#### Scenario: Start diagnosis action remains available on another eligible order
- **GIVEN** one order is already in `EN_DIAGNOSTICO`
- **AND** another assigned diagnosis-capable order is still in `ASIGNADA`
- **WHEN** the technician views the second order card
- **THEN** the start diagnosis action remains enabled for that second order
- **AND** the card does not show a concurrency-blocked state caused by the first order

### Requirement: Technician panel supports derived agreement continuity

The technician/coordinator agreement flow MUST present rediagnosis agreements as a continuation of the previous version, and SHALL make the replacement effect explicit before confirmation.

#### Scenario: Coordinator sees version continuity inside the panel flow
- GIVEN a service order returns from rediagnosis with one current confirmed agreement
- WHEN the operator opens the agreement flow from the technician panel context
- THEN the panel MUST present the new draft as derived from the previous version
- AND it MUST preserve access to the inherited agreement context during editing

#### Scenario: Confirmation explains that the new version replaces the previous one
- GIVEN the operator is about to confirm a derived agreement version
- WHEN the confirmation state is shown in the panel workflow
- THEN the UI MUST communicate that the new version will replace the previously active one
- AND the workflow MUST avoid implying both versions stay current at the same time

### Requirement: Technician panel workflow preserves controlled editing rules

The technician/coordinator agreement flow MUST enforce the derived-version editing contract inside the panel workflow, and SHALL keep only allowed actions available while editing.

#### Scenario: Panel workflow hides forbidden actions for inherited lines
- GIVEN the operator is editing a derived agreement from the technician panel
- WHEN inherited locked lines are displayed
- THEN the workflow MUST keep delete and free-edit actions unavailable for those lines
- AND it MUST leave the allowed technician-service edit path available
