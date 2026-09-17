# Harden the service-order flow

Reception drafts currently persist values but not the enabled state of customer fields, Express orders display diagnosis-only content, material actions leak into the technician surface when an administrator opens it, and the sale modal depends on a stale order total. Small viewports also inherit desktop layouts before receiving scattered overrides.

Persist the customer-field state, render order details according to the service type and operating surface, derive the sale amount from the confirmed agreement, move commercial detail behind an on-demand disclosure, and make the active reception, supervisor, materials, and sale surfaces mobile-first.
