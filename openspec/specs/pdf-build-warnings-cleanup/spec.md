# pdf-build-warnings-cleanup Specification

## Purpose

Reducir warnings de build asociados a la cadena PDF sin alterar los layouts PDF ya consolidados del sistema.

## Requirements

### Requirement: The frontend SHALL preserve existing PDF generation behavior

The application MUST keep the current PDF generation flows working with their existing layouts while cleanup is applied.

#### Scenario: Existing PDF flow remains available after cleanup

- **GIVEN** a module currently generates a PDF using the existing implementation
- **WHEN** the cleanup change is applied
- **THEN** the module SHALL keep generating the PDF
- **AND** the cleanup SHALL NOT require redesigning the document layout

### Requirement: Unused PDF dependencies SHALL be removed when they have no real usage

The application MUST remove PDF-related dependencies or imports that are verified as unused in real code paths.

#### Scenario: Inventory imports an unused PDF helper

- **GIVEN** `inventory.ts` imports a PDF-related dependency
- **WHEN** that symbol has no real usage in the file or in the associated flow
- **THEN** the import SHALL be removed
- **AND** the dependency MAY be removed from the package manifest if no other active code path needs it

### Requirement: The cleanup SHALL keep the current PDF engine where layouts depend on it

The application MUST preserve `jspdf` and `jspdf-autotable` in flows where they still back established document layouts.

#### Scenario: Sales or service-order PDF layout depends on jsPDF

- **GIVEN** an existing sales or service-order PDF flow uses `jspdf` and `jspdf-autotable`
- **WHEN** the cleanup is implemented
- **THEN** those libraries SHALL remain in place for that flow
- **AND** the change SHALL NOT replace the PDF engine as part of this cleanup

### Requirement: Build verification SHALL measure the resulting warning surface

The change MUST be verified through a production build to determine which warnings disappear and which warnings remain due to still-needed dependencies.

#### Scenario: Build runs after PDF cleanup

- **GIVEN** the PDF cleanup has been applied
- **WHEN** `npm run build` is executed
- **THEN** the verification SHALL record whether warnings tied to removed unused dependencies disappeared
- **AND** any remaining warnings SHALL be documented as accepted technical debt only if they come from still-required dependencies
