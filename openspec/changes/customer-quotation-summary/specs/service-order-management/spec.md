## ADDED Requirements

### Requirement: Customer quotation summary field
The UI MUST provide a labelled customer summary per equipment quotation, limited to 500 characters, with inline help explaining that it is the single concept visible to the customer. It MUST send the summary to the API and preserve it in saved intake drafts and revisions.

#### Scenario: Draft versus send
- GIVEN a technician composing a quotation
- WHEN the summary is empty
- THEN saving a draft MUST remain available
- AND sending MUST be blocked with an actionable message.

#### Scenario: Express intake
- GIVEN multiple Express equipment items
- WHEN the operator advances to confirmation
- THEN every equipment MUST have a valid customer summary
- AND each summary and calculated total MUST be visible before submission.

#### Scenario: Existing version
- GIVEN a quotation loaded for editing or history
- WHEN its version has a summary
- THEN the field MUST show that version's summary and follow its editability.
