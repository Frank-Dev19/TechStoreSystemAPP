# Verificación del listado y drawer final

33 pruebas focalizadas de Supervisor aprobadas. El cambio a listado se probó antes de implementar: cinco fallos por las nuevas filas, botón explícito y cierre/foco del drawer. Tras implementar, TOTAL: 33 SUCCESS. Se conservan las regresiones de carga, vacío, error, filtrado y recarga del ranking. Typecheck y build de producción correctos; advertencias CommonJS existentes.

65 comprobaciones de navegador sobre el frontend compilado y API simulada, en 320, 390, 768 y 1440px. Cero desbordes visibles/página, cero errores JS y cero fallos de contraste en etiquetas/controles muestreados. El listado muestra siete columnas y el botón Ver detalles; a 1440px no necesita scroll horizontal para acceder a acciones. Móvil desplaza únicamente su región de tabla.

Drawer: apertura por Enter sobre botón nativo, foco inicial en cierre, Shift+Tab contenido, Escape, cierre por fondo en escritorio y devolución del foco. El scroll de fondo se bloquea/restaura correctamente. Filtros y página permanecen. Se conservaron decisión comercial, descuentos, cancelación, materiales, ranking, notificaciones y sus estados de carga/error. Todas las peticiones del navegador fueron GET.

Se verificó que las superficies SLA no colapsen: 203px en escritorio y 366.9px en anchos menores, con capturas específicas. Estado sin brecha usa superficie neutral. Ningún dato operativo, mensaje, inventario o decisión real fue modificado. Esta revisión no sustituye E2E contra producción ni certificación WCAG completa.

Inventario, Auditoría, Clientes, Proveedores y estilos globales sin cambios. Solo Supervisor y su etiqueta de ruta se modificaron, junto con specs. Sin commit, push ni despliegue.

Capturas finales: output/supervisor-list-after-orders-1440.png, supervisor-list-after-detail-1440.png, supervisor-list-after-detail-390.png y supervisor-list-after-sla-390.png. Mediciones: output/supervisor-list-after-audit.json.
