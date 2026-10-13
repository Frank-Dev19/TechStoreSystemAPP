# Auditoría

- Sin selección, el grid reservaba una columna para un detalle inexistente: listado ocupa ahora todo el espacio.
- Reglas de paginación dentro de .alert-close no alcanzaban al listado: corregidas con alcance local al panel, compartidas visualmente con historial.
- Selección móvil heredaba un grid de dos columnas pese al listado móvil: ahora usa una columna con áreas coherentes.
- Cabecera con título 32px/700, radios 16/24px y sombras amplias: alineada con Inventario.
- Se conserva paleta, etiquetas, etapas, flujos, modales y selección existentes.

- La captura final reveló un bloque placeholder de detalle debajo del listado sin selección: ocultado porque la cabecera ya indica seleccionar una orden; el detalle real sigue apareciendo al seleccionar.
