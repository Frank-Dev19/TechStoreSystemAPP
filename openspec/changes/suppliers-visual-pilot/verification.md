# Verificación previa al despliegue

Build de producción y typecheck correctos, con advertencias CommonJS existentes. No hay spec unitario propio de Proveedores; no se cambió lógica. Chrome sobre el frontend compilado, con API simulada: 20 comprobaciones en 1440, 768, 390 y 320 px. Listado, creación, edición y confirmación sin desborde; todas las columnas visibles mediante scroll contenido. Búsqueda y navegación 1 → 2 → 3 → 2 comprobadas, con botones deshabilitados en extremos. Ninguna petición de escritura.

Inventario, Auditoría y Clientes no tienen diferencias frente a HEAD; CSS compilado de Inventario idéntico. Capturas output/suppliers-pilot-list-{width}.png y suppliers-pilot-create-{width}.png. Revisión con datos simulados, no E2E contra la base habitual.
