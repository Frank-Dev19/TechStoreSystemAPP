# Página pública de encuesta

## Requisitos

### Acceso sin sesión

La aplicación MUST permitir abrir `/encuesta/:token` sin autenticación.

#### Scenario: encuesta disponible

- **Given** un enlace vigente
- **When** el cliente abre la página
- **Then** MUST visualizar la orden, tres escalas de 1 a 5 y un comentario opcional

### Estados finales

La aplicación MUST impedir nuevos envíos cuando la encuesta esté respondida, vencida o sea inválida.

#### Scenario: respuesta registrada

- **Given** un formulario válido
- **When** el backend confirma el envío
- **Then** MUST sustituir el formulario por un agradecimiento
