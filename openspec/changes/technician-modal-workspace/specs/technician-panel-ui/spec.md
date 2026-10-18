# Delta

## ADDED Requirements

### Requirement: Persistent Technician Workspace

The technician MUST open orders using an explicit detail button. One modal MUST retain order and equipment across workflow transitions. Diagnosis, quotation, commercial decision and equipment transition forms MUST render inside that modal, without nested dialogs. Information and histories MUST NOT require internal tabs.

#### Scenario: Stage progression
- GIVEN a selected order and equipment
- WHEN a workflow action completes
- THEN the same modal MUST remain open with refreshed stage and available components

#### Scenario: Closing a workflow form
- GIVEN an open diagnosis or quotation form
- WHEN the technician closes the form
- THEN the modal MUST return to the selected order

#### Scenario: Keyboard and mobile
- GIVEN the modal is open
- WHEN keyboard focus cycles or the viewport is 320px
- THEN focus MUST stay inside, Escape MUST return or close, and content MUST remain scrollable without page overflow
