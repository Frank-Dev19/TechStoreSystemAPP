# Tasks: Refactorizar UI del Wizard del Panel de Recepción

## Phase 1: CSS/SCSS Refactoring

- [x] 1.1 Modificar `.wizard-hero` en `src/app/pages/reception-panel/reception-panel.scss`: Remover `radial-gradient` y `linear-gradient`, aplicar un color de fondo sólido, y ajustar bordes a 1px sólido (sin sombras difusas).
- [x] 1.2 Modificar `.wizard-step` en `src/app/pages/reception-panel/reception-panel.scss`: Eliminar la transición `transform: translateY(-1px)` y los `box-shadow` expansivos (como `0 14px 28px`). Usar colores sólidos (`$accent`, `$success` con opacidad) para los estados `.active` y `.completed`.
- [x] 1.3 Refinar `.wizard-empty-quote-state` y elementos circundantes en `src/app/pages/reception-panel/reception-panel.scss` para asegurar un look flat consistente sin bordes excesivamente redondeados ni texturas 3D.

## Phase 2: HTML Refinements & Validation

- [x] 2.1 Verificar en `src/app/pages/reception-panel/reception-panel.html` que el texto dentro del hero (`.wizard-eyebrow`, `h3`, `.wizard-origin-badge`) tenga suficiente contraste de lectura contra el nuevo fondo sólido.
- [x] 2.2 Hacer ajustes menores en la estructura de clases del HTML si algún margen/padding se ve afectado por el cambio de elevaciones y sombras.

## Phase 3: Testing / Verification

- [x] 3.1 Visualizar el modal renderizado localmente en el panel de recepción para confirmar que los escenarios detallados en el `spec` se cumplan estrictamente.
