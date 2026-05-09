# Tasks: Agreement Modal UI Refactor

## Phase 1: CSS Grid y Estilos Flat Admin (SCSS)

- [ ] 1.1 Limpiar `technician-panel.scss`: remover la extensión/mixin que aplica `.history-card` a `.agreement-item-card` y `.agreement-service-card`, eliminando `box-shadow` y efectos hover.
- [ ] 1.2 Refactorizar `.agreement-line-grid` en `technician-panel.scss` para tener 3 columnas fijas (ej. `minmax(0, 1fr) 100px 40px`) y forzar alineación derecha en las dos últimas.
- [ ] 1.3 Unificar `.agreement-field input` y `.ng-select-container` dentro del modal: establecer misma altura (`min-height: 48px`), mismos bordes (`1px solid $border`) y mismo focus ring.
- [ ] 1.4 Refactorizar `.agreement-empty-state` en `technician-panel.scss`: reemplazar borde `dashed` por borde sólido claro con fondo sutil (`#f8fafc`).

## Phase 2: Estructura HTML (Limpieza de Clases)

- [ ] 2.1 En `technician-panel.html` (líneas 466+): eliminar o sobrescribir la clase `history-card` de la etiqueta `section.agreement-service-card`.
- [ ] 2.2 En `technician-panel.html` (líneas 536+): eliminar la clase `history-card` del contenedor `div.agreement-item-card`.
- [ ] 2.3 Verificar en el HTML que las cabeceras "Concepto" y "Monto" usen el mismo contenedor `.agreement-line-grid` que los rows para asegurar la alineación matemática.

## Phase 3: Verificación Visual

- [ ] 3.1 Abrir el panel de técnico en el navegador, seleccionar una orden y abrir el modal "Gestionar acuerdo".
- [ ] 3.2 Agregar 2 productos adicionales y verificar que las tarjetas se apilen sin sombras (flat), y que todos los precios estén perfectamente alineados a la derecha de la columna "Monto".
- [ ] 3.3 Colapsar la vista a modo móvil (<=640px) y asegurar que el modal no colapse de forma ilegible (el grid debe apilarse correctamente).
