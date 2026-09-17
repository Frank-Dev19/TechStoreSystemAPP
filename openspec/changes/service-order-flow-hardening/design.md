# Design

- The saved reception draft includes the exact disabled customer controls. Legacy v2 drafts with a selected client conservatively lock those fields.
- Diagnosis metrics and diagnosis copy appear only for diagnosis and warranty orders. Express and assembly orders begin at execution and do not show an empty diagnosis state.
- Inventory operations are a property of the surface as well as the user permission. The technician surface disables them even when an administrator is viewing that route.
- The sale modal loads the latest confirmed agreement and uses its total. The order commitment remains a fallback for temporary API failures.
- Guide and material operations are removed from the sale modal. Commercial lines are available through a compact `details` disclosure.
- Base component CSS targets narrow viewports. Layout columns are added at 481 px, 576 px, 769 px, and 1381 px according to each component's content needs.
