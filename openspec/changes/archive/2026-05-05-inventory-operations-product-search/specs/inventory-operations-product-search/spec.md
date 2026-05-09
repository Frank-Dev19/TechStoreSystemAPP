# Inventory Operations Product Search Specification

## Purpose

Definir la búsqueda remota de productos en Operaciones de `/inventory` sin cambiar la experiencia de la pestaña Products.

## Requirements

### Requirement: Remote search for inventory operations

The system MUST search products for entry, exit, and adjustment from the existing paginated catalog search endpoint, and MUST NOT depend on the full products list endpoint for these operation pickers.

#### Scenario: Search starts only after minimum input and debounce

- GIVEN the user is typing in any operations product picker
- WHEN the normalized query has fewer than 2 characters or the debounce window has not completed
- THEN the system SHALL NOT send a remote search request
- AND the picker SHALL remain in its local waiting state

#### Scenario: Search returns remote results for operations

- GIVEN the user stops typing a normalized query with 2 or more characters in entry, exit, or adjustment
- WHEN the debounce window completes
- THEN the system MUST request products from `GET /inventory/catalogs/products`
- AND the picker MUST show the returned remote results for that operation

### Requirement: Shared query cache across operation pickers

The system MUST reuse remote product results for repeated normalized queries across entry, exit, and adjustment, and MUST share the same search behavior across the three operation flows.

#### Scenario: Repeated query reuses cached results in another operation

- GIVEN one operations picker already resolved a normalized query successfully
- WHEN another operations picker searches the same normalized query again
- THEN the system SHALL reuse the cached product results
- AND the system SHALL NOT require a second remote fetch for that repeated query

#### Scenario: Cache stores product search results only

- GIVEN cached results exist for a normalized query
- WHEN a product from those results is later selected
- THEN the cache MAY provide the product list itself
- AND the system MUST treat stock data as non-cacheable for selection time

### Requirement: Fresh stock on selection without Products regression

The system MUST refresh current stock after a product is selected in entry, exit, or adjustment, and MUST preserve the existing behavior and UX of the Products tab.

#### Scenario: Selection refreshes stock from the stock service

- GIVEN the user selects a product from an operations search result
- WHEN the selection is applied to the operation form
- THEN the system MUST request current stock using `getCurrentStock(product.id)`
- AND the selected product context MUST reflect the fresh stock response

#### Scenario: Products tab remains unchanged

- GIVEN the operations search capability is enabled
- WHEN the user navigates to the Products tab
- THEN the system MUST preserve the existing Products search and listing experience
- AND the operations search change MUST NOT introduce new behavior there
