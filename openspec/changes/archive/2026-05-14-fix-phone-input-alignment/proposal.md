# Change Proposal: fix-phone-input-alignment

## Intent
Fix the visual alignment discrepancy between the `ng-select` element (country selector) and the native text input in the `app-phone-input` component when used with `appearance="form-control"`.

## Scope
- `src/app/components/phone-input/phone-input.scss`: Update CSS rules to match native Bootstrap 5 `form-control` styles used in the project.

## Approach
- Use exact padding and height tokens from the project's form system.
- Standardize border color to `#e2e8f0` (variable `$border`).
- Ensure `ng-select-container` and `ng-value-container` are perfectly centered.
- Remove redundant or conflicting `::ng-deep` overrides.

## Risks
- Minor risk of affecting other `app-phone-input` usages if the global overrides are too aggressive (though we'll scope them to the component).
