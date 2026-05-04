# Proposal: Agreement Modal UI Refactor

## Intent

Refactorizar visualmente el modal de "Gestionar acuerdo" (`.agreement-modal`) en el panel del técnico para adoptar un estilo corporativo limpio (Flat Admin). Actualmente, el modal tiene un diseño desordenado con uso innecesario de sombras de elevación, alineaciones rotas en los precios, inconsistencias en los tamaños de inputs y márgenes desbalanceados.

## Scope

### In Scope
- Eliminar `box-shadow` y efectos de hover (elevación) en los elementos de formulario del acuerdo.
- Arreglar el CSS Grid (`.agreement-line-grid`) para alinear perfectamente cabeceras, precios numéricos y moneda.
- Unificar estilos visuales de inputs nativos, `ng-select` y textareas (bordes, focus rings, alturas).
- Reemplazar el borde *dashed* del estado vacío por un estilo sólido, gris claro y minimalista.

### Out of Scope
- Modificar la lógica de negocio de Angular para agregar, remover o recalcular productos.
- Cambiar la paleta de colores base de la aplicación.
- Modificar el sistema de subida de archivos o historial.

## Capabilities

### New Capabilities
- `agreement-modal-ui`: Reglas estandarizadas para el diseño visual Flat Admin aplicado al modal de gestión de acuerdos.

### Modified Capabilities
- None

## Approach

**Flat Admin Harmony Refactor**: Sobrescribir y limpiar las clases SCSS en `technician-panel.scss`. Removeremos las clases `.history-card` de los contenedores de inputs o les quitaremos la elevación en ese contexto. Aplicaremos un `grid-template-columns` rígido para la tabla de items, asegurando alineación matemática a la derecha para precios. Asegurar que las secciones tengan un `padding` constante y sin separadores intrusivos.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/pages/technician-panel/technician-panel.html` | Modified | Limpiar uso de clases `.history-card` o reajustar layout estructural. |
| `src/app/pages/technician-panel/technician-panel.scss` | Modified | Refactor masivo a las clases `.agreement-*`. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Ruptura de responsive view | Medium | Probar que el nuevo Grid colapse a 1 columna en <= 640px. |
| Altura de `ng-select` no coincide | Low | Forzar `min-height` y remover bordes internos del componente en SCSS. |

## Rollback Plan

Dado que los cambios son mayormente SCSS y modificaciones estructurales simples de clases CSS en HTML, un `git checkout` de los dos archivos modificados revertirá instantáneamente a la vista actual desordenada.

## Dependencies

- None

## Success Criteria

- [ ] Las tarjetas de productos adicionales no tienen sombra ni se elevan en hover.
- [ ] La columna "Monto/Precio" está perfectamente alineada a la derecha debajo de su cabecera en escritorio.
- [ ] El modal se siente limpio, estandarizado y puramente utilitario para carga de datos.
