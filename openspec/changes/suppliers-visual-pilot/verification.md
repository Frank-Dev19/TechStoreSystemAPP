# Verificación previa al despliegue

Build de producción y typecheck correctos, con advertencias CommonJS existentes. No hay spec unitario propio de Proveedores; no se cambió lógica. Chrome sobre el frontend compilado, con API simulada: 20 comprobaciones en 1440, 768, 390 y 320 px. Listado, creación, edición y confirmación sin desborde; todas las columnas visibles mediante scroll contenido. Búsqueda y navegación 1 → 2 → 3 → 2 comprobadas, con botones deshabilitados en extremos. Ninguna petición de escritura.

Inventario, Auditoría y Clientes no tienen diferencias frente a HEAD; CSS compilado de Inventario idéntico. Capturas output/suppliers-pilot-list-{width}.png y suppliers-pilot-create-{width}.png. Revisión con datos simulados, no E2E contra la base habitual.

## Despliegue verificado — 2026-10-12

El usuario pidió aplicar el mismo proceso a Proveedores. Cambios únicamente en suppliers.scss y suppliers.html: referencia visual de Inventario y paginación de Auditoría, coherentes con Clientes; ajustes de encabezado, filtros, botones, tabla, formularios y todas las columnas disponibles con scroll contenido en móvil. Sin cambios de lógica, permisos ni API. Inventario, Auditoría y Clientes intactos.

Build y typecheck aprobados; 20 comprobaciones de navegador con API simulada en 1440, 768, 390 y 320 px, incluidos creación, edición, confirmación, búsqueda y paginación 1 → 2 → 3 → 2 con límites. No hay spec unitario propio de Proveedores y no se introdujeron tests que duplican CSS. No se escribieron datos operativos.

GitHub → Docker Hub → VPS completado: runtime APP/main 6c115f5560c1be400f735d77d1e25007e71ba946; imagen saviladev/techstoresystemapp@sha256:0bd5909fe420a005090ef46922958f3bd32ee9376015824c0f4c6979bd94d622 con etiqueta OCI verificada. Angular compilado localmente, runtime ensamblado por contexto SSH. Solo frontend recreado; IDs de backend/MySQL conservados, ambos saludables. Nginx -t correcto, /proveedores HTTP 200, readiness status=ok y bundles main-SF7ROJEA.js y chunk-SG2V57VK.js idénticos a los locales.

Respaldos privados /opt/macrochips/backups/compose-env-before-suppliers-6c115f5.bak y compose-before-suppliers-6c115f5.yaml. Rollback frontend sha256:a9995d5564761e6a5142fd793bf1e252c0b8ebe0c09a0327581de1ed701c24e1. Cambios .atl ajenos excluidos. La siguiente pantalla requiere indicación del usuario.
