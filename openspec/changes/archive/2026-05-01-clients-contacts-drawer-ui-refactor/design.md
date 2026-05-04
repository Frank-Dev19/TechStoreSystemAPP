# Design: clients-contacts-drawer-ui-refactor

## Decisions
- Mantener `clients.ts` como source of behavior
- Concentrar el cambio en `clients.html` y `clients.scss`
- Separar el drawer en dos bloques visuales claros: contactos registrados y nuevo contacto

## UI Strategy
- Header con mayor contexto y jerarquía
- Empty state con iconografía y mensaje más intencional
- Cards de contacto con mejor densidad, badge principal y metadatos más legibles
- Footer consistente con nota contextual y CTA principal
