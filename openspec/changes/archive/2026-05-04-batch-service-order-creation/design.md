# Technical Design: batch-service-order-creation (APP)

## Summary
Este cambio transforma el wizard de recepción para que una misma sesión permita capturar múltiples equipos y confirmar la creación de múltiples órdenes individuales. El frontend separa claramente el **contexto compartido** de la recepción y el **detalle por orden/equipo**, y luego envía una única operación batch al backend.

## Architecture Decisions

### 1. Shared context + per-order entries
El wizard se divide conceptualmente en:
- **contexto compartido**: cliente, origen, prioridad y otros datos comunes
- **entradas por orden**: equipo, problema inicial, accesorios, notas y cualquier variación específica

Esto evita duplicar data común y hace visible qué pertenece a toda la sesión y qué pertenece a una sola orden.

### 2. Frontend keeps a collection of draft order candidates
El frontend no trabaja con un solo formulario de orden final. Mantiene una colección de **candidate orders** dentro de la sesión del wizard, permitiendo:
- agregar
- editar
- eliminar
- revisar

cada orden candidata antes del envío final.

### 3. Batch submit is one explicit contract
El wizard no debe disparar N requests unitarios al confirmar. Debe enviar un payload batch explícito al backend, con:
- contexto compartido
- colección de órdenes candidatas

Esto mantiene la semántica del caso de uso y evita inconsistencias de orquestación en el cliente.

### 4. Review step must preserve order individuality
La pantalla de revisión no puede mostrarse como “alta masiva genérica”. Debe dejar explícito:
- cuántas órdenes se van a crear
- qué equipo corresponde a cada una
- qué datos comunes comparten
- qué datos específicos varían

### 5. Compatibility with downstream independent workflows
Aunque el alta sea batch, el resultado funcional son muchas órdenes independientes. Por eso el diseño mantiene compatibilidad directa con:
- acuerdos por orden
- diagnósticos por orden
- billing links por orden
- entregas por orden

## UI Flow
1. Recepción inicia una sesión nueva.
2. Define contexto compartido.
3. Agrega el primer equipo/orden candidata.
4. Puede agregar más equipos antes de confirmar.
5. Revisa la colección completa.
6. Confirma una sola operación batch.
7. El sistema responde con N órdenes creadas individualmente.

## File Impact (APP)
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\reception-panel\reception-panel.ts`
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\reception-panel\reception-panel.html`
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\reception-panel\reception-panel.scss` (si la composición lo necesita)
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\models\service-orders\service-order-request.ts`
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\services\service-orders\service-order.service.ts`

## Risks
- complejidad del estado del wizard
- riesgo de mezclar campos compartidos con campos por orden
- necesidad de una revisión UX muy clara para no generar errores humanos al confirmar muchas órdenes juntas
