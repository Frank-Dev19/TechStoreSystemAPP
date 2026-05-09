# rediagnosis-agreement-versioning Specification

## Purpose

Definir la experiencia UI para acuerdos derivados por rediagnóstico, mostrando continuidad con la versión anterior y separando claramente lo heredado de lo nuevo.

## Requirements

### Requirement: Inherited Agreement Composer

The UI MUST open a rediagnosis agreement using the latest agreement version as inherited base, and SHALL render the inherited commercial context before the operator adds new changes.

#### Scenario: Opening a derived agreement with inherited content
- GIVEN a service order has one current confirmed agreement
- WHEN coordination opens the agreement flow after a rediagnosis
- THEN the composer MUST preload the inherited lines and notes from that agreement
- AND the operator MUST see that the draft is a new derived version, not a blank agreement

#### Scenario: Showing the latest inherited version when history exists
- GIVEN the order already has many historical agreement versions
- WHEN the derived agreement composer loads
- THEN the UI MUST show the latest active version as the inherited base
- AND it MUST NOT render superseded versions as editable context

### Requirement: Read-Only Inherited Lines with One Editable Exception

The UI MUST render inherited lines as read-only and non-removable, and SHALL expose the inherited technician-service line as the only editable inherited line. The UI MAY allow adding new lines in the derived draft.

#### Scenario: Blocking inherited lines from normal editing
- GIVEN the composer shows inherited product or note-backed lines
- WHEN the operator tries to edit or delete one inherited non-service line
- THEN the UI MUST block that action
- AND it MUST keep the line visibly marked as inherited/read-only

#### Scenario: Allowing the technician-service exception and new additions
- GIVEN the composer includes the inherited technician-service line
- WHEN the operator updates that line and adds a new extra line
- THEN the UI MUST allow the technician-service edit
- AND it MUST render the new line separately from inherited lines

### Requirement: Delta-Aware Submission Contract

The UI MUST submit a derived-version payload that respects backend inheritance rules, and SHALL avoid sending inherited locked lines as freely editable content.

#### Scenario: Submitting only the allowed derived changes
- GIVEN the operator kept inherited locked lines unchanged
- AND added new lines plus an allowed technician-service update
- WHEN the operator confirms the derived agreement
- THEN the UI MUST send a payload aligned with derived-version semantics
- AND it MUST exclude forbidden mutations for locked inherited lines
