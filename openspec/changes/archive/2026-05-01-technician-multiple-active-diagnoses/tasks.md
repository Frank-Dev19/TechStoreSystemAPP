# Tasks: technician-multiple-active-diagnoses

## Phase 1 — Panel logic
- [x] 1.1 Remove `orderInDiagnosis` / `currentOrderInDiagnosisId` logic from `technician-panel.ts`
- [x] 1.2 Remove the concurrency warning guard from `startDiagnosis(order)`
- [x] 1.3 Ensure diagnosis tab state still lists all `EN_DIAGNOSTICO` orders correctly

## Phase 2 — UI consistency
- [x] 2.1 Review `technician-panel.html` for any copy or conditional behavior implying a single active diagnosis
- [x] 2.2 Adjust any template logic that depended on the old single-active-diagnosis state

## Phase 3 — Tests
- [x] 3.1 Update existing specs that assert a single active diagnosis at a time
- [x] 3.2 Add or adapt a spec proving a technician can start diagnosis on a second eligible order
- [x] 3.3 Verify diagnosis tab behavior with multiple `EN_DIAGNOSTICO` orders

## Phase 4 — Verification
- [x] 4.1 Static review of `technician-panel.ts` and `technician-panel.html`
- [x] 4.2 Run focused technician panel spec file
- [x] 4.3 Update apply-progress / verify evidence


