## Implementation Progress

**Change**: `document-type-client-kind`  
**Mode**: Strict TDD

### Completed Tasks
- [x] 1.1 Modify `TechStoreSystemAPP/src/app/models/document-types/document-types-request.ts` to add `kind` to save/update contracts.
- [x] 1.2 Modify `TechStoreSystemAPP/src/app/models/document-types/document-types-response.ts` to expose `kind` from catalog responses.
- [x] 1.3 RED: extend `TechStoreSystemAPP/src/app/pages/document-types/document-types.spec.ts` for create/edit with required `PERSON | COMPANY`.
- [x] 1.4 GREEN: modify `TechStoreSystemAPP/src/app/pages/document-types/document-types.ts` to add form control, payload mapping, and edit hydration for `kind`.
- [x] 1.5 GREEN: modify `TechStoreSystemAPP/src/app/pages/document-types/document-types.html` to render mandatory `kind` selector and validation.
- [x] 2.1 RED: extend `TechStoreSystemAPP/src/app/pages/clients/clients.spec.ts` to prefer `documentType.kind` and fallback only for legacy rows.
- [x] 2.2 GREEN: modify `TechStoreSystemAPP/src/app/pages/clients/clients.ts` to resolve PERSON/COMPANY from `documentType.kind` first.
- [x] 2.3 RED: extend `TechStoreSystemAPP/src/app/pages/reception-panel/reception-panel.spec.ts` to prefer `documentType.kind` and fallback only for legacy rows.
- [x] 2.4 GREEN: modify `TechStoreSystemAPP/src/app/pages/reception-panel/reception-panel.ts` to resolve PERSON/COMPANY from `documentType.kind` first.
- [x] 3.1 Verify `document-types` edit flow preserves existing `kind` when reopening records.
- [x] 3.2 Verify `clients` and `reception-panel` still work with catalog rows that temporarily lack `kind`.
- [x] 3.3 Review temporary fallback naming/comments so it remains explicitly transitional.

### Files Changed
| File | Action | What Was Done |
|------|--------|---------------|
| `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\models\document-types\document-types-request.ts` | Modified | Added runtime/type-safe `DocumentTypeKind` and included `kind` in save payloads. |
| `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\models\document-types\document-types-response.ts` | Modified | Exposed `kind` from catalog responses. |
| `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\document-types\document-types.ts` | Modified | Added form control, edit hydration, and payload mapping for `kind`. |
| `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\document-types\document-types.html` | Modified | Rendered mandatory client-kind selector with validation. |
| `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\document-types\document-types.spec.ts` | Modified | Added focused tests for required kind on create/edit flow. |
| `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\clients\clients.ts` | Modified | Switched client-kind resolution to `documentType.kind` first, leaving legacy fallback as transition. |
| `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\clients\clients.spec.ts` | Modified | Added tests for primary contract usage and legacy fallback behavior. |
| `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\reception-panel\reception-panel.ts` | Modified | Switched wizard client-kind resolution to `documentType.kind` first, leaving legacy fallback as transition. |
| `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\reception-panel\reception-panel.spec.ts` | Modified | Added tests for primary contract usage and legacy fallback behavior in reception flow. |

### TDD Cycle Evidence
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.3 | `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\document-types\document-types.spec.ts` | Unit | ✅ Existing spec extended | ✅ Written | ✅ Passed | ✅ create + edit + validation | ✅ Replaced brittle stub with spy-based stub |
| 1.4 | `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\document-types\document-types.spec.ts` | Unit | ✅ Same spec after RED | ✅ Covered | ✅ Passed | ✅ payload + hydration | ✅ Clean |
| 2.1 | `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\clients\clients.spec.ts` | Unit | ✅ Existing spec extended | ✅ Written | ✅ Passed | ✅ kind-first + null fallback | ✅ Clean |
| 2.2 | `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\clients\clients.spec.ts` | Unit | ✅ Same spec after RED | ✅ Covered | ✅ Passed | ✅ company vs person precedence | ✅ Clean |
| 2.3 | `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\reception-panel\reception-panel.spec.ts` | Unit | ✅ Existing spec extended | ✅ Written | ✅ Passed | ✅ kind-first + null fallback | ✅ Clean |
| 2.4 | `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\reception-panel\reception-panel.spec.ts` | Unit | ✅ Same spec after RED | ✅ Covered | ✅ Passed | ✅ wizard inference paths | ✅ Clean |

### Test Summary
- **Total tests run**: 29
- **Total tests passing**: 29
- **Commands**:
  - `npm test -- --watch=false --browsers=ChromeHeadless --include src/app/pages/document-types/document-types.spec.ts`
  - `npm test -- --watch=false --browsers=ChromeHeadless --include src/app/pages/clients/clients.spec.ts`
  - `npm test -- --watch=false --browsers=ChromeHeadless --include src/app/pages/reception-panel/reception-panel.spec.ts`
  - `npx tsc --noEmit -p tsconfig.spec.json`

### Deviations from Design
- Ninguna relevante. Se mantuvo el fallback legado, pero quedó acotado a `kind == null`.

### Issues Found
- `document-types.spec.ts` tenía un stub no compatible con expectativas `toHaveBeenCalledWith`; se corrigió usando spies reales para sostener el safety net.
- Persisten warnings de Sass deprecated del proyecto y Bootstrap, pero no bloquean este change.

### Remaining Tasks
- None.

### Status
12/12 tasks complete. Ready for verify.
