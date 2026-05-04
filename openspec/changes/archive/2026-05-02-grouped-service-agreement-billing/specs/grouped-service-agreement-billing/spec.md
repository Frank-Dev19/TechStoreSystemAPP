# grouped-service-agreement-billing Specification

## Purpose

Definir la experiencia de facturación agrupada de múltiples acuerdos de servicio desde ventas, manteniendo pago total por acuerdo y separando cliente operativo de contribuyente fiscal.

## Requirements

### Requirement: Grouped Agreement Selection in Sales

The sales flow MUST allow selecting multiple pending service agreements belonging to the same operational client and SHALL generate a single billing flow from that grouped selection.

#### Scenario: Selecting many agreements from the same operational client
- GIVEN the sales view lists pending service agreements
- WHEN the user starts grouped billing
- THEN the UI MUST allow selecting more than one agreement
- AND every selected agreement MUST belong to the same operational client

#### Scenario: Blocking mixed-client grouped billing
- GIVEN pending agreements from different operational clients
- WHEN the user attempts to combine them in one billing operation
- THEN the UI MUST block that grouped selection
- AND the user MUST receive feedback that only one operational client can be billed at a time

### Requirement: Full Settlement Per Agreement Only

The grouped billing flow MUST treat each selected agreement as fully settled or excluded, and SHALL NOT support partial settlement inside one agreement.

#### Scenario: Paying some agreements from a larger pending set
- GIVEN one operational client has three pending agreements
- WHEN the user selects only two of them for billing
- THEN the grouped bill MUST include only those two agreements
- AND each included agreement MUST be settled totally
- AND the unselected agreement MUST remain pending

#### Scenario: Blocking partial amount for one selected agreement
- GIVEN a grouped billing selection includes one agreement
- WHEN the user tries to pay less than the full amount of that agreement
- THEN the UI MUST reject the operation
- AND the user MUST receive feedback that agreements are billed in full or not selected

### Requirement: One Billable Service Line Per Agreement

The grouped billing flow MUST render one billable service line per selected agreement, and each line SHALL keep order-level traceability through its description.

#### Scenario: Rendering grouped service lines
- GIVEN the user selected many agreements for grouped billing
- WHEN the sales preview is built
- THEN the UI MUST show one service line per agreement
- AND each service line MUST use a description equivalent to `Servicio técnico - Orden SO2026...`

#### Scenario: Preserving repeated concepts across agreements
- GIVEN two selected agreements contain the same service concept or repeated items
- WHEN the grouped bill is prepared
- THEN the UI MUST keep separate lines per agreement
- AND it MUST NOT merge those lines only because their concept repeats

### Requirement: Taxpayer Resolution at Billing Time

The grouped billing flow MUST require choosing the fiscal document type at billing time, MUST resolve the taxpayer independently from the operational client, and SHALL persist the taxpayer choice for issuance.

#### Scenario: Choosing a receipt for a natural person taxpayer
- GIVEN the user starts grouped billing
- WHEN the user chooses `BOLETA`
- THEN the UI MUST request taxpayer identification suitable for a natural person flow
- AND the user MUST confirm or create the taxpayer used for billing

#### Scenario: Choosing an invoice for a company taxpayer
- GIVEN the user starts grouped billing
- WHEN the user chooses `FACTURA`
- THEN the UI MUST request taxpayer identification suitable for a company flow
- AND the user MUST confirm or create the taxpayer used for billing

#### Scenario: Operational client differs from taxpayer
- GIVEN the operational client from the service orders is not the same person or company that will receive the tax document
- WHEN the user resolves billing taxpayer data
- THEN the grouped billing flow MUST allow that taxpayer selection
- AND it MUST NOT require the taxpayer to match the operational client record
