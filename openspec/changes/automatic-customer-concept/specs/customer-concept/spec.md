# Vista previa del concepto

The quotation composers SHALL display a read-only automatic concept and the final total. They MUST NOT require a manually entered customer summary.

Given technical service and two RAM, when reception or the technician modifies the quotation, then the preview SHALL show `Servicio técnico + 2 RAM` and update its amount using existing pricing rules.

Given a valid quotation with no manual summary, when it is saved or sent, then the frontend SHALL submit the detailed lines without a summary requirement. The backend SHALL derive the authoritative concept.
