## ADDED Requirements

### Requirement: Clients adopts the Inventory visual reference locally
The Clients screen SHALL reuse the existing Inventory visual language using only styles scoped to Clients. Inventory and other screens MUST remain unchanged.

#### Scenario: Desktop presentation
- GIVEN the Clients screen at 1440px
- WHEN the page renders
- THEN page padding SHALL be 20px, header padding 28px and title size 24px at weight 600
- AND surfaces SHALL use 12px radii and the existing neutral palette
- AND search, filters, pagination and permitted actions SHALL remain available

#### Scenario: Mobile presentation
- GIVEN the Clients screen at 320px or 390px
- WHEN the page renders
- THEN page padding SHALL be 12px, header padding 20px and title size 22px
- AND all table columns SHALL remain accessible through contained horizontal scrolling
- AND forms and the company contacts drawer SHALL fit the viewport

#### Scenario: Existing operations
- GIVEN a user working with Clients
- WHEN opening create, edit, import, confirmation or company contacts surfaces
- THEN existing validations, permissions, data and operations SHALL be preserved
- AND presentation SHALL use the functional colors and surfaces of Inventory

### Requirement: Pagination uses the Audit reference
Clients list and import preview SHALL display centered Previous and Next buttons with the summary Page X of Y (N total), following Audit presentation. Existing page boundaries and callbacks MUST be preserved.

#### Scenario: First and last page
- GIVEN a paginated Clients list or import preview
- WHEN the first or last page is displayed
- THEN Previous or Next respectively SHALL be disabled
- AND narrow screens SHALL wrap the summary without page overflow
