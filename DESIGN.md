---
name: Macrochips operational interface
description: Sistema de diseño operativo extraído de las pantallas de órdenes de servicio.
colors:
  brand: "#0f3d22"
  primary: "#2c5282"
  text: "#1a365d"
  muted: "#6b7280"
  border: "#e2e8f0"
  background: "#f5f7fa"
  surface: "#f8fafc"
  focus: "#3182ce"
typography:
  body:
    fontFamily: 'Roboto, "Helvetica Neue", sans-serif'
    fontSize: "0.9375rem"
    lineHeight: 1.5
  title:
    fontSize: "2rem"
    fontWeight: 700
rounded:
  panel: "12px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  page: "32px"
---
## Overview
Personal de recepción, técnicos y supervisores trabaja con órdenes durante la jornada en pantallas de escritorio y teléfonos. Mantener las superficies claras existentes, con contenido legible y controles familiares. Sistema extraído de src/styles.scss, supervisor-panel.scss, service-order-materials.scss y PRODUCT.md. Esta documentación no implica una migración visual de todas las pantallas.

## Colors
El verde de marca corresponde al shell y navegación; el azul operativo se conserva en controles Bootstrap existentes. Usar neutrales para estructura y estados con texto, nunca solo color. Los tokens compartidos de nuevas pantallas operativas están en src/styles/_operational-tokens.scss; no sustituir estilos globales sin una tarea específica.

## Typography
Heredar la tipografía del shell, sin descargar nuevas fuentes. Títulos 2rem, subsecciones 1.25rem, contenido .9375rem; controles con etiquetas explícitas. Evitar mayúsculas en instrucciones largas. Datos de serie completos, con ajuste de línea cuando corresponda.

## Elevation
Paneles delimitados por borde de 1px y radio de 12px; sin sombras decorativas en listados. Conservar el shell existente. Enlaces y controles con foco visible de 3px y separación de 2px.

## Components
Filtros encima del listado, ng-select para selección con búsqueda, fechas nativas con etiquetas Desde/Hasta. Acción explícita Aplicar filtros y Limpiar; rangos inclusivos según hora de Lima. Tabla semántica con encabezados, detalle desplegable por fila, paginación y estados de carga, error con reintento y vacío explicativo. Acciones de consulta como enlaces. Las entregas ligadas a una orden se crean desde la orden; los insumos sin cotización se entregan desde el registro unificado de Inventario. Botones de al menos 40px de alto. En móvil filtros apilados y tabla con desplazamiento horizontal dentro de su región, sin desbordar toda la página. No sumar cantidades de productos diferentes como una métrica de negocio. Mantener filtros en URL y cancelar peticiones obsoletas.

## Do's and Don'ts
Reutilizar Bootstrap, ng-select, la navegación y vocabulario existentes. Evitar métricas decorativas, tarjetas anidadas y nuevos modales para consultar series. No inferir que una guía está usada solo por existir: derivar de conciliación válida y asignaciones. Mantener intacto el destinatario histórico de la entrega ante reasignaciones.

## Responsive
La base CSS se diseña para 320–767 px: una columna, controles táctiles de al menos 44 px, contenido sin ancho fijo y acciones que ocupan el espacio disponible. Desde 768 px se agregan columnas cuando el contenido mantiene legibilidad; los paneles maestro-detalle pasan a dos columnas solo cuando caben ambas superficies sin comprimirlas. Los pasos del wizard se desplazan horizontalmente en móvil y se muestran como grilla en escritorio. Usar `dvh` para modales, permitir desplazamiento en el cuerpo y mantener encabezado y acciones accesibles. Probar como mínimo en 320, 390, 768 y 1440 px.

El contenido también responde al contexto operativo: Express no presenta campos o métricas de diagnóstico; las acciones físicas de inventario aparecen en la superficie del supervisor y requieren permiso; la venta muestra el total y ofrece su detalle comercial bajo demanda, sin incrustar la gestión de guías.
