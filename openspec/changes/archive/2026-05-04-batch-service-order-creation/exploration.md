## Exploration: batch-service-order-creation UX Steps 3 & 5

### Current State
El wizard de creación de órdenes batch tiene 5 pasos:
- **Paso 1** (index 0): Tipo de atención
- **Paso 2** (index 1): Técnico
- **Paso 3** (index 2): Cliente
- **Paso 4** (index 3): **Equipos** ← donde se agregan equipos
- **Paso 5** (index 4): **Confirmación** ← resumen final

**Problema identificado**:

1. **Botón "Agregar otro equipo" invisible inicialmente** (línea 2813 de reception-panel.ts):
   ```typescript
   canAddAnotherCreateServiceOrderCandidate(): boolean {
     return (
       this.isCreateServiceOrderStepActive(3) &&
       this.editingCreateServiceOrderCandidateIndex === null &&
       this.createServiceOrderCandidates.length > 0  // ← BUG: solo aparece cuando ya hay candidatos
     )
   }
   ```
   El usuario tiene que llegar al paso Equipos, llenar datos, avanzar a Confirmación, y REGRESAR para que aparezca el botón.

2. **Botones de acción en paso Confirmación** (líneas 1430-1437 de reception-panel.html):
   - Botón "Editar" por cada card de candidato
   - Botón "Quitar" por cada card de candidato
   - El usuario establece que esto NO debe existir — solo vista, sin acciones.

### Affected Areas
- `reception-panel.ts`:
  - `canAddAnotherCreateServiceOrderCandidate()` — línea ~2809
  - `beginAnotherCreateServiceOrderCandidate()` — línea ~2804
  - `removeCreateServiceOrderCandidate()` — ~línea 2793
- `reception-panel.html`:
  - Paso Equipos (isCreateServiceOrderStepActive(3)) — líneas ~1043-1058
  - Paso Confirmación (último paso) — líneas ~1355-1500
  - Footer botones — líneas ~1546-1577
- `reception-panel.scss` — estilos de cards y botones

### Approaches
1. **En paso Equipos (Step 3)** — Mostrar botón siempre
   - Pros: UX intuitiva, usuario puede agregar múltiples desde el inicio
   - Cons: Requiere cambiar la condición `createServiceOrderCandidates.length > 0`
   - Effort: **Low** — solo quitar la condición de longitud

2. **En paso Equipos** — Cards visuales con botón eliminar
   - Pros: Visible, control directo
   - Cons: Mayor desarrollo UI
   - Effort: **Medium**

3. **Paso Confirmación** — Solo lectura, sin acciones
   - Pros: Cumple requerimiento del usuario
   - Cons: Ninguno
   - Effort: **Low** — remover botones Editar/Quitar del HTML

### Recommendation
**Abordar ambos problemas**:

1. **Paso Equipos**: Cambiar `canAddAnotherCreateServiceOrderCandidate()` para mostrar botón siempre (quitar condición `length > 0`), o al menos mostrar botón desde el primer equipo.

2. **Paso Confirmación**: Eliminar botones "Editar" y "Quitar" de las cards de candidatos en el paso de confirmación. Los botones de footer deben ser:
   - Cancelar
   - Anterior
   - X (cerrar modal)
   - Crear orden(es)

### Risks
- Cambio en UX puede afectar flujo actual de usuarios
- Validación de mínimo 1 equipo ya existe (`ensureCreateOrderCandidatesReady()` línea 2713)

### Ready for Proposal
**Sí** — La propuesta del usuario es clara y tiene sentido técnico.