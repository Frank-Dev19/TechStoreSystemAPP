# Brother 17 x 54 mm stickers

## Problem and decision
The business uses 17 x 54 mm die-cut labels in landscape. The current 62 x 35 PDF and custom paper are incompatible. QZ density uses the configured units: density 300 with mm meant 300 dots/mm, not 300 dpi.

## Requirements
- Given a selected equipment, the PDF MUST be one 54 x 17 mm landscape page with bounded single-line customer, equipment, serial, accessories, notes and issue, plus order and reception timestamp.
- Given the Brother printer, QZ SHALL request native 17 x 54 mm paper (custom=false), landscape once, and density 300/25.4 dots/mm. The already-landscape PDF SHALL NOT be rotated again in content.
- Given a development fallback printer, A4 SHALL remain available with a 54 x 17 mm content bound.
- Long content SHALL truncate with ellipsis within margins.

## Validation
Targeted regression tests, rendered normal/long PDFs, production build, container deployment, then one physical label at the business. Physical printing cannot be proven from the server.

## Rollback
Restore prior frontend image. No backend code or database migration is required.
