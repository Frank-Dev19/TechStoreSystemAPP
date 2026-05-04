## Exploration: refactorizar la UI del wizard del panel de recepción

### Current State
El wizard de creación de orden de servicio (`reception-panel.html` y `reception-panel.scss`) actualmente utiliza un diseño con muchos degradados (radial y linear gradients), box-shadows pronunciados y bordes redondeados/animaciones de elevación. El hero del wizard tiene fondos radiales y los pasos (steps) saltan hacia arriba (`translateY(-1px)`) con sombras expansivas (`0 14px 28px`) al activarse, dándole un estilo visual ruidoso para un panel administrativo.

### Affected Areas
- `src/app/pages/reception-panel/reception-panel.html` — Posibles ajustes mínimos de marcado para estructurar mejor el estilo flat (opcional).
- `src/app/pages/reception-panel/reception-panel.scss` — Clases principales afectadas: `.wizard-hero`, `.wizard-step-row`, `.wizard-step`, y `.wizard-empty-quote-state`.

### Approaches
1. **Refactorización a Flat Admin Style (Recomendada)** — Actualizar los estilos SCSS para eliminar degradados y transiciones excesivas. Usar fondos sólidos muy suaves (tints de la paleta actual), bordes de un solo pixel sin sombras extremas, y un layout más "plano" y corporativo. Las clases de paso activo usarán una franja sólida o color de fondo en lugar de elevarse como tarjetas.
   - Pros: Menos riesgo, respeta el layout actual, se adapta perfectamente a la paleta de colores.
   - Cons: Puede dejar otras partes del sistema viéndose "desactualizadas" en comparación.
   - Effort: Low

2. **Reestructuración Layout Sidebar (Full Admin)** — Mover los pasos del wizard a un sidebar lateral izquierdo y el contenido a la derecha.
   - Pros: Aspecto "admin" puro y tradicional.
   - Cons: Mayor riesgo de regresiones en responsive design y formularios; modifica fuertemente el HTML.
   - Effort: High

### Recommendation
Se recomienda la **Opción 1**. El requerimiento especifica explícitamente "con un estilo flat admin", lo que apunta a aplanar texturas, remover degradados y sombras, y preferir bordes y sólidos suaves. Se modificará la capa de presentación (SCSS) de las clases `wizard-*` sin reconstruir drásticamente el DOM, priorizando la estabilidad del componente.

### Risks
- Inconsistencia visual si el modal mantiene botones hiper-redondeados pero los paneles son flat. Habrá que ajustar sutilmente los inputs/botones dentro de la clase `.create-service-order-body` para no desentonar.
- El contraste de textos (eyebrow, origin-badge) en el hero debe ser verificado al cambiar el fondo a un color plano.

### Ready for Proposal
Yes — Estamos listos para armar la propuesta (`sdd-propose`).
