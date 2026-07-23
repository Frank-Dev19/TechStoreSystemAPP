# Contrato funcional del sistema TechStore

Este documento consolida el alcance funcional del sistema TechStore a partir de las especificaciones vigentes del frontend y del backend. Su propósito es servir como base formal de acuerdo con el cliente sobre módulos, capacidades, reglas de negocio, dependencias, exclusiones y condiciones de validación.

> Este documento describe compromisos funcionales observables por el usuario y por la operación del negocio. No debe interpretarse como documentación técnica exhaustiva ni como garantía de implementación interna sobre detalles no visibles para el cliente.

## 1. Alcance general

El sistema TechStore cubre la operación comercial y técnica de una tienda de servicios y productos tecnológicos. El alcance funcional incluye gestión de clientes, clasificación documental, recepción de equipos, órdenes de servicio, diagnóstico técnico, acuerdos comerciales, facturación asociada, seguimiento económico, inventario operativo, caja, supervisión, métricas de atención, comunicación vinculada a órdenes y administración de accesos.

| Área | Alcance incluido |
|---|---|
| Clientes | Personas naturales, empresas, contactos empresariales y datos de identificación. |
| Documentos | Clasificación de tipos de documento para determinar flujos de persona o empresa. |
| Recepción | Registro de clientes, equipos y creación individual o múltiple de órdenes. |
| Servicio técnico | Diagnóstico, ejecución, rediagnóstico y seguimiento por técnico. |
| Acuerdos comerciales | Creación, edición, confirmación, anulación y versionado de acuerdos. |
| Facturación | Vinculación de comprobantes, facturación agrupada de acuerdos y snapshot fiscal. |
| Entrega | Habilitación de entrega según estado operativo y cobertura económica. |
| Inventario | Catálogos de productos, stock, movimientos, kardex, lotes, series y conteos. |
| Precios e impuestos | Configuración de precios, impuestos y validación de descuentos. |
| Caja | Apertura, cierre, movimientos y reportes diarios de flujo de efectivo. |
| Supervisión | Vista de órdenes, acuerdos, métricas SLA y rendimiento técnico. |
| Comunicación | Inbox asociado a órdenes, mensajes, adjuntos y canal WhatsApp cuando esté configurado. |
| Administración | Usuarios, roles, permisos, claves operativas, auditoría y catálogos base. |

## 2. Roles operativos

| Rol | Responsabilidades funcionales |
|---|---|
| Recepción | Registrar clientes, capturar equipos, crear órdenes, generar acuerdos iniciales, gestionar evidencia y derivar atención. |
| Técnico | Gestionar diagnósticos, proponer acuerdos técnicos, ejecutar servicio, registrar rediagnósticos y actualizar estados operativos. |
| Supervisor | Monitorear órdenes, acuerdos, métricas, ranking técnico y contexto operativo general. |
| Administrador | Gestionar usuarios, roles, permisos, catálogos, configuración operativa y trazabilidad. |
| Cliente operativo | Persona o empresa que solicita el servicio. Puede diferir del contribuyente usado para facturación. |
| Contribuyente | Persona o empresa a nombre de quien se emite el comprobante de pago. |

## 3. Módulos funcionales contratados

### 3.1 Autenticación, sesión y acceso

El sistema permite el acceso de usuarios internos mediante autenticación y control de sesión.

Capacidades funcionales:

- Inicio de sesión de usuarios internos.
- Renovación y cierre de sesión.
- Consulta y actualización de perfil propio.
- Cambio y recuperación de contraseña cuando el flujo esté habilitado.
- Uso de sesión autenticada para operar módulos protegidos.

Condiciones y restricciones:

- El backend usa cookies de refresh token; el nombre predeterminado de cookie es `rt`.
- Los permisos efectivos dependen de roles, permisos y posibles overrides por usuario.
- La cobertura exacta de permisos por módulo debe validarse antes de firma; algunos módulos pueden requerir ajuste de RBAC para coincidir con la matriz contractual final.
- No se incluye auto-registro público de usuarios finales salvo acuerdo posterior.

### 3.2 Usuarios, roles, permisos y claves operativas

El sistema incluye administración interna de usuarios y gobierno de acceso.

Capacidades funcionales:

- Gestión de usuarios internos.
- Gestión de roles.
- Gestión de permisos y módulos de permisos.
- Asignación de permisos por rol.
- Overrides o permisos específicos por usuario cuando aplique.
- Creación, consulta y validación de claves operativas para flujos sensibles.

Condiciones y restricciones:

- El backend sincroniza catálogos RBAC y usuarios base durante el arranque del sistema.
- La matriz exacta de permisos por rol debe validarse antes de firma si será parte del compromiso contractual.
- Las claves operativas son una capacidad administrativa y no sustituyen auditoría ni controles organizacionales externos.

### 3.3 Tipos de documento

El catálogo de tipos de documento gobierna la identificación de personas y empresas.

Capacidades funcionales:

- Crear, listar, editar, eliminar lógicamente y restaurar tipos de documento.
- Definir cantidad de dígitos esperada y descripción.
- Clasificar el documento según su uso funcional, por ejemplo persona o empresa.
- Consumir la clasificación documental desde clientes y recepción.

Reglas funcionales:

- La clasificación documental debe evitar inferencias manuales frágiles en los flujos de cliente y recepción.
- El sistema puede crear tipos base como DNI y RUC durante el arranque.

### 3.4 Clientes y contactos empresariales

El sistema gestiona clientes persona natural y clientes empresa.

Capacidades funcionales:

- Crear, buscar, listar, actualizar, eliminar lógicamente y restaurar clientes.
- Diferenciar clientes persona y clientes empresa.
- Registrar contactos asociados a empresas.
- Seleccionar o crear contactos empresariales durante la recepción.
- Importar clientes mediante flujo de validación y confirmación cuando esté habilitado.

Reglas funcionales:

- Una empresa puede tener múltiples contactos.
- La orden de servicio debe conservar referencia o snapshot del contacto usado en la atención.
- El cliente operativo puede diferir del contribuyente de facturación.
- La unicidad documental y reglas de compatibilidad heredada deben validarse según la configuración vigente.
- En backend, la creación directa de empresas exige contacto inicial, mientras algunos flujos de importación pueden dejar empresas pendientes de completar contacto.
- La habilitación de creación/edición de clientes desde recepción depende de la matriz final de roles y permisos; no debe asumirse equivalente a permisos administrativos.

### 3.5 Proveedores

El sistema gestiona un maestro de proveedores para operación comercial y de inventario.

Capacidades funcionales:

- Crear, buscar, listar, actualizar, eliminar lógicamente y restaurar proveedores.
- Asociar proveedores a documentos de identificación.
- Mantener datos comerciales básicos para operación interna.

Exclusiones:

- No se incluye en este contrato un flujo completo de compras, cuentas por pagar o abastecimiento salvo que se agregue como anexo específico.

### 3.6 Recepción y creación de órdenes

El módulo de recepción centraliza la captura de datos necesarios para iniciar una atención técnica.

Capacidades funcionales:

- Capturar datos del cliente, empresa, contacto, equipo y problema inicial.
- Registrar prioridad, origen de solicitud y tipo de servicio.
- Crear una orden individual.
- Crear múltiples órdenes desde una misma operación de recepción cuando existan varios equipos o solicitudes relacionadas.
- Preparar una colección de órdenes candidatas antes de confirmar.

Reglas funcionales:

- La confirmación de creación múltiple debe producir órdenes individuales, no una orden grupal.
- Cada orden conserva trazabilidad individual.
- Diagnósticos, acuerdos, entregas y estados económicos se preservan por orden.
- Para empresas, el flujo debe separar datos legales de empresa y datos del contacto operativo.
- En frontend, el número telefónico debe tratarse como dato estructurado, con Perú como país predeterminado cuando aplique.

### 3.7 Órdenes de servicio

Las órdenes de servicio constituyen el núcleo operativo del sistema técnico.

Capacidades funcionales:

- Crear, listar, consultar detalle, actualizar, eliminar lógicamente y restaurar órdenes.
- Asignar técnico.
- Actualizar estados operativos y técnicos.
- Registrar eventos de seguimiento.
- Sugerir técnico cuando exista información suficiente.
- Vincular orden con diagnóstico, acuerdo, venta, entrega e inbox.
- Generar o descargar documentos asociados cuando el flujo lo permita.

Reglas funcionales:

- La orden conserva independencia operativa aun cuando se origine desde un lote de recepción.
- La entrega se habilita por orden individual.
- La cobertura económica se evalúa por orden, incluso cuando exista facturación agrupada.
- Los estados y transiciones deben respetar el flujo operativo vigente.

### 3.8 Diagnósticos técnicos y rediagnóstico

El sistema soporta diagnósticos técnicos asociados a órdenes de servicio.

Capacidades funcionales:

- Crear, consultar, actualizar, eliminar lógicamente y restaurar diagnósticos.
- Registrar resultado, observaciones y estado del diagnóstico.
- Manejar diagnósticos sucesivos cuando una orden requiere reevaluación técnica.
- Preservar trazabilidad entre diagnóstico, rediagnóstico y acuerdos derivados.

Reglas funcionales:

- El rediagnóstico debe conservar continuidad con el diagnóstico y acuerdo anteriores.
- Las versiones anteriores deben quedar trazables.
- Los acuerdos derivados deben heredar información relevante de la versión previa.
- Las líneas heredadas deben protegerse contra modificaciones indebidas, salvo excepciones permitidas por la regla funcional vigente.

### 3.9 Acuerdos comerciales de servicio

Los acuerdos comerciales representan la propuesta económica asociada a una orden de servicio.

Capacidades funcionales:

- Crear, listar, consultar, actualizar, confirmar y anular acuerdos.
- Incluir líneas de servicio y líneas de producto.
- Generar acuerdos automáticos para cargos de diagnóstico cuando aplique.
- Asociar acuerdos con diagnósticos, órdenes y facturación.
- Consultar rankings o métricas relacionadas con acuerdos por técnico cuando estén disponibles.

Reglas funcionales:

- El acuerdo confirmado es la base para reglas económicas posteriores.
- Un acuerdo puede tener estados como borrador, confirmado, anulado, reemplazado u otros definidos por el flujo.
- La terminología funcional vigente es “acuerdo”; cualquier referencia heredada a “cotización” debe entenderse como compatibilidad histórica, no como modelo canónico futuro.
- La creación, edición o confirmación de acuerdos por parte del rol técnico debe validarse contra la matriz final de permisos backend antes de presentarse como compromiso contractual.

### 3.10 Facturación, comprobantes y ventas

El sistema soporta ventas y comprobantes asociados a productos, servicios y acuerdos.

Capacidades funcionales:

- Crear, listar, consultar, actualizar y cancelar ventas.
- Simular una venta antes de emitirla cuando el flujo lo permita.
- Crear ventas desde una orden de servicio o desde acuerdos.
- Emitir comprobantes que cubran múltiples acuerdos cuando cumplan las reglas de negocio.
- Consultar métricas, ventas por producto y reportes fiscales disponibles.
- Mantener series documentarias y numeración de comprobantes.

Reglas funcionales:

- Los acuerdos agrupados deben cumplir las reglas de compatibilidad del flujo vigente.
- Un comprobante puede cubrir múltiples acuerdos.
- En el flujo agrupado estándar, cada acuerdo debe estar completamente cubierto o excluido; no se contemplan pagos parciales dentro de un mismo acuerdo salvo acuerdo posterior. Esta restricción no debe interpretarse como eliminación global del estado económico parcial si otros flujos lo soportan.
- Cada acuerdo debe representarse como una línea de servicio identificable en el comprobante.
- El contribuyente usado para facturación puede diferir del cliente operativo.
- La información fiscal usada para emitir el comprobante debe conservarse como snapshot inmutable luego de la emisión.

### 3.11 Caja y flujo de efectivo

El sistema incluye capacidades de caja para registrar flujo operativo de dinero.

Capacidades funcionales:

- Abrir y cerrar caja.
- Consultar caja actual.
- Registrar y consultar transacciones.
- Consultar métricas y reporte diario.

Condiciones y restricciones:

- Algunas operaciones dependen de la existencia de una caja abierta.
- La definición exacta de permisos por operación de caja debe validarse antes de convertirla en compromiso contractual.
- La protección final por rol/permiso del módulo de caja debe verificarse contra configuración backend vigente antes de firma.
- Este contrato no incluye integración contable externa salvo anexo específico.

### 3.12 Inventario operativo

El sistema soporta operación de inventario y consulta de productos para ventas y acuerdos.

Capacidades funcionales:

- Gestionar categorías, unidades y productos.
- Importar productos cuando el flujo esté habilitado.
- Consultar stock actual y métricas.
- Registrar movimientos de inventario.
- Consultar kardex.
- Gestionar lotes y series.
- Ejecutar conteos físicos y registrar diferencias.
- Usar bloqueo global de inventario cuando corresponda.
- Buscar productos desde operaciones relacionadas, evitando cargar catálogos completos innecesariamente cuando exista búsqueda remota.

Condiciones y restricciones:

- Las rutas de inventario no siguen una única convención pública; existen rutas bajo `inventory/*` y rutas específicas como `serials` o `lots`.
- El alcance contractual cubre operación funcional, no una garantía de nomenclatura uniforme de endpoints.

### 3.13 Precios e impuestos

El sistema gestiona configuración de precios e impuestos usada por inventario, ventas y acuerdos.

Capacidades funcionales:

- Configurar reglas de pricing.
- Consultar precios aplicables por producto.
- Ejecutar cálculos masivos cuando el flujo esté disponible.
- Validar descuentos.
- Consultar y mantener configuración tributaria como IGV o renta cuando aplique.

Condiciones y restricciones:

- El backend puede sembrar configuración tributaria base durante el arranque.
- La configuración fiscal final debe ser validada con el cliente y su asesoría contable antes de uso contractual definitivo.

### 3.14 Inbox, comunicación y WhatsApp

El sistema incluye un inbox vinculado a órdenes de servicio para comunicación operativa.

Capacidades funcionales:

- Consultar hilos de conversación.
- Consultar y enviar mensajes.
- Asociar mensajes y adjuntos a órdenes.
- Descargar adjuntos cuando corresponda.
- Marcar conversaciones como leídas.
- Recibir webhooks de canal externo cuando la integración esté configurada.
- Enviar mensajes de texto, adjuntos o plantillas cuando el proveedor externo esté correctamente configurado.

Condiciones y restricciones:

- La integración WhatsApp depende de credenciales, plantillas y configuración del proveedor externo.
- En producción, la validación de firma de webhook requiere `WHATSAPP_CLOUD_APP_SECRET`.
- Tiempos de entrega, disponibilidad del proveedor, límites de plantilla y reintentos deben tratarse como dependencias externas, no como garantía propia del sistema salvo anexo de SLA específico.

### 3.15 Documentos temporales y PDFs

El sistema puede generar o exponer documentos vinculados a órdenes y atención.

Capacidades funcionales:

- Descargar documentos temporales mediante token.
- Generar documentos operativos asociados a órdenes cuando el flujo lo permita.
- Usar PDFs para respaldos de atención, resumen o comunicación cuando esté implementado.

Condiciones y restricciones:

- Los documentos temporales pueden estar protegidos por token y no necesariamente por sesión autenticada estándar.
- La vigencia del token y política de expiración deben validarse contra la configuración vigente antes de comprometer un plazo contractual.

### 3.16 Auditoría y trazabilidad

El sistema registra y expone trazas operativas para revisión interna.

Capacidades funcionales:

- Registrar eventos auditables de operación.
- Consultar auditoría.
- Consultar detalle de eventos.
- Consumir stream de auditoría cuando esté disponible.

Condiciones y restricciones:

- El módulo de auditoría opera de forma global en backend mediante interceptor.
- La restricción exacta de acceso al controlador de auditoría debe validarse antes de prometerla contractualmente, porque parte de la protección puede depender de configuración o decorators específicos.
- La auditoría no sustituye controles legales, contables o de seguridad externos.

### 3.17 Supervisión, métricas y SLA

El sistema contempla visibilidad de supervisión sobre órdenes, acuerdos, tiempos y rendimiento técnico.

Capacidades funcionales:

- Revisar órdenes y acuerdos asociados.
- Consultar métricas derivadas de hitos temporales cuando existan datos suficientes.
- Distinguir valores computables de valores pendientes por falta de hitos.
- Visualizar indicadores o ranking de rendimiento técnico cuando estén disponibles.
- Mantener acceso a contexto de comunicación vinculado a la orden correspondiente.

Condiciones y restricciones:

- Las políticas SLA dependen de variables de configuración `SERVICE_ORDER_SLA_*` y de los hitos realmente capturados por el sistema.
- Este documento no compromete penalidades, niveles de servicio legales ni tiempos garantizados frente al cliente final salvo anexo SLA específico.

## 4. Reglas transversales del sistema

### 4.1 Validación de datos

El sistema aplica validación global estricta en backend:

- Rechazo de campos no permitidos cuando el contrato de entrada no los acepte.
- Transformación de datos entrantes según DTOs configurados.
- Validación de estructura antes de procesar operaciones.

### 4.2 Eliminación lógica y restauración

Varios módulos soportan eliminación lógica y restauración. Esto permite ocultar registros de la operación normal sin perder necesariamente el historial.

Módulos donde este patrón aparece en el alcance funcional:

- Clientes.
- Proveedores.
- Tipos de documento.
- Usuarios.
- Órdenes de servicio.
- Diagnósticos.
- Acuerdos.

### 4.3 Trazabilidad económica

Las operaciones económicas deben conservar relación entre:

- Orden de servicio.
- Diagnóstico.
- Acuerdo confirmado.
- Comprobante o venta emitida.
- Estado económico por orden.
- Entrega del equipo.

### 4.4 Snapshot fiscal

Cuando se emite un comprobante, la información fiscal usada para la emisión debe conservarse como snapshot histórico, aunque los datos del cliente o contribuyente cambien posteriormente.

### 4.5 Terminología canónica

La terminología funcional vigente es:

| Término vigente | Uso |
|---|---|
| Orden de servicio | Unidad operativa de atención técnica. |
| Diagnóstico | Evaluación técnica asociada a una orden. |
| Acuerdo | Propuesta económica y autorización comercial asociada a una orden. |
| Comprobante | Documento de venta/facturación emitido. |
| Cliente operativo | Cliente que solicita o recibe el servicio. |
| Contribuyente | Persona o empresa a nombre de quien se factura. |

Referencias heredadas a “cotización” deben entenderse como compatibilidad histórica salvo que un anexo indique lo contrario.

## 5. Dependencias técnicas y externas

| Dependencia | Uso funcional |
|---|---|
| Base de datos MySQL | Persistencia principal del sistema. |
| SMTP / correo | Flujos de comunicación o recuperación cuando estén configurados. |
| WhatsApp Cloud API | Canal externo para inbox y notificaciones de órdenes. |
| Configuración de CORS | Acceso desde frontend autorizado. |
| Cookies de sesión | Renovación de autenticación. |
| Archivos/PDFs temporales | Documentación operativa y comunicación. |
| Configuración fiscal | Cálculo de impuestos, series y comprobantes. |

## 6. Exclusiones y elementos no contractuales

Los siguientes elementos no deben interpretarse como compromiso funcional directo con el cliente, salvo que se incorporen explícitamente en una orden de trabajo o anexo:

- Gobernanza interna SDD del equipo de desarrollo.
- Limpieza de warnings de build, dependencias o tooling, salvo que afecten una funcionalidad observable por el usuario.
- Refactors internos de componentes o servicios que no modifiquen comportamiento funcional comprometido.
- Detalles de implementación técnica como nombres de archivos, estructura de módulos Angular/NestJS o convenciones internas de código.
- Comportamientos heredados identificados como compatibilidad transitoria.
- Garantías de disponibilidad del proveedor WhatsApp, correo, infraestructura, red o servicios externos.
- Penalidades o SLA legales no definidos en un anexo específico.
- Integración contable, compras, logística avanzada o BI externo no descritos en este documento.
- Endpoint de salud operativo: el backend tiene referencia de healthcheck en infraestructura, pero el endpoint `/health` no debe considerarse funcionalmente comprometido hasta su implementación explícita.

## 7. Matriz de respaldo por fuente

| Módulo / capacidad | Respaldo principal |
|---|---|
| Clientes persona/empresa y contactos | Specs frontend + modelos/API backend de clientes. |
| Tipos de documento | Specs frontend + catálogo backend de document types. |
| Recepción y creación batch | Specs frontend + endpoints/backend de órdenes de servicio. |
| Órdenes de servicio | Specs frontend + backend `service-orders`. |
| Diagnóstico y rediagnóstico | Specs frontend + backend de diagnósticos/acuerdos. |
| Acuerdos comerciales | Specs frontend + backend de service agreements. |
| Facturación agrupada | Specs frontend + backend de sales/service agreements. |
| Estado económico y entrega | Specs frontend + backend de órdenes, ventas y acuerdos. |
| Inventario operativo | Specs frontend + backend de inventario. |
| Precios e impuestos | Backend de pricing y tax config. |
| Caja | Backend de cash-flow. |
| Inbox / WhatsApp | Backend de service-order inbox + configuración externa. |
| Auditoría | Backend AuditModule e interceptor global. |
| Usuarios/RBAC | Backend de users, roles, permissions y bootstrap. |
| SLA y métricas | Specs frontend + política backend `SERVICE_ORDER_SLA_*`. |

## 8. Anexo de specs fuente del frontend

| Spec fuente | Uso en este contrato |
|---|---|
| `client-company-contacts` | Clientes persona/empresa y contactos empresariales. |
| `clients-management-ui` | Gestión visual de clientes y contactos. |
| `document-types-classification` | Clasificación funcional de documentos. |
| `reception-wizard-ui` | Flujo de recepción y captura inicial. |
| `service-order-management` | Creación batch e independencia de órdenes. |
| `technician-panel-workflow` | Operación técnica y múltiples diagnósticos. |
| `rediagnosis-agreement-versioning` | Versionado de acuerdos por rediagnóstico. |
| `agreement-modal-ui` | Presentación de acuerdos. |
| `grouped-service-agreement-billing` | Facturación agrupada de acuerdos. |
| `service-order-economic-workflow` | Reglas económicas y entrega. |
| `service-order-sla-time-metrics-ui` | Métricas de tiempo y supervisión. |
| `inventory-operations-product-search` | Búsqueda operativa de productos. |
| `pdf-build-warnings-cleanup` | Referencia técnica interna; no cliente-facing por defecto. |
| `workspace-sdd-governance` | Referencia interna; excluida del contrato funcional. |

## 9. Checklist previo a firma

Antes de usar este documento como anexo contractual definitivo, se recomienda validar:

- [ ] Que cada capacidad frontend tenga contrato backend equivalente cuando corresponda.
- [ ] Que el cliente confirme terminología final: “acuerdo”, “orden de servicio”, “comprobante”, “cliente operativo” y “contribuyente”.
- [ ] Que la matriz de permisos por rol sea revisada y aprobada si será parte del contrato.
- [ ] Que recepción y técnico tengan permisos backend explícitos para las operaciones comprometidas en clientes/contactos y acuerdos comerciales.
- [ ] Que las exclusiones técnicas sean aceptadas explícitamente.
- [ ] Que los comportamientos heredados o transitorios tengan fecha o condición de retiro.
- [ ] Que las métricas SLA reflejen los hitos realmente capturados por el sistema.
- [ ] Que la facturación agrupada cumpla reglas fiscales aplicables al contexto operativo del cliente.
- [ ] Que las dependencias externas, especialmente WhatsApp y correo, tengan condiciones de responsabilidad claras.
- [ ] Que los documentos temporales y PDFs tengan política de expiración, acceso y conservación aprobada.
- [ ] Que auditoría y caja tengan restricciones de acceso validadas antes de presentarlas como garantía contractual.
