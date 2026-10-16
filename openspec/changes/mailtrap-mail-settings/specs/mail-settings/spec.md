## ADDED Requirements
### Requirement: Transport-aware administration
The mail settings page SHALL show the transport reported by the API without exposing API credentials.
#### Scenario: Mailtrap is selected
- GIVEN a Mailtrap profile is loaded
- WHEN the administrator edits sender and content
- THEN SMTP inputs SHALL be hidden and SMTP credentials SHALL NOT be required.
#### Scenario: API test or missing token
- GIVEN Mailtrap is selected
- WHEN no test recipient or no configured API token is present
- THEN the page SHALL prevent the corresponding test or save and explain the missing setting.
#### Scenario: Existing SMTP installation
- GIVEN the profile reports SMTP or does not specify a transport
- WHEN saving settings
- THEN existing SMTP validation SHALL remain active.
