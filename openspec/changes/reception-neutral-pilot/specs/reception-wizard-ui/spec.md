# Delta

## ADDED Requirements

### Requirement: Reception Rows Without Status Highlighting

Order rows MUST NOT use background or border coloration based on pending quotation, rejected quotation or pending delivery. Reception MUST preserve its existing palette and state labels.

#### Scenario: Reading orders with different states
- GIVEN reception displays orders with pending quotation, rejected quotation or pending delivery
- WHEN the list renders
- THEN rows MUST NOT receive the corresponding status highlight classes
- AND state labels, actions and the rest of the panel palette MUST remain unchanged

### Requirement: Reception Visual Pilots

Reception MUST adopt Inventory spacing, heading hierarchy and surface styling and Audit pagination while preserving its existing palette.

#### Scenario: Responsive reception
- GIVEN reception at desktop or mobile width
- WHEN its panel renders
- THEN its heading and surfaces MUST follow Inventory and pagination MUST follow Audit
- AND the table MUST scroll inside its container when necessary
- AND the reference screens MUST remain unchanged
