# Warranty management UI specification

## Requirement: Permission-aware navigation

The UI MUST expose warranty management only to users with `navigation.warranties`, and MUST expose technician quality reports only with `warranties.report`.

## Requirement: Canonical intake

Reception and administrators MUST start warranty attention from an active coverage. The UI MUST submit the coverage and reported issue to the atomic warranty-intake endpoint.

### Scenario: Service-origin coverage

- **GIVEN** an active service coverage
- **WHEN** reception opens intake
- **THEN** the original technician MUST be displayed
- **AND** reception MUST NOT be able to replace that technician

### Scenario: Administrative substitution

- **GIVEN** an administrator chooses another technician
- **WHEN** intake is submitted
- **THEN** a non-empty substitution reason MUST be required

## Requirement: Responsive management

Coverage and claim data MUST remain usable at mobile widths without forcing the page layout wider than the viewport.

## Requirement: Warranty terms

Product maintenance and initial technical-service commercial configuration MUST send warranty duration and unit to the API.

