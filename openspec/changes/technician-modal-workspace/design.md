# Diseño

Se reutiliza selectedServiceOrder y la continuidad existente de hydrateLists para mantener orden/equipo al cambiar de etapa. El listado incorpora botón explícito Ver detalles. El detalle se mueve a una ventana centrada de 1120px máximo, completa en móvil, con encabezado fijo y contenido desplazable. Los formularios existentes se trasladan dentro del mismo shell como regiones; cerrar formulario retorna al detalle. Decisión comercial sustituye visualmente a cotización mientras está activa. Información, SLA e historiales se muestran sin navegación por pestañas internas.

ViewChild gestiona foco inicial y bloqueo/restauración de scroll. Escape retorna del formulario o cierra la orden; Tab se contiene en el modal. Las confirmaciones especializadas compartidas de cancelación mantienen su implementación existente y prioridad de foco. No hay cambios API, permisos ni pilotos. Se eliminó la condición activeTab para registrar diagnóstico: la etapa del equipo gobierna disponibilidad.
