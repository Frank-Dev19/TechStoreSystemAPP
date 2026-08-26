# Equipment sticker printing

## Requirements

### Requirement: Sticker action belongs to one equipment

The reception panel MUST expose sticker printing from each equipment card and MUST NOT expose the former order-level sticker action.

#### Scenario: Open print quantity for an equipment

- **Given** an order with multiple equipment items
- **When** the receptionist selects `Imprimir sticker` on one card
- **Then** the quantity dialog SHALL identify that equipment by code and description
- **And** the resulting job SHALL contain only that equipment data

### Requirement: Copy quantity is bounded

The quantity dialog MUST accept an integer from 1 through 50 and MUST prevent invalid jobs.

#### Scenario: Invalid quantity

- **Given** an open sticker dialog
- **When** the receptionist enters zero, a decimal, or more than 50
- **Then** the application SHALL show an inline validation message
- **And** it SHALL NOT send a print job

### Requirement: Brother label dimensions

The generated sticker MUST be 62 mm wide and 35 mm high and SHOULD preserve content inside the QL-700 printable width.

#### Scenario: Render a sticker

- **Given** a selected equipment item
- **When** the PDF data is generated
- **Then** it SHALL include the customer, equipment description, serial, accessories, notes, reported issue, and reception timestamp
- **And** it SHALL display the general service-order code as the primary identifier
- **And** it SHALL NOT display the equipment item's suffixed code or a customer phone number
- **And** it SHOULD use outlines and typography instead of large solid fills to reduce thermal-media consumption
- **And** the header SHALL place the general order code and reception date on one line with matching typography
- **And** it SHALL omit the redundant `Macrochips / Recepción` caption

### Requirement: Direct local printing

The application MUST use QZ Tray to send the PDF to the installed Brother QL-700 using the chosen copy count.

#### Scenario: QZ Tray is unavailable

- **Given** QZ Tray is not running or the printer is unavailable
- **When** the receptionist confirms printing
- **Then** the dialog SHALL remain open
- **And** a useful error SHALL explain what local component or printer is missing
