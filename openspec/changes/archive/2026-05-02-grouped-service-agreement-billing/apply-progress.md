# Apply Progress: grouped-service-agreement-billing (APP)

## Completed in this batch
- Added focused specs in `ventas.spec.ts` for grouped agreement selection and grouped sale emission.
- Covered taxpayer validation for `FACTURA` vs `Client.kind`.
- Added explicit grouped-order coverage helpers in `ventas.ts` to distinguish:
  - orders that this grouped sale will fully cover
  - other pending orders from the same operational client that remain outside the current receipt
- Updated `ventas.html` and `ventas.scss` so the grouped billing UI now shows two clear panels:
  - `Se liberan con este comprobante`
  - `Siguen pendientes`
- Added focused spec coverage for those visual/business rules in `ventas.spec.ts`.
- Re-ran focused verification:
  - `npx tsc --noEmit -p tsconfig.spec.json` ✅
  - `npm test -- --watch=false --browsers=ChromeHeadlessCI --include src/app/pages/ventas/ventas.spec.ts` → `TOTAL: 8 SUCCESS`
- Recorded the known runner warning: after the successful suite, Angular/Karma still crashes on shutdown with `ERR_INVALID_STATE`, which is environment/tooling noise already seen in this workspace.

## Remaining
- No frontend tasks remain in this change; next step should be `sdd-verify` for the cross-repo change.
