# Apply Progress: batch-service-order-creation (APP)

## Scope completed in this batch
- Added frontend batch request/response models for service orders
- Added `createBatch(...)` in the frontend service
- Refactored reception wizard state to keep many candidate orders in one session
- Added add/edit/remove candidate behavior before confirmation
- Changed submit flow to send one explicit batch request
- Added review summary for many candidate orders before final submit
- Added focused specs for candidate accumulation and batch submission wiring
- Fixed submit validation so the wizard can confirm a batch after the current equipment draft was already added to candidates
- Moved the `Agregar otro equipo` action from the confirmation step back to the equipment step where the candidate batch is actually built
- Added a guard/helper so the extra-equipment action only appears during the equipment step and never while editing a candidate
- Re-ran the focused reception wizard suite until the batch path passed end-to-end
- **Phase 5 UX refinements**: Removed `length > 0` condition for "add another team" button → shows from first visit; hides Edit/Remove buttons in Confirmation step; adjusted footer with X (close) + Create order(s)
- **Phase 6 equipment cards**: Added saved equipment cards display above form when "Agregar otro equipo" is clicked; cards show type, brand+model, serial; each card has X delete button in top-right corner; minimum 1 equipment validation already exists in `ensureCreateOrderCandidatesReady()`

## Files changed
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\models\service-orders\service-order-request.ts`
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\services\service-orders\service-order.service.ts`
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\reception-panel\reception-panel.ts`
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\reception-panel\reception-panel.html`
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\reception-panel\reception-panel.scss`
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\reception-panel\reception-panel.spec.ts`
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\openspec\changes\batch-service-order-creation\tasks.md`
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\openspec\changes\batch-service-order-creation\apply-progress.md`

## TDD Cycle Evidence
| Task | Test File | Layer | RED | GREEN | REFACTOR |
|---|---|---|---|---|---|
| 1.1-1.3 | `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\reception-panel\reception-panel.spec.ts` | Unit | ✅ | ✅ | ✅ |
| 2.1-3.3 | `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\reception-panel\reception-panel.spec.ts` | Unit | ✅ | ✅ | ✅ |
| 4.1-4.3 | `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\reception-panel\reception-panel.spec.ts` | Unit | ✅ | ✅ | ✅ |
| UX follow-up | `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\reception-panel\reception-panel.spec.ts` | Unit | ✅ | ✅ | ✅ |
| Phase 5 UX | `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\reception-panel\reception-panel.spec.ts` | Unit | ✅ | ✅ | ✅ |
| Phase 6 equipment cards | `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\reception-panel\reception-panel.spec.ts` | Unit | ✅ | ✅ | ✅ |

## Verification executed
- `npx tsc --noEmit -p tsconfig.spec.json` ✅
- `npm test -- --watch=false --browsers=ChromeHeadlessCI --include src/app/pages/reception-panel/reception-panel.spec.ts` ✅
  - Edge connected and ran `TOTAL: 19 SUCCESS`
  - warnings limited to the known Sass deprecations in the workspace

## Remaining
- Ready for `sdd-verify`
