# Change Specification: fix-phone-input-alignment

## Requirements
- **H1**: The `ng-select` container MUST match the height of the adjacent native input element exactly.
- **H2**: The vertical alignment of the selected value in `ng-select` MUST match the vertical alignment of the text/placeholder in the native input.
- **H3**: Border styles (color, width, radius) MUST be identical for both elements within the `app-phone-input` component.
- **H4**: Focus states (ring, color) MUST be consistent between the two elements.

## Scenarios

### Scenario 1: Alignment in Reception Modal
- **Given** the "Create Service Order" modal is open in the "Customer" step.
- **When** viewing the "Teléfono" field in the Contact section.
- **Then** the country selector and the national number input must appear as a single cohesive unit with perfectly aligned horizontal edges.
- **And** the country prefix text must be vertically centered relative to the input container.
