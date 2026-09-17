# QZ message signing

## Requirements

### Requirement: Configure trust before QZ connects

The browser MUST register the configured public certificate and a server-backed SHA-512 signature promise before making any QZ connection, discovery, or print call.

#### Scenario: Printing from an authenticated session

- **Given** the API has valid QZ signing files
- **When** an operator prints an equipment sticker
- **Then** Angular SHALL provide QZ with the public certificate
- **And** SHALL obtain every payload signature from the authenticated API
- **And** SHALL NOT contain the private key in browser assets
