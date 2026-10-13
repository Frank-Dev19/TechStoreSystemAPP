## ADDED Requirements

### Requirement: Supervisor adopts the visual pilots locally
Supervisor SHALL follow Inventory spacing, header typography, surfaces, controls and Audit pagination while preserving its existing operational workflows.

#### Scenario: Responsive workspace
- GIVEN the supervisor at 320, 390, 768 or 1440 pixels
- WHEN orders, detail, ranking or notifications render
- THEN content SHALL fit the viewport with intentional scrolling limited to its own regions
- AND text, actions and status SHALL remain legible and accessible
- AND other screens and shared components MUST remain unchanged

### Requirement: Order loading states are accurate
The supervisor MUST distinguish pending requests, successful empty results and failed requests.

#### Scenario: Successful empty result
- GIVEN a completed request containing no orders
- WHEN the list renders
- THEN it SHALL show an empty state rather than an indefinite loading indicator

#### Scenario: Failed request
- GIVEN an order list request fails
- WHEN the list renders
- THEN it SHALL show an error and an explicit retry action

### Requirement: Filtering preserves a valid page
Changing order search or status SHALL return the list to the first page without discarding the selected order context.

Reloading the technician ranking SHALL keep its page within the available range.

#### Scenario: Filtering from an advanced page
- GIVEN page two or later is displayed
- WHEN a filter leaves only one matching order
- THEN that order SHALL remain visible on page one

#### Scenario: Ranking shrinks after reload
- GIVEN page two of a ranking is displayed
- WHEN a reload returns only one technician
- THEN page one SHALL show that technician

### Requirement: Conventional order list with explicit detail action
Orders SHALL render in a semantic table with a native View details button for each row. Activating the button SHALL open a dialog drawer preserving all existing order context and actions.

#### Scenario: Detail opens from the list
- GIVEN an order row is visible
- WHEN View details is activated with mouse or keyboard
- THEN its drawer SHALL open with the close control focused
- AND filters and current page SHALL remain unchanged

#### Scenario: Detail dismissal
- GIVEN the order drawer is open without a child commercial dialog
- WHEN Escape, its close control or background is activated
- THEN it SHALL close and restore focus to the initiating button
- AND the list position, filters and page SHALL remain intact

#### Scenario: Drawer navigation
- GIVEN the order drawer is open
- WHEN the user tabs through its controls
- THEN focus SHALL remain in the drawer
- AND the background SHALL remain stationary until dismissal

### Requirement: Notifications remain contained
Notification dialogs SHALL keep the header, dismissal, scrolling body and actions usable at mobile widths, including long technical errors.

#### Scenario: Long error details
- GIVEN a notification contains an unbroken technical error
- WHEN its details expand
- THEN the text SHALL wrap without horizontal overflow or obscuring actions
