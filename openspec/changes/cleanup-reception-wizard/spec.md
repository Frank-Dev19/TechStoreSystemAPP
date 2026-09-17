# Requirements
The creation wizard MUST only accept STANDARD_SERVICE, DIAGNOSIS and ASSEMBLY. It MUST NOT render warranty/customer-service-specific step copy or restore drafts of retired types.

## Scenario: Retired type
Given a warranty or customer-service form value, when validating creation or restoring a draft, then the wizard rejects it.

## Scenario: Supported flow
Given Standard or Assembly, the initial quote step remains; given Diagnosis, the standard diagnostic steps remain. Existing-order handling is unchanged.
