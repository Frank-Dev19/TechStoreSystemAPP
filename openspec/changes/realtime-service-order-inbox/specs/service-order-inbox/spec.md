# Service order inbox realtime delta

## ADDED Requirements

### Requirement: Live inbox updates

The inbox MUST update its thread list and selected conversation after an `inbox.changed` event without navigating or reloading the page.

#### Scenario: New inbound message while a conversation is open

- **GIVEN** an operator has a conversation open
- **WHEN** the API emits `inbox.changed`
- **THEN** the inbox MUST request the selected conversation again
- **AND** it MUST preserve the selected thread and draft

#### Scenario: Stream disconnects

- **GIVEN** the inbox stream disconnects unexpectedly
- **WHEN** the operator remains on the inbox page
- **THEN** the client MUST reconnect automatically
