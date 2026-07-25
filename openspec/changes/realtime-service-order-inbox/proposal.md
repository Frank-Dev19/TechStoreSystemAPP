# Proposal: Realtime service-order inbox

## Why

The open inbox does not react when WhatsApp delivers a new webhook message.

## What changes

- Subscribe to the API's authenticated SSE stream.
- Refresh only inbox data, preserving the current page and selected conversation.
- Reconnect automatically after transient disconnections.

## Rollback

Remove the stream subscription. Manual HTTP loading remains available.
