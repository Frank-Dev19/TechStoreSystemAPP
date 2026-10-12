## ADDED Requirements
### Requirement: Follow the selected order through workflow stages
The technician panel SHALL follow a successfully transitioned order using its actual aggregate technical status returned by the backend, preserve the equipment context, and display the page containing that order.

#### Scenario: Start diagnosis
- WHEN starting diagnosis succeeds and the refreshed order is in EN_DIAGNOSTICO
- THEN the diagnosis tab is selected and the same order and equipment remain selected.

#### Scenario: Subsequent workflow stages
- WHEN the selected order changes to a quotation, authorized, execution, or resolved stage
- THEN its corresponding tab is selected without losing equipment context.

#### Scenario: Failed transition
- WHEN a transition fails
- THEN the panel retains the existing tab and selection.

#### Scenario: Manual navigation during a pending operation
- WHEN the technician changes the tab, order, or equipment while a transition or reload is pending
- THEN the late response does not restore the previous selection.
