# Technical Design: fix-phone-input-alignment

## Component Architecture
The `app-phone-input` component uses a flex container to group the country select and the number input.

## Style Changes
- **Target**: `src/app/components/phone-input/phone-input.scss`
- **Strategy**:
  - In `appearance="form-control"` mode, set a explicit `height: 50px` (matching calculated Bootstrap height) for both the `ng-select-container` and the native `input`.
  - Use `display: flex` and `align-items: center` for internal centering.
  - Reset `padding-top` and `padding-bottom` on `.ng-value-container` to 0.
  - Set `line-height: normal` or a consistent value for both.
  - Ensure borders use the `$border` variable (`#e2e8f0`).

## Specific Overrides
```scss
.phone-input--form-control {
  .phone-input__country {
    ::ng-deep .ng-select-container {
      height: 50px !important;
      min-height: 50px !important;
      // ... center logic
    }
  }
  .phone-input__number {
    height: 50px !important;
    // ... padding logic
  }
}
```
