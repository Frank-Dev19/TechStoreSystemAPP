# Delta

## ADDED Requirements

### Requirement: Technician Visual Pilots

The technician panel MUST adopt Inventory heading, spacing and surfaces and Audit pagination. It MUST preserve existing workflow, palette and reference screens.

#### Scenario: No selection
- GIVEN no order is selected
- WHEN the order list renders
- THEN it MUST fill the available workspace without an empty detail column

#### Scenario: Mobile selection
- GIVEN a 320px viewport and a selected order
- WHEN its detail renders
- THEN the page MUST NOT overflow horizontally and detail controls MUST remain visible

#### Scenario: Pagination
- GIVEN orders or requests span multiple pages
- WHEN their pagination renders
- THEN controls MUST follow Audit and the summary MUST wrap on mobile
