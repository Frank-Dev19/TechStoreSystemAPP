# Proposal: Refactorizar UI del Wizard del Panel de Recepción

## Intent

Alinear el diseño visual del wizard de creación de orden de servicio hacia un estilo "flat admin". Actualmente el wizard usa estilos neumórficos con múltiples degradados, sombras expansivas y animaciones excesivas que generan ruido en una interfaz administrativa.

## Scope

### In Scope
- Remover `radial-gradient` y `linear-gradient` en `.wizard-hero`.
- Reducir/eliminar `box-shadow` exagerados y transiciones `translateY` en `.wizard-step`.
- Simplificar estilos de `.wizard-empty-quote-state`.
- Mantener la paleta de colores actual (`$accent`, `$primary`, etc.) aplicando tintes sólidos.

### Out of Scope
- Reestructurar el layout general del modal (HTML).
- Modificar componentes fuera de `.create-service-order-body`.
- Refactorizar lógica TS del wizard.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- None

## Approach

Implementaremos la refactorización puramente en CSS/SCSS (Opción 1 de exploración). Se actualizará `reception-panel.scss` sobrescribiendo las clases `wizard-*` para usar fondos tenues planos, bordes finos (1px) y remover transiciones de elevación. Se requerirán ajustes mínimos en HTML (sólo si es vital para contraste).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `reception-panel.scss` | Modified | Simplificación de estilos flat para clases `wizard-*`. |
| `reception-panel.html` | Modified | Ajustes mínimos preventivos para legibilidad (si aplica). |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Contraste texto pobre al quitar gradientes | Med | Validar legibilidad de `.wizard-eyebrow` y badge contra fondos sólidos. |
| Inconsistencia visual modal vs flat | Low | Aplanar sutilmente otros elementos dentro del modal para emparejar. |

## Rollback Plan

Revertir el cambio sobre `reception-panel.scss`. Al ser puramente estilos, el rollback es atómico mediante GIT sin afectar funcionalidad ni estado de base de datos.

## Dependencies

- Ninguna (CSS/SCSS refactor).

## Success Criteria

- [ ] `.wizard-hero` no tiene radial-gradients ni linear-gradients.
- [ ] `.wizard-step` activo y completado no tiene box-shadows expansivos.
- [ ] La UI luce limpia, corporativa y plana (flat admin).
