# Delta for technician-panel-workflow

## ADDED Requirements

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
