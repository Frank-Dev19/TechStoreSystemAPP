## Exploration: agreement-modal-refactor

### Current State
El modal de "Gestionar acuerdo" (`.agreement-modal`) en el panel del técnico se encarga de crear o actualizar acuerdos de cotización con los clientes. Actualmente tiene una estructura visual desordenada:
- Uso mixto de clases `.history-card` para elementos de formulario, lo que añade sombras y efectos de elevación innecesarios.
- La "tabla" de Servicio Fijo (`.agreement-line-grid`) no alinea correctamente sus columnas (el input de monto queda flotando lejos de su cabecera).
- Los inputs, `ng-select` y contenedores de solo lectura tienen alturas y estilos de borde inconsistentes.
- Los espacios (padding/margin) entre las cabeceras de sección y los campos de formulario están desbalanceados.
- El estado vacío de productos adicionales tiene un estilo dashed que rompe con la limpieza de un diseño corporativo.

### Affected Areas
- `src/app/pages/technician-panel/technician-panel.html` — Estructura del modal (clases `agreement-modal`, `agreement-service-card`, `agreement-item-card`, etc.).
- `src/app/pages/technician-panel/technician-panel.scss` — Estilos del modal y sus secciones internas.

### Approaches
1. **Flat Admin Harmony Refactor (Recommended)** 
   - Limpiar el SCSS eliminando `box-shadow` y transiciones de hover en las tarjetas de edición (`.agreement-item-card`).
   - Reestructurar `.agreement-line-grid` con `grid-template-columns` estrictos para alinear las cabeceras con los inputs numéricos y las etiquetas de moneda.
   - Unificar el diseño de los controles de formulario (`input`, `ng-select`, `textarea`) a un estándar "Flat Admin" (bordes sólidos suaves, focus con ring del color primario, sin sombras).
   - Convertir los "chips" de lectura en badges más sutiles (fondo `#f8fafc` o similar) integrados en la tarjeta.
   - Pros: Modal limpio, lectura clara, inputs evidentes. Mantiene la funcionalidad intacta.
   - Cons: Requiere ajustar bastantes clases en HTML y CSS.
   - Effort: Medium

### Recommendation
Aplicar el **Flat Admin Harmony Refactor**. El objetivo es que parezca un formulario corporativo de facturación/cotización, no una colección de tarjetas interactivas. Todas las tarjetas de productos deben volverse "flat panels" (paneles planos con bordes sutiles y fondo sólido), los campos de monto deben tener alineación a la derecha matemática, y el botón de cancelar del footer debe alinear perfectamente con las acciones principales.

### Risks
- Romper el responsive design en pantallas móviles (`@media (max-width: 640px)`), ya que el grid actual colapsa a 1 columna. Hay que asegurar que el nuevo grid también sea responsivo.
- Interferir con el comportamiento de `ng-select` al intentar sobreescribir sus alturas y bordes.

### Ready for Proposal
Yes — Estamos listos para generar la propuesta y seguir con el ciclo SDD interactivo.
