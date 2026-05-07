# service-order-sla-time-metrics-ui Specification

## Purpose

Definir la visibilidad SLA por rol para órdenes de servicio: el técnico ve resumen operativo; el supervisor trabaja desde una vista global de órdenes que concentra detalle operativo, acuerdo, SLA y acceso al chat.

## Requirements

### Requirement: Service orders SHALL expose backend SLA and time metrics in the frontend model

The frontend MUST model the `sla` and `timeMetrics` blocks returned by the backend `service-orders` contract.

#### Scenario: Backend-enriched service order is consumed by the app

- **GIVEN** the backend returns a `serviceOrder` with `sla` and `timeMetrics`
- **WHEN** the frontend deserializes `findAll` or `findOne`
- **THEN** the shared `ServiceOrder` model SHALL include those blocks
- **AND** the nested fields SHALL match the backend contract shape

### Requirement: Technician panel SHALL show only operational SLA summary for the selected order

The technician panel MUST show only the SLA data required to operate the assigned order and MUST NOT render derived time-metric cards in that role.

#### Scenario: Technician opens the SLA tab for an assigned order

- **GIVEN** the technician selects a service order
- **WHEN** the SLA detail renders
- **THEN** the UI SHALL show the current SLA stage
- **AND** the UI SHALL show `elapsedMinutes`, `remainingMinutes`, and `breached`

#### Scenario: Technician order has non-computable derived metrics

- **GIVEN** the selected order contains `timeMetrics` that are not computable
- **WHEN** the technician views the order detail
- **THEN** the UI SHALL NOT render derived metric cards such as diagnosis, service, resolution, or delivery time

### Requirement: Technician panel SHALL provide the approved card-and-detail layout

The technician panel MUST present assigned orders and selected-order detail using the approved operational layout.

#### Scenario: Technician navigates assigned orders

- **GIVEN** the technician opens the panel
- **WHEN** the screen renders
- **THEN** the panel SHALL show a hero header and status navigation pills
- **AND** the selected order SHALL render equipment information, operational SLA summary, and diagnosis history

### Requirement: Supervisor panel SHALL use orders as the primary operational view

The supervisor panel MUST use a dedicated `orders` view as the main supervision flow and SHALL NOT depend on `quotes` as the primary entry point for operational follow-up.

#### Scenario: Supervisor reviews all technicians' service orders

- **GIVEN** the supervisor opens the orders section
- **WHEN** the list loads
- **THEN** the UI SHALL show service orders without restricting results to a single technician
- **AND** each row or card SHALL expose enough context to identify the assigned technician

#### Scenario: Supervisor filters and pages the global order list

- **GIVEN** the supervisor is reviewing the orders section
- **WHEN** the supervisor applies filters or changes page
- **THEN** the UI SHALL update the visible orders accordingly
- **AND** the selected filters and pagination state SHALL remain consistent within that section

### Requirement: Supervisor order detail SHALL concentrate operational context

The selected order detail in supervisor MUST concentrate the operational information needed to supervise the order, including agreement context, SLA context, and access to the conversation channel.

#### Scenario: Supervisor inspects an order from the primary orders view

- **GIVEN** the supervisor selects a service order from `orders`
- **WHEN** the detail renders
- **THEN** the UI SHALL show service-order data, agreement-related data, and diagnosis context in the same operational flow
- **AND** the UI SHALL expose an action or embedded access path to the WhatsApp conversation of that order

### Requirement: Supervisor panel SHALL render full SLA and derived time metrics for the selected order

The supervisor panel MUST show the operational SLA summary and the complete derived time metrics for the selected service order.

#### Scenario: Supervisor inspects a selected order

- **GIVEN** the supervisor selects a service order from the global orders view
- **WHEN** the order detail renders
- **THEN** the UI SHALL show the current SLA stage
- **AND** the UI SHALL show `elapsedMinutes`, `remainingMinutes`, and `breached`
- **AND** the UI SHALL show `timeToDiagnosis`, `timeToServiceStart`, `timeToService`, `timeToResolution`, and `timeToDelivery`

#### Scenario: Supervisor inspects non-computable derived metrics

- **GIVEN** the selected order has derived metrics that cannot be computed yet
- **WHEN** the detail renders
- **THEN** the UI SHALL render those metrics distinctly from computable metrics instead of hiding them

### Requirement: Supervisor inbox MAY remain as a secondary shortcut

If the inbox section remains in the supervisor panel, it MUST behave as a secondary shortcut to conversations and SHALL NOT replace the primary supervision flow in `orders`.

#### Scenario: Supervisor opens inbox after orders is introduced

- **GIVEN** the supervisor panel still exposes `inbox`
- **WHEN** the supervisor enters that section
- **THEN** the section SHALL behave as a shortcut to conversations
- **AND** the main operational supervision flow SHALL remain centered on `orders`
