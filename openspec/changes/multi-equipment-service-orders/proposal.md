# Proposal: Interfaz de órdenes con múltiples equipos

## Why

El frontend presenta cada candidato del wizard como una orden independiente y los paneles operativos suponen que una orden equivale a un equipo. El nuevo dominio necesita una sola atención compartida con trabajo, decisiones y entrega por equipo.

## What changes

- Convertir el wizard en creador de una orden con `items[]`, técnico y tipo de servicio comunes.
- Mantener la recuperación local del borrador durante 24 horas con todos los equipos y sus comerciales iniciales.
- Mostrar una orden como cabecera expandible y permitir seleccionar un equipo en recepción, técnico y supervisor.
- Adaptar diagnóstico, cotización, descuento, decisión, cancelación y entrega al equipo seleccionado.
- Mostrar el avance global y los estados parciales sin ocultar el estado individual.
- Incorporar búsqueda y autocompletado de garantía por número de serie.
- Mantener un detalle modal con pestañas generales, diagnóstico y acuerdo comercial.
- Mostrar “Órdenes recientes del cliente” en el inbox sin controles de vinculación.
- Consumir el contador no leído por usuario y marcar lectura real al abrir el hilo.

## Out of scope

- Portal público o botones para que el cliente acepte directamente.
- Selección de piezas usadas por reparación.
- Nuevas notificaciones automáticas de WhatsApp.

## Rollback

Revertir la aplicación Angular al contrato de órdenes individuales y desplegar junto con el backend anterior. El frontend nuevo no es compatible con el contrato batch legacy.
