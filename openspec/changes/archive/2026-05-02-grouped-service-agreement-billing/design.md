# Technical Design: grouped-service-agreement-billing

## Summary
Este cambio introduce facturación agrupada de acuerdos desde ventas, permitiendo seleccionar múltiples acuerdos pendientes del mismo cliente operativo y emitir un solo comprobante con una línea por acuerdo. El flujo de venta deja explícita la separación entre cliente operativo y contribuyente fiscal.

## Architecture Decisions

### 1. Grouped billing is anchored in sales, not reception
La creación agrupada nace en `ventas`, no en el wizard de recepción. El wizard sigue registrando órdenes y acuerdos individualmente; ventas decide cuáles acuerdos pendientes se liquidan juntos.

### 2. Agreements remain one-per-order
No se introduce acuerdo grupal. Cada orden conserva su acuerdo individual y la agrupación ocurre solo a nivel de comprobante/venta.

### 3. No partial settlement inside one agreement
Cada acuerdo se liquida completo o no se incluye. La “parcialidad” solo existe respecto del conjunto de acuerdos pendientes del cliente.

### 4. One service line per agreement
El comprobante agrupa muchas líneas `SERVICE`, una por acuerdo, con descripción trazable del tipo `Servicio técnico - Orden SO2026...`.

### 5. Taxpayer is resolved at billing time
El contribuyente fiscal puede diferir del cliente operativo de las órdenes. El flujo de ventas debe resolver si la emisión es boleta o factura, luego seleccionar o crear el contribuyente correspondiente, y finalmente emitir con snapshot fiscal inmutable.

## APP Responsibilities
- Extender la vista de ventas para listar acuerdos pendientes elegibles por cliente operativo.
- Permitir multiselección de acuerdos del mismo cliente.
- Mostrar preview del comprobante con una línea por acuerdo.
- Capturar tipo de comprobante y contribuyente fiscal.
- Bloquear combinaciones inválidas (clientes distintos, acuerdos parciales, etc.).

## UI Flow
1. Usuario entra a ventas y abre modo de facturación agrupada.
2. Elige o busca cliente operativo con acuerdos pendientes.
3. Selecciona 1..N acuerdos.
4. El sistema calcula total = suma de acuerdos seleccionados.
5. Usuario elige `BOLETA` o `FACTURA`.
6. El sistema solicita identificación fiscal del contribuyente según el tipo elegido.
7. Usuario selecciona contribuyente existente o crea uno mínimo fiscalmente válido.
8. Se emite un solo comprobante con líneas separadas por acuerdo.

## File Impact (APP)
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\ventas\ventas.ts`
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\ventas\ventas.html`
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\ventas\ventas.scss`
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\models\sales\sale.dto.ts`
- servicios API de ventas y de búsqueda/alta de contribuyente si hace falta ajuste de contratos

## Risks
- Complejidad visual del formulario de ventas.
- Confusión entre cliente operativo y contribuyente si la UI no lo separa bien.
- Necesidad de mantener compatibilidad con venta manual/productos sin contaminar ese flujo.
