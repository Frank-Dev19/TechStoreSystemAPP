## Exploration: rediagnosis-agreement-versioning

### Current State
El panel técnico ya soporta registrar un nuevo diagnóstico cuando la orden está en `EN_EJECUCION` y avisa que la orden vuelve a coordinación para generar un nuevo acuerdo. Pero el modal de acuerdos no trabaja por “delta sobre versión anterior”: cuando abre, carga el borrador o el acuerdo vigente y `hydrateAgreementComposer()` vuelve todos los ítems editables dentro del composer. `submitAgreement()` envía productos + `technicalServiceAmount` completos, y si existe borrador lo reemplaza íntegro vía `update()`. O sea: la UI hoy permite editar/eliminar cualquier línea del borrador y no distingue contenido heredado, contenido nuevo ni la excepción especial de la línea de servicio técnico.

### Affected Areas
- `src/app/pages/technician-panel/technician-panel.ts` — carga historial, hidrata el composer, decide create/update y hoy trata todas las líneas como editables.
- `src/app/pages/technician-panel/technician-panel.html` — deberá expresar visualmente qué líneas son heredadas/bloqueadas y dónde agregar solo nuevas líneas.
- `src/app/pages/technician-panel/technician-panel.scss` — probable soporte visual para estados de solo lectura dentro del modal.
- `src/app/models/service-orders/service-agreement.ts` — puede necesitar metadata para identificar acuerdo origen, líneas heredadas y permisos de edición por línea.
- `src/app/models/service-orders/service-agreement-request.ts` — el request actual manda acuerdo completo; probablemente necesite un contrato orientado a delta/agregados.
- `src/app/pages/technician-panel/technician-panel.spec.ts` — faltan pruebas de rediagnóstico, herencia visible y bloqueo de edición/eliminación sobre líneas previas.

### Approaches
1. **Composer híbrido heredado + delta** — mostrar el acuerdo anterior precargado, renderizar líneas heredadas como solo lectura, permitir agregar nuevas líneas de producto y dejar editable solo la línea de servicio técnico heredada en la nueva versión.
   - Pros: UX alineada con la regla de negocio, historial claro y menos riesgo de edición accidental.
   - Cons: el modal gana complejidad visual/estado; hay que distinguir bien qué viene heredado y qué es nuevo.
   - Effort: Medium

2. **Bloqueo blando por convención** — seguir usando el composer actual, pero con mensajes indicando “no borres lo anterior” y validaciones mínimas antes de enviar.
   - Pros: implementación rápida.
   - Cons: es frágil y contradice el requerimiento; la UI seguiría permitiendo acciones que luego habría que rechazar o corregir.
   - Effort: Low

### Recommendation
Ir con **Composer híbrido heredado + delta**. Si el usuario ve una nueva versión nacida del diagnóstico, la pantalla debe enseñarle claramente qué viene del acuerdo previo y qué está agregando ahora. La excepción del servicio técnico también tiene que ser explícita; si no, el operador va a sentir que el sistema se contradice.

### Risks
- La UX puede volverse confusa si no se separa visualmente “heredado” de “nuevo”.
- Hay que evitar que abrir historial viejo reutilice el mismo modo editable del nuevo acuerdo derivado.
- Si el backend devuelve solo snapshots planos sin metadata, la APP tendrá que inferir demasiado y eso es una mala base.

### Ready for Proposal
Yes — Ya está claro que el cambio necesita contrato APP/API coordinado y specs separadas para versionado del acuerdo y experiencia del modal.