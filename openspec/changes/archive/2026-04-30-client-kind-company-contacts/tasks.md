# Tasks: Client kind and company contacts

## Phase 1: Foundation / Data Model

- [x] 1.1 Modify `TechStoreSystemAPI/src/clients/entities/client.entity.ts` to add `kind` and relation to `ClientContact`.
- [x] 1.2 Create `TechStoreSystemAPI/src/clients/entities/client-contact.entity.ts` with `clientId`, `name`, `email`, `phone`, `isPrimary`, and `isActive`.
- [x] 1.3 Modify `TechStoreSystemAPI/src/service-orders/entities/service-order.entity.ts` to persist `clientContactId` plus current contact snapshots.
- [x] 1.4 Add/update backend DTOs in `src/clients/*.dto.ts` and `src/service-orders/dto/create-service-order.dto.ts` for `kind`, contact payloads, and `clientContactId`.

## Phase 2: Backend Logic (existing scope)

- [x] 2.1 RED: add Nest tests for `ClientService` covering `PERSON`, `COMPANY`, first contact as primary, and primary replacement.
- [x] 2.2 GREEN: modify `TechStoreSystemAPI/src/clients/client.service.ts` to validate `kind`, persist company contacts, and enforce single primary contact.
- [x] 2.3 RED: add `ServiceOrderService` tests for company orders selecting a contact and persisting `clientContactId` + snapshot.
- [x] 2.4 GREEN: modify `TechStoreSystemAPI/src/service-orders/services/service-order.service.ts` to resolve selected contact, apply snapshot overrides, and fallback for person clients.
- [x] 2.5 Update backend read models/controllers so company clients return related contacts needed by the wizard.

## Phase 3: Frontend Contracts and Wizard (existing scope)

- [x] 3.1 Modify `TechStoreSystemAPP/src/app/models/clients-request.ts` and `clients-response.ts` to expose `kind` and company contacts.
- [x] 3.2 Modify `TechStoreSystemAPP/src/app/models/service-orders/service-order-request.ts` to include `clientContactId`.
- [x] 3.3 RED: add Angular tests/helpers for reception wizard flows `PERSON`, `COMPANY`, primary preselection, and company without contacts.
- [x] 3.4 GREEN: refactor `TechStoreSystemAPP/src/app/pages/reception-panel/reception-panel.ts` to separate person/company creation, load contacts, and submit one selected contact.
- [x] 3.5 Modify `TechStoreSystemAPP/src/app/pages/reception-panel/reception-panel.html` to render distinct sections for person data, company data, contact selection, and inline contact creation.

## Phase 4: Verification of existing scope

- [x] 4.1 Verify lookup/autocomplete in `reception-panel.ts` preserves legacy person behavior and stops mapping company contact names into legal-name fields.
- [x] 4.2 Verify existing company clients without contacts are blocked until one contact is created and primary is preselected afterward.
- [x] 4.3 Verify non-DNI/RUC handling stays on the temporary fallback path and document that `DocumentType` classification is deferred to another change.

## Phase 5: Cleanup / Documentation of existing scope

- [x] 5.1 Update `design.md` notes/open questions to reflect that `ServiceOrder` now persists `clientContactId` and `DocumentType` classification stays out of scope.
- [x] 5.2 Review API/frontend naming for consistency (`PERSON`, `COMPANY`, `ClientContact`, `clientContactId`) and remove transitional assumptions tied only to DNI/RUC.

## Phase 6: Backend hardening for atomic company create

- [x] 6.1 RED: add Nest tests proving `COMPANY` create rejects missing contacts without persisting the client record.
- [x] 6.2 RED: add Nest tests proving a failure during contact persistence rolls back company creation.
- [x] 6.3 GREEN: refactor `TechStoreSystemAPI/src/clients/client.service.ts` so company creation is atomic and no orphan client remains if contacts fail.

## Phase 7: Clients view company creation + contacts management

- [x] 7.1 RED: add Angular tests for `clients` covering company create with first contact, block without contact, and company-only contact action visibility.
- [x] 7.2 GREEN: extend `TechStoreSystemAPP/src/app/pages/clients/clients.ts` form model and payload mapping to support `kind` plus first company contact at create time.
- [x] 7.3 GREEN: modify `TechStoreSystemAPP/src/app/pages/clients/clients.html` so company creation collects legal data and at least one contact inline.
- [x] 7.4 GREEN: add company-only row action in `clients` to open contact management.
- [x] 7.5 GREEN: implement contact-management drawer/modal state and CRUD wiring in `clients.ts` for listing contacts, adding contacts, and switching primary.
- [x] 7.6 GREEN: implement contact-management UI in `clients.html` for company contact administration.

## Phase 8: Reception wizard refinement for read-only company master data

- [x] 8.1 RED: add Angular tests proving existing company legal data becomes read-only in the order flow while contact selection/creation remains editable.
- [x] 8.2 GREEN: refine `TechStoreSystemAPP/src/app/pages/reception-panel/reception-panel.ts` so existing company legal fields are hydrated from master data and no longer editable from the order flow.
- [x] 8.3 GREEN: refine `TechStoreSystemAPP/src/app/pages/reception-panel/reception-panel.html` to keep inline contact creation in focus without secondary modal stacking.

## Phase 9: Final integration / verification of expanded scope

- [x] 9.1 Verify company create from `clients` sends first contact together with master data and no 400/orphan client remains.
- [x] 9.2 Verify company-only contact management in `clients` allows adding contacts later and switching primary.
- [x] 9.3 Verify existing company order flow uses master legal data as read-only and still snapshots the selected operational contact.
- [x] 9.4 Re-run focused backend/frontend tests and update `verify-report.md` with the expanded-scope evidence.
