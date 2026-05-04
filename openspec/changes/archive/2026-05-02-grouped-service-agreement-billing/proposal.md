# Change Proposal: grouped-service-agreement-billing

## Intent
Permitir emitir un solo comprobante para múltiples acuerdos de servicio del mismo cliente operativo, manteniendo liquidación total por acuerdo, sin pagos parciales dentro de un mismo acuerdo, y separando cliente operativo de contribuyente fiscal.

## Scope
- APP: selección múltiple de acuerdos pendientes desde ventas, elección de tipo de comprobante, captura/selección de contribuyente fiscal y visualización de líneas por acuerdo.
- API: soporte para crear una venta agrupada a partir de múltiples acuerdos, vincular cada acuerdo/orden a una línea facturable propia, persistir contribuyente fiscal y snapshot fiscal inmutable.
- Workflow: permitir entrega por orden solo cuando su acuerdo haya quedado totalmente cubierto, aunque otros acuerdos del mismo cliente sigan pendientes.

## Decisions Already Closed
- El agrupamiento ocurre desde el menú de ventas.
- Solo se pueden agrupar acuerdos del mismo cliente operativo.
- No se permiten pagos parciales dentro de un mismo acuerdo.
- Un pago puede ser “parcial” solo respecto del conjunto: algunos acuerdos se pagan totalmente y otros no se incluyen.
- El comprobante tendrá una línea de servicio por acuerdo con descripción tipo `Servicio técnico - Orden SO2026...`.
- Si una orden queda totalmente pagada, puede entregarse aunque otras del mismo cliente sigan pendientes.
- El tipo de comprobante se decide en ventas.
- El contribuyente fiscal puede diferir del cliente operativo.
- La venta debe guardar snapshot fiscal inmutable al momento de emitir.

## Approach
Extender el flujo de ventas para seleccionar múltiples acuerdos pendientes de un mismo cliente operativo y emitir un único comprobante con líneas separadas por acuerdo. La emisión debe requerir elegir boleta o factura, resolver o crear el contribuyente fiscal correspondiente y persistir tanto la referencia al contribuyente como un snapshot fiscal inmutable. La reconciliación económica seguirá siendo total por acuerdo, reutilizando la base existente de links entre ventas y órdenes.

## Risk Level
Medio-Alto, porque toca ventas, acuerdos, reconciliación económica, entrega y UX de facturación.

## Capabilities
- New: grouped-service-agreement-billing
- Modified: sales-management-ui
- Modified: service-order-economic-workflow
