# direct-service-order-sale Specification

## Requirements

### Requirement: Direct sale from an eligible service order

The reception panel MUST expose a direct sale action only for an eligible service order without an active linked sale.

#### Scenario: Receptionist opens the direct sale modal

- **GIVEN** an eligible service order with a confirmed current quote
- **WHEN** the operator selects `Realizar venta`
- **THEN** the system MUST open a modal anchored to that order
- **AND** the operator MUST NOT need to copy or search for the order code

#### Scenario: Operator confirms the sale

- **GIVEN** a selected taxpayer, document type and payment method
- **WHEN** the operator confirms the modal
- **THEN** the frontend MUST submit the selected order to `POST /sales/from-service-agreements`
- **AND** the modal MUST close only after a successful response

#### Scenario: Invoice taxpayer is invalid

- **GIVEN** the document type is `FACTURA`
- **AND** the selected taxpayer does not have a RUC
- **WHEN** the operator attempts to confirm
- **THEN** the frontend MUST block the request and explain that a RUC is required

### Requirement: General sales remain product-only

The general `Realizar venta` screen MUST NOT expose a service-order sale mode.

#### Scenario: Operator opens general sale creation

- **WHEN** the operator opens the general sale form
- **THEN** the form MUST display only the manual product-sale workflow
- **AND** it MUST NOT display order search or service-order mode controls
