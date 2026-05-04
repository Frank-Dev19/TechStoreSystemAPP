# Reception Wizard UI Specification

## Purpose

Definir las restricciones visuales y reglas de renderizado para el componente del Wizard de Recepción, imponiendo un estilo corporativo "flat admin".

## Requirements

### Requirement: Flat Admin Styling

El sistema MUST renderizar los elementos `.wizard-hero`, `.wizard-step` y `.wizard-empty-quote-state` usando estilos planos, evitando explícitamente el uso de gradientes y sombras expansivas.

#### Scenario: Rendering the wizard hero header

- GIVEN que el wizard está activo en el DOM
- WHEN el usuario visualiza la sección hero superior
- THEN el fondo MUST ser un color sólido o un flat tint, sin utilizar `radial-gradient` ni `linear-gradient`
- AND el texto `.wizard-eyebrow` MUST mantener un contraste legible contra el nuevo fondo plano

#### Scenario: Rendering active wizard steps

- GIVEN que el wizard está mostrando los pasos de la orden
- WHEN un paso se vuelve activo (`.active`) o completado (`.completed`)
- THEN el elemento MUST NOT elevarse usando un `box-shadow` expansivo (ej: `0 14px 28px`)
- AND el elemento MUST NOT usar animaciones de elevación como `transform: translateY(-1px)`
- AND los colores de fondo MUST ser variantes sólidas tenues de la paleta principal (`$accent`, `$success`, `$primary`)
