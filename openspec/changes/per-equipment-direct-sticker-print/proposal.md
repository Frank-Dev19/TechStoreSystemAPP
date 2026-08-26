# Impresión directa de stickers por equipo

## Problema

El sticker se genera actualmente a nivel de orden, con un ancho ajeno al rollo de la Brother QL-700 y mediante una vista PDF que obliga a completar la impresión manualmente. En órdenes con varios equipos tampoco queda claro a cuál corresponde.

## Cambio

- Mover la acción de sticker a cada tarjeta del modal de equipos recibidos.
- Solicitar la cantidad de copias antes de imprimir.
- Generar un documento de 62 × 35 mm con los datos del equipo y sin el teléfono del cliente.
- Enviar el trabajo directamente a una Brother QL-700 mediante QZ Tray.

## Rollback

Se puede retirar la acción de las tarjetas y el servicio QZ sin modificar contratos backend ni datos persistidos.
