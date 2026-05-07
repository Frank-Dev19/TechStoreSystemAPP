# Agreement Modal UI Specification

## Purpose

Define las restricciones y reglas visuales "Flat Admin" para el modal de gestión de acuerdos (`.agreement-modal`), asegurando un diseño corporativo, limpio y con alineación matemática estricta para la visualización de montos y componentes de formulario.

## Requirements

### Requirement: Layout y Elevación (Flat Admin)

The system MUST NOT utilizar sombras de caja (`box-shadow`) ni efectos de transición de elevación en tarjetas internas (`.agreement-item-card`, `.agreement-service-card`) para mantener un diseño plano.

#### Scenario: Visualización de tarjeta de producto
- GIVEN un producto adicional agregado al acuerdo
- WHEN se renderiza la tarjeta `.agreement-item-card`
- THEN la tarjeta debe mostrar bordes sutiles sólidos sin sombra
- AND no debe elevarse (`transform: translateY`) al pasar el cursor sobre ella.

### Requirement: Alineación Matemática de Precios

The system MUST alinear numéricamente (a la derecha) los campos de precio y monto en la tabla de servicio fijo y sub-totales.

#### Scenario: Visualización de tabla de servicio fijo
- GIVEN que se muestra la tabla `.agreement-line-grid`
- WHEN el usuario ve las columnas de "Concepto" y "Monto"
- THEN el input de monto debe estar rígidamente alineado debajo de la cabecera "Monto"
- AND el texto debe alinearse a la derecha usando fuente tabular.

### Requirement: Unificación de Inputs

The system MUST mantener un estilo idéntico de bordes, paddings y focus rings para todos los controles interactivos (`input`, `textarea`, `ng-select`).

#### Scenario: Foco en campos del formulario
- GIVEN el modal interactivo
- WHEN el usuario hace foco en un input de precio o en el `ng-select` de producto
- THEN ambos controles deben mostrar exactamente el mismo `box-shadow` de color de acento y los mismos bordes base
- AND deben tener la misma altura visual mínima (`min-height: 48px`).

### Requirement: Estado Vacío Minimalista

The system MUST presentar los estados vacíos sin usar bordes punteados (`dashed`) prominentes.

#### Scenario: Visualización sin productos adicionales
- GIVEN un acuerdo que aún no tiene repuestos adicionales
- WHEN se muestra la sección de "Productos adicionales"
- THEN el `.agreement-empty-state` debe mostrar un estilo integrador (ej. fondo sutil o border sólido)
- AND no debe utilizar bordes cortados que ensucien la visual.
