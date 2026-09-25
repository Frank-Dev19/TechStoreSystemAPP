# Harden internal delivery and service-order operations UX

Operators need clear workflow gates and complete searches rather than controls that appear available but fail later. Align the Angular UI with the backend material lifecycle, replace bounded client-side product matching with debounced server search, and expose explicit refresh actions on the three service-order panels.

Also align business labels and access: show Spanish Kardex reasons, let receptionists open supervision, support an optional order on technician supply requests, and present the payable cash rounding without changing the fiscal sale total.

Rollback: revert the UI change together with its compatible API change.
