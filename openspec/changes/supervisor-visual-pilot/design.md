# Diseño y alcance

Inventario permanece intacto. Se adopta su encabezado de 24/22px, padding de página 20/12px, padding de encabezado 28/20px, radio de 12px y superficies/control funcionales mediante reglas locales al supervisor. Auditoría sigue siendo referencia de la paginación.

La decisión final del usuario reemplaza las tarjetas por una tabla normal, con un botón Ver detalles por fila. La tabla conserva orden/ingreso, equipo, servicio, técnico, estado, motivo y resumen de avance por equipo; todas las columnas se consultan mediante scroll contenido en móvil. No se selecciona una orden al pulsar toda la fila.

El detalle aparece en un drawer fijo de hasta 640px, a pantalla completa cuando el viewport es menor. Conserva íntegros SLA, materiales y acciones comerciales. Tiene fondo, botón de cierre, Escape, foco inicial, ciclo de Tab y devolución del foco al botón que lo abrió. El desplazamiento del fondo se bloquea solo mientras existe el drawer y se restaura al cerrar o destruir el componente. El encabezado y el cuerpo del drawer se desplazan de forma independiente. Filtrar/paginar sigue preservando el estado del listado.

La única modificación fuera de los archivos del supervisor es su navbarTitle en admin-layout.routing.ts: SUPERVISIÓN. El encabezado del panel conserva Panel del Supervisor. Esta etiqueta evita que la barra compartida forme una segunda fila a 320px; no se cambia su CSS, permisos ni otra ruta.

Las notificaciones móviles ya tenían intención de pantalla completa, pero las reglas globales de modal con !important las limitaban. Se corrigen únicamente esas dimensiones en notification-modal, con cuerpo desplazable y encabezado fijo. No se modifican estilos globales ni componentes comerciales compartidos.

Las líneas comerciales dejan de usar flex-wrap con dirección column en móvil: esa combinación desplazaba la sección de líneas a una segunda columna fuera de su tarjeta. Una grilla de una columna y tamaños mínimos nulos mantienen conceptos, montos y acciones dentro del detalle.

Las correcciones de estados se limitan a presentación: flags de carga/error, reintento por refresh existente y páginas válidas al filtrar/recargar. No cambian contratos, permisos ni decisiones comerciales. Las tarjetas incorporan Enter/Espacio y foco visible sin eliminar el clic existente.

El cuerpo del drawer mantiene flex-shrink:0 en sus secciones: con overflow:hidden algunas superficies SLA podían colapsar al repartir la altura del drawer. Se conserva todo el contenido y el único desplazamiento ocurre en el cuerpo. El color del SLA es neutral cuando no hay brecha y de advertencia cuando existe brecha.
