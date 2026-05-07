# Change Proposal: batch-service-order-creation

## Intent
Permitir que el wizard de recepción cree varias órdenes de servicio en una sola corrida para un mismo cliente y contexto de recepción, manteniendo cada orden como entidad individual con su propio ciclo operativo, comercial y económico.

## Scope
- APP: extender el wizard de recepción para registrar múltiples equipos dentro de una misma sesión, compartiendo el contexto común cuando corresponda y mostrando revisión/confirmación por cada orden a crear.
- API: agregar soporte contractual y de aplicación para crear múltiples órdenes individuales en una sola operación backend.
- Workflow: conservar trazabilidad individual por orden desde el alta, de modo que luego esas órdenes puedan convivir con acuerdos y facturación agrupada sin perder independencia.

## Explicit Clarifications
- Este change **no reemplaza** `grouped-service-agreement-billing`; lo complementa.
- La creación múltiple nace en **recepción**, no en ventas.
- Cada equipo termina como una **orden independiente**, no como una orden grupal.
- La facturación agrupada posterior sigue resolviéndose desde ventas, como ya quedó implementado.

## Decisions Already Closed
- El wizard debe permitir registrar varios equipos en una misma sesión.
- El contexto común puede compartirse entre órdenes cuando tenga sentido (cliente, origen, prioridad y otros campos globales).
- Cada orden creada debe conservar su propio identificador, trazabilidad, estados y evolución independiente.
- El backend debe exponer un contrato explícito para creación múltiple; no se debe simular creando N órdenes desde frontend sin una intención batch formal.

## Approach
Rediseñar el flujo de recepción para separar claramente:
1. **contexto compartido** de la sesión de recepción
2. **detalle por equipo/orden**

El frontend construirá una colección de órdenes candidatas dentro del wizard y enviará un payload batch al backend. El backend persistirá N órdenes individuales, aplicando las mismas reglas de validación y snapshot que hoy existen por orden unitaria, pero dentro de una sola operación consistente.

## Risk Level
Alto, porque toca el wizard principal de recepción, contrato APP/API de service orders, validaciones compartidas/individuales y la relación futura con acuerdos y ventas agrupadas.

## Capabilities
- New: batch-service-order-creation
- Modified: reception-wizard-ui
- Modified: service-order-management
