## ADDED Requirements

### Requirement: Suppliers adopts approved visual pilots
Suppliers SHALL follow Inventory presentation and Audit pagination using local component styles, consistent with the approved Clients screen. Other pages MUST remain unchanged.

#### Scenario: Desktop and mobile
- GIVEN Suppliers at 1440, 768, 390 or 320 pixels
- WHEN the page renders
- THEN desktop/mobile page padding SHALL be 20/12 pixels and header padding 28/20 pixels
- AND title size SHALL be 24/22 pixels at weight 600
- AND every table column SHALL remain accessible with contained horizontal scrolling
- AND create, edit and confirmation forms SHALL fit the viewport

### Requirement: Audit pagination pattern
The list SHALL display Previous, Page X of Y (N total), and Next, preserving existing callbacks and page boundaries.

#### Scenario: Navigation boundaries
- GIVEN a list with several pages
- WHEN the user navigates forward or backward
- THEN the page and summary SHALL update
- AND Previous SHALL be disabled on the first page and Next on the last page
- AND the summary SHALL wrap above the buttons on narrow screens
