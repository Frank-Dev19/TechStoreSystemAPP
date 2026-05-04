# Tasks: DocumentType client kind classification (APP)

## Phase 1: Contracts / Catalog UI
- [x] 1.1 Modify `TechStoreSystemAPP/src/app/models/document-types/document-types-request.ts` to add `kind` to save/update contracts.
- [x] 1.2 Modify `TechStoreSystemAPP/src/app/models/document-types/document-types-response.ts` to expose `kind` from catalog responses.
- [x] 1.3 RED: extend `TechStoreSystemAPP/src/app/pages/document-types/document-types.spec.ts` for create/edit with required `PERSON | COMPANY`.
- [x] 1.4 GREEN: modify `TechStoreSystemAPP/src/app/pages/document-types/document-types.ts` to add form control, payload mapping, and edit hydration for `kind`.
- [x] 1.5 GREEN: modify `TechStoreSystemAPP/src/app/pages/document-types/document-types.html` to render mandatory `kind` selector and validation.

## Phase 2: Consumer migration
- [x] 2.1 RED: extend `TechStoreSystemAPP/src/app/pages/clients/clients.spec.ts` to prefer `documentType.kind` and fallback only for legacy rows.
- [x] 2.2 GREEN: modify `TechStoreSystemAPP/src/app/pages/clients/clients.ts` to resolve PERSON/COMPANY from `documentType.kind` first.
- [x] 2.3 RED: extend `TechStoreSystemAPP/src/app/pages/reception-panel/reception-panel.spec.ts` to prefer `documentType.kind` and fallback only for legacy rows.
- [x] 2.4 GREEN: modify `TechStoreSystemAPP/src/app/pages/reception-panel/reception-panel.ts` to resolve PERSON/COMPANY from `documentType.kind` first.

## Phase 3: Verification / cleanup
- [x] 3.1 Verify `document-types` edit flow preserves existing `kind` when reopening records.
- [x] 3.2 Verify `clients` and `reception-panel` still work with catalog rows that temporarily lack `kind`.
- [x] 3.3 Review temporary fallback naming/comments so it remains explicitly transitional.
