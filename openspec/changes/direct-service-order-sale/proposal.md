# Venta directa desde una orden de servicio

## Objetivo

Permitir que recepción facture una orden elegible desde su propia fila, sin copiar el código ni navegar al módulo de Ventas.

## Alcance

- Agregar un modal de venta asociado a una única orden.
- Reutilizar el endpoint transaccional existente `POST /sales/from-service-agreements`.
- Permitir seleccionar o registrar al contribuyente fiscal, el tipo de comprobante y la forma de pago.
- Retirar del formulario general de Ventas el modo de venta desde orden/cotización.

## Rollback

Retirar el componente y su acción del panel de recepción y restaurar el selector de modo en Ventas.
