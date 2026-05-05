# Tasks: document-type-inferred-client-kind

## Phase 1: UI Removal

- [x] 1.1 Remove `.client-kind-toggle` div (lines 792-814) from `reception-panel.html`
- [x] 1.2 Optionally add non-interactive badge showing inferred kind after document type selector
- [x] 1.3 Verify company fields (companyName, companyTradeName) still show/hide based on `clientKind === COMPANY`

## Phase 2: Form Logic Cleanup

- [x] 2.1 Verify `onDocumentTypeChange()` in `reception-panel.ts` correctly infers `clientKind` from `documentType.kind`
- [x] 2.2 Ensure no other code patches `clientKind` manually (check `applyPartnerData()` and others)
- [x] 2.3 Keep `clientKind` in form (per design decision)

## Phase 3: Testing

- [x] 3.1 Update `reception-panel.spec.ts`: remove tests for manual toggle clicks
- [x] 3.2 Add test: select document type with `kind: PERSON` → `clientKind` becomes `PERSON`
- [x] 3.3 Add test: select document type with `kind: COMPANY` → `clientKind` becomes `COMPANY`
- [x] 3.4 Add test: company fields hidden when `clientKind` is `PERSON`
- [x] 3.5 Add test: company fields visible when `clientKind` is `COMPANY`
- [x] 3.6 Run `npm test` and verify all tests pass
