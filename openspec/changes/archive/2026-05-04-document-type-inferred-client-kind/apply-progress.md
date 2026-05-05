# Apply Progress: document-type-inferred-client-kind

## Status
Completed (all implementation tasks done)

## Completed Tasks
- [x] 1.1 Remove `.client-kind-toggle` div from `reception-panel.html`
- [x] 1.2 Optionally add non-interactive badge showing inferred kind after document type selector
- [x] 2.1 Verify `onDocumentTypeChange()` correctly infers `clientKind` (verified working)
- [x] 2.2 Ensure no other code patches `clientKind` manually (verified)
- [x] 2.3 Keep `clientKind` in form (per design decision)
- [x] 3.2 Add test: `documentType.kind = PERSON` → `clientKind = PERSON`
- [x] 3.3 Add test: `documentType.kind = COMPANY` → `clientKind = COMPANY`
- [x] 3.4 Add test: company fields hidden when `clientKind` is `PERSON`
- [x] 3.5 Add test: company fields visible when `clientKind` is `COMPANY`
- [x] 3.6 Run `npm test` - 21/21 SUCCESS

## Remaining Tasks
- None (core tasks complete)

## Notes
- La inferencia ya estaba implementada en `onDocumentTypeChange()` (líneas 858-869)
- El toggle manual en HTML fue removido completamente
- Badge opcional agregado después del selector de tipo de documento
- Tests actualizados: eliminados tests de toggle manual, agregados tests de inferencia automática
- karma.conf.js refactorizado para detectar Chrome o Edge automáticamente
- Tests 3.4 y 3.5 requirieron abrir el modal (`showCreateServiceOrderModal = true`) y configurar `createServiceOrderStep = 2`
- **Campos reordenados**: ahora el orden es 1) Tipo de documento, 2) Número, 3) Campos empresa (si COMPANY) — antes estaba al revés

## TDD Cycle Evidence
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | `reception-panel.spec.ts` | Unit | ✅ 21/21 | ✅ Written | ✅ Passed | ➖ Single | ➖ None needed |
| 3.2 | `reception-panel.spec.ts` | Unit | ✅ 21/21 | ✅ Written | ✅ Passed | ➖ Single | ➖ None needed |
| 3.3 | `reception-panel.spec.ts` | Unit | ✅ 21/21 | ✅ Written | ✅ Passed | ➖ Single | ➖ None needed |
| 3.4 | `reception-panel.spec.ts` | Unit | ✅ 21/21 | ✅ Written | ✅ Passed | ➖ Single | ➖ None needed |
| 3.5 | `reception-panel.spec.ts` | Unit | ✅ 21/21 | ✅ Written | ✅ Passed | ➖ Single | ➖ None needed |
