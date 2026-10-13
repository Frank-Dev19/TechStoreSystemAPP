# Proveedores: Inventario y paginación de Auditoría

El usuario pidió aplicar a Proveedores el mismo proceso realizado en Clientes: adoptar Inventario como referencia visual, paginación de Auditoría, validar y desplegar. Se mantiene el avance pantalla por pantalla.

Únicamente suppliers.scss y suppliers.html cambian: encabezado, espaciados, filtros, botones, tabla, modales y paginación. No se altera lógica, API, permisos ni datos. Las columnas móviles se mantienen accesibles mediante scroll contenido. Clientes, Inventario, Auditoría y estilos globales permanecen intactos.

Rollback de código: revertir estos dos archivos. Despliegue: publicar frontend por SHA y fijar digest, respaldar configuración y recrear solo frontend, conservando la imagen anterior para rollback.
