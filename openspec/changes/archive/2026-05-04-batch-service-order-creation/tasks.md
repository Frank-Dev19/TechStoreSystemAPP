# Tasks: batch-service-order-creation (APP)

## Phase 1 — Wizard state model
- [x] 1.1 Introduce shared context + candidate order collection in reception wizard
- [x] 1.2 Allow add/edit/remove candidate orders before confirmation
- [x] 1.3 Preserve visual separation and traceability per candidate

## Phase 2 — Batch contract integration
- [x] 2.1 Add frontend batch request/response models
- [x] 2.2 Submit one explicit batch request from reception wizard
- [x] 2.3 Handle created orders as individual results after submission

## Phase 3 — Wizard review UX
- [x] 3.1 Add review step that summarizes shared context
- [x] 3.2 Show each candidate order independently before confirmation
- [x] 3.3 Keep compatibility with later grouped billing without mixing flows

## Phase 5 — UX refinements (continuation)
- [x] 5.1 Show "Add another team" button from first visit to Teams step (remove condition length > 0)
- [x] 5.2 Remove Edit/Remove buttons from Teams cards in Confirmation step (read-only)
- [x] 5.3 Adjust footer buttons in Confirmation step: Cancel, Previous, X (close), Create order(s)

## Phase 6 — Add equipment form flow
- [x] 6.1 Show saved equipment cards above form when "Agregar otro equipo" is clicked
- [x] 6.2 Display a separate empty form for each new equipment added
- [x] 6.3 Each saved card has delete button (X) in top-right corner
- [x] 6.4 Minimum 1 equipment required validation

## Phase 6.1 — Fix button spacing and flow
- [x] 6.1.1 Add margin-top/margin-bottom to "Agregar otro equipo" button
- [x] 6.1.2 Show equipment cards immediately when button is clicked (not after advancing)
- [x] 6.1.3 Display a new empty form after clicking the button

## Phase 7 — Verification
- [ ] 7.1 Re-run frontend tests and type-check
