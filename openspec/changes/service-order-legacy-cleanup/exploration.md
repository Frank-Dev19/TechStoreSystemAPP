## Exploration: service-order-legacy-cleanup

### Current State
The canonical domain term is `agreement`, and the current specs plus `docs/client-functional-contract.md` already treat `quote` as legacy compatibility only. The live service layer is mostly aligned: `ServiceOrderAgreementService` exposes agreement-first methods and keeps three legacy wrappers (`sendToClient`, `approveByClient`, `rejectByClient`) only for compatibility, but those wrappers are not referenced anywhere else in `src/app`. Manual payment is already functionally removed: `ServiceOrderService.markPaid()` throws by design, reception shows a warning instead of mutating payment state, and delivery gating now depends on linked billing evidence. The main risk is not the API surface but the UI concentration: `reception-panel.ts` (~3929 lines), `technician-panel.ts` (~1671 lines), and `supervisor-panel.ts` (~529 lines) still mix orchestration, view state, business rules, and legacy naming.

Current protections are real but uneven. Specs already lock the intended behavior for agreement terminology, derived agreements, grouped-billing delivery, batch order creation, and reception company/contact flows. Tests currently protect manual-payment removal (`service-order.service.spec.ts`, `reception-panel.spec.ts`), delivery/billing gating (`reception-panel.spec.ts`), derived agreement payload/rules (`technician-panel.spec.ts`), and the supervisor shift from quotes to orders (`supervisor-panel.spec.ts`). No contract mismatch was found that requires changing `docs/client-functional-contract.md` during exploration.

### Affected Areas
- `src/app/services/service-orders/service-agreement.service.ts` — defines the unused compatibility wrappers and a few legacy-named supersede aliases.
- `src/app/services/service-orders/service-order.service.ts` — keeps the explicit `markPaid()` failure contract and the dedicated delivery endpoint.
- `src/app/pages/reception-panel/reception-panel.ts` — largest legacy surface: quote-named state/methods, batch creation, client/contact resolution, billing-link gating, warranty derivation, and agreement creation all live together.
- `src/app/pages/reception-panel/reception-panel.spec.ts` — strongest regression coverage for payment removal, delivery gating, batch contact payloads, and initial agreement rules.
- `src/app/pages/technician-panel/technician-panel.ts` — derived agreement logic is concentrated here but already has extractable pure helper seams.
- `src/app/pages/technician-panel/technician-panel.spec.ts` — protects rediagnosis inheritance, locked inherited lines, delta payload semantics, and replacement messaging.
- `src/app/pages/supervisor-panel/supervisor-panel.ts` — mostly read-only, but still uses `quote` variable names in agreement list hydration and selection.
- `src/app/pages/supervisor-panel/supervisor-panel.spec.ts` — protects the user-facing shift to orders as the primary operational section.
- `openspec/specs/rediagnosis-agreement-versioning/spec.md` — canonical agreement-versioning contract for derived drafts.
- `openspec/specs/service-order-economic-workflow/spec.md` — canonical delivery-by-order economic coverage contract.
- `openspec/specs/technician-panel-workflow/spec.md` — locks multi-diagnosis and derived-agreement workflow behavior.
- `openspec/specs/reception-wizard-ui/spec.md` — locks company/contact behavior and transitional legacy fallback boundaries.
- `openspec/specs/service-order-management/spec.md` — locks explicit batch submission and per-order traceability.

### Approaches
1. **Facade-first cleanup slices** — Remove dead compatibility APIs and extract pure workflow helpers before broad renames.
   - Pros: Lowest regression risk; fits the 400-line review budget; creates testable seams before moving names.
   - Cons: Legacy `quote` naming remains temporarily in some UI state.
   - Effort: Medium

2. **Broad rename-and-decouple sweep** — Rename quote terminology and split panel logic in one larger pass.
   - Pros: Faster conceptual cleanup if it lands cleanly.
   - Cons: High review risk; touches many templates/tests/messages at once; easy to break behavior hidden in large components.
   - Effort: High

### Recommendation
Use **Facade-first cleanup slices**. Start with changes that are already behaviorally dead or locally provable: delete the unused service compatibility wrappers, isolate pure agreement-composer helpers from `technician-panel.ts`, and extract reception helpers for billing eligibility/client-contact resolution without changing behavior. After those seams exist, do targeted `quote`→`agreement` renames in the affected slice only. This keeps each PR reviewable and lets later proposal/spec/task phases map one safety net per slice.

### Risks
- `reception-panel.ts` mixes many domains, so small naming edits can unintentionally affect batch creation, billing-link gating, warranty creation, or client/contact hydration.
- Legacy `quote` names still appear in state, helper methods, tests, and SCSS selectors; renaming across TS/HTML/SCSS together can exceed the review budget quickly.
- Some user-facing messages still say “cotización” even where the domain is already “agreement”; product wording must be clarified before treating those as pure refactors.
- Delivery/payment behavior depends on billing links rather than local flags, so any cleanup around boleta/document linking must preserve `canDeliverItem()` and `canCreateBoletaFromOrder()` semantics.

### Ready for Proposal
Yes — propose small, behavior-locked slices: (1) remove unused agreement compatibility wrappers and align their tests, (2) extract technician agreement composer/derived-agreement helper logic to a pure module with existing spec-backed tests, and (3) extract reception client-contact/billing eligibility helpers before doing localized quote-to-agreement renames.
