# Internal warranty management UI

## Why

Reception and administrators need a coherent interface for the internal PEN 50 warranty lifecycle implemented by the API. Warranty service orders must no longer be created directly from legacy commercial data.

## What changes

- Add a permission-protected warranty screen for coverages, claims and administrator reports.
- Add an atomic warranty-intake form backed by `POST /service-orders/warranty-intake`.
- Show service-origin technician continuity and administrator-only documented substitution.
- Add warranty duration to product maintenance and initial service commercial configuration.
- Route legacy reception warranty actions to the canonical warranty screen.

