# Change: Email service-order documents from Reception

## Why

Receptionists currently download the intake summary and linked receipt before sharing them manually. Both documents should be sent directly from the order when a customer email is registered.

## What changes

- Always show an email action for the intake summary.
- Show an email action for the linked electronic receipt whenever an active sale link exists.
- Ask for a validated one-time recipient when the order has no registered email.
- Reuse the existing electronic-billing delivery flow for receipts.
- Provide clear loading, success and failure feedback without closing the order context.
