# Página pública de encuesta de calidad

## Problema

El cliente necesita responder una encuesta por orden desde WhatsApp sin iniciar sesión.

## Cambio

- Incorporar `/encuesta/:token` como ruta pública.
- Mostrar una encuesta breve, accesible y adaptada a móvil.
- Informar los estados disponible, enviada, vencida e inválida.

## Rollback

Eliminar la ruta y el componente sin afectar las pantallas autenticadas.
