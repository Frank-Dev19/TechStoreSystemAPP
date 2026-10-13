# Panel de Supervisión: estilos y auditoría visual

El usuario pidió avanzar una pantalla a la vez y auditar cualquier fallo visual. Esta intervención se limita al Panel de Supervisión: Inventario es referencia visual y Auditoría el piloto de paginación. El resultado se revisa localmente antes de desplegar o pasar a otra pantalla.

La decisión final presenta órdenes en una tabla normal con Ver detalles por fila. El detalle se abre en un drawer separado. Se conservan ranking, materiales, SLA, filtros, paginación y las acciones existentes. La auditoría incluye cuatro anchos, estados vacío/carga/error, filtros desde páginas avanzadas, datos largos, notificaciones y detalles. Los defectos de estado o paginación que impiden ver el contenido se corrigen con pruebas antes de implementar.

No se cambia API, esquema, permisos, fuentes ni estilos globales. Inventario, Auditoría, Clientes y Proveedores permanecen intactos. Rollback: revertir cambios locales del supervisor y sus pruebas.
