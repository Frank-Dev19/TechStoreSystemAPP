# Proposal: document-type-inferred-client-kind

## Intent

Eliminar la selección explícita de "Persona Natural / Empresa" en el wizard de recepción. La recepcionista solo debe seleccionar tipo de documento y ingresar el número. El sistema infiere el `clientKind` del campo `kind` del `documentType` seleccionado y muestra/oculta campos automáticamente.

## Scope

### In Scope
- Remover el toggle de `clientKind` (Persona/Empresa) del wizard
- Inferir `clientKind` automáticamente desde `documentType.kind` al seleccionar tipo de documento
- Mostrar/ocultar campos de empresa (companyName, companyTradeName) según el `kind` inferido
- Actualizar `onDocumentTypeChange()` para establecer `clientKind` sin intervención del usuario
- Mantener lógica de contactos para empresas (selección de contacto existente o creación inline)

### Out of Scope
- Cambios en el catálogo de tipos de documento (eso es tarea de backoffice)
- Modificación del flujo de búsqueda de clientes existentes
- Cambios en la API o modelos de backend

## Capabilities

### Modified Capabilities
- `reception-wizard-ui`: Eliminar requirement de "Client Kind Toggle" y reemplazar por inferencia automática desde `documentType.kind`

## Approach

1. **Remover UI de selección de kind**: Eliminar el botón grupo que permite elegir Persona/Empresa en `reception-panel.html`
2. **Inferir en `onDocumentTypeChange()`**: Al seleccionar tipo de documento, leer `documentType.kind` y establecer `clientKind` en el formulario automáticamente
3. **Condicionar campos de empresa**: Usar el `clientKind` inferido para mostrar/ocultar `companyName` y `companyTradeName`
4. **Mantener compatibilidad**: El resto del flujo (contactos, creación de orden) permanece igual

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/pages/reception-panel/reception-panel.html` | Modified | Remover botón grupo clientKind, ajustar condicionales |
| `src/app/pages/reception-panel/reception-panel.ts` | Modified | `onDocumentTypeChange()` infiere kind, eliminar lógica de toggle manual |
| `src/app/pages/reception-panel/reception-panel.spec.ts` | Modified | Actualizar tests para validar inferencia automática |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Tipos de documento sin `kind` clasificado | Medium | Usar fallback heurístico transicional (ya implementado) |
| Usuario selecciona tipo incorrecto sin notar | Low | Mostrar badge/indicador visual del kind inferido |

## Rollback Plan

1. Revertir commit que elimine el toggle de clientKind
2. Restaurar lógica manual de selección de kind
3. El código anterior está archivado en `openspec/changes/archive/2026-05-04-batch-service-order-creation/`

## Dependencies

- Catálogo de tipos de documento debe tener campo `kind` (PERSON/COMPANY)
- `DocumentTypeResponse` ya incluye `kind: DocumentTypeKind`

## Success Criteria

- [ ] Al seleccionar tipo de documento, el `clientKind` se establece automáticamente
- [ ] Campos de empresa solo aparecen si `documentType.kind === COMPANY`
- [ ] No hay toggle de selección manual de Persona/Empresa en la UI
- [ ] Tests pasan con la nueva lógica de inferencia
