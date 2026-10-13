# Auditoría visual del Panel de Supervisión

La decisión posterior del usuario sustituye las tarjetas por un listado normal y el detalle por un drawer. Los hallazgos del primer piloto quedan como registro; la verificación final se repite sobre la tabla y el drawer.

## Hallazgos reproducidos y corregidos

| Hallazgo | Evidencia | Corrección local |
| --- | --- | --- |
| Columna de detalle vacía en escritorio sin selección | 1440px: listado comprimido a la izquierda | Una columna cuando no existe selección |
| Vacío/error mostrados como carga indefinida | API vacía o 500 tras completar petición | Separación de carga, vacío y error; botón Reintentar |
| Filtro desde página avanzada oculta coincidencias | Página 2 + una coincidencia: cero tarjetas | Volver a página 1 al cambiar búsqueda/estado |
| Recarga del ranking deja una página inválida | Página 2 + respuesta con un técnico | Ajustar la página al rango disponible |
| Espacio vertical excesivo en encabezado móvil | 320px: flex-basis de título usado como altura | Grilla móvil explícita para título y acciones |
| Barra superior en dos filas a 320px | Título largo de la ruta junto al usuario | Solo el título de esta ruta pasa a SUPERVISIÓN |
| Detalle móvil estrecho y sticky bajo la barra | Padding anidado y top:1rem | Padding reducido, scroll-margin y sticky con separación |
| Líneas comerciales fuera de su tarjeta | 320/390px, detalle comercial con líneas | Grilla móvil y wrapping de conceptos/montos |
| Contraste insuficiente en controles/etiquetas | WhatsApp claro y etiquetas de notificaciones con ratio 4.41 | Verde más oscuro y texto local con ratio mínimo 4.5 en muestras auditadas |
| Modal de notificaciones limitado por reglas globales | Restricción global de ancho/alto !important | Excepción local para pantalla completa y cuerpo desplazable |
| Tarjetas de órdenes no operables por teclado | Sin tabindex ni eventos Enter/Espacio | Semántica de botón, selección por teclado y foco visible |
| Alertas móviles con ancho mínimo de 320px | Toast puede exceder el área visible | Ancho máximo local, texto con wrapping y cierre táctil |

## Cambio a listado y drawer

El listado final reemplaza las tarjetas por una tabla con siete columnas y Ver detalles. El drawer mantiene todos los contenidos y acciones; añade cierre por fondo/Escape, foco inicial y devolución al botón, ciclo de Tab y bloqueo/restauración del scroll de fondo. Se verificó que las acciones caben a 1440px sin desplazamiento horizontal; móvil conserva scroll horizontal dentro de la tabla.

La auditoría del drawer detectó un colapso de altura en superficies SLA con overflow:hidden. Se corrigió evitando que los hijos del cuerpo flex reduzcan su altura. Se añadió una comprobación de altura real y capturas específicas de SLA. También se corrigió la apariencia roja de SLA sin brecha, usando estado neutral por defecto.

## Cobertura y límites

Frontend compilado servido por HTTP local, Chrome y API simulada. Anchos 320, 390, 768 y 1440px. Órdenes y detalle con SLA, materiales expandidos, ranking, notificaciones con errores largos, decisión comercial, descuentos y cancelación. Estados vacío, error y carga pendiente; filtros desde página avanzada y navegación de ranking. No se ejecutan escrituras, cancelaciones, decisiones reales, reintentos de mensajes ni entregas de inventario.

Se comprueban desbordes de página/elementos visibles y contraste calculado en etiquetas y controles seleccionados. Esto no certifica exhaustivamente WCAG ni sustituye E2E contra datos productivos. Los componentes compartidos se inspeccionan desde Supervisor y conservan su implementación.

Capturas anteriores: output/supervisor-before-*.png. Capturas del primer piloto: output/supervisor-after-*.png. Listado y drawer finales: output/supervisor-list-after-*.png. Informe medido del listado final: output/supervisor-list-after-audit.json. Pruebas de regresión: supervisor-panel.spec.ts.

Resultado preparado para revisión del usuario. Sin commit, push ni despliegue de esta pantalla.
