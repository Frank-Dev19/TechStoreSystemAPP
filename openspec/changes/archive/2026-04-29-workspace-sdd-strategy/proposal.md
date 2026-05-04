# Proposal: Workspace SDD Strategy

## Intent

Definir una estrategia SDD consistente para `C:\Users\sergi\dev\grupo-sts`, evitando un `openspec` global en una carpeta que no es repo Git y asegurando trazabilidad por repositorio.

## Scope

### In Scope
- Establecer la raíz SDD correcta para APP y API.
- Definir si la estrategia será global, por repo o híbrida.
- Documentar una convención para iniciativas cross-repo.

### Out of Scope
- Inicializar `openspec` en infraestructura de despliegue fuera del alcance operativo.
- Crear specs funcionales de frontend/backend.

## Capabilities

### New Capabilities
- `workspace-sdd-governance`: define dónde viven los artifacts SDD por repo y cómo se coordina el trabajo cross-repo

### Modified Capabilities
- None

## Approach

Adoptar un modelo híbrido con **source of truth por repo**: cada repo mantiene su propio `openspec/`, y la carpeta padre solo conserva documentación liviana de coordinación si hace falta. Esto preserva versionado, ownership y PR traceability.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `C:\Users\sergi\dev\grupo-sts` | Modified | Documentación de gobernanza cross-repo, sin `openspec/` global |
| `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP` | Modified | Mantener `openspec/` existente como raíz SDD del frontend |
| `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPI` | New | Inicializar `openspec/` propio del backend |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Mezclar decisiones cross-repo dentro de APP | Med | Mantener solo estrategia; no specs operativas ajenas |
| Fragmentación de cambios transversales | Med | Definir convención de coordinación en carpeta padre |
| Crear un `openspec` global y duplicar ownership | High | Prohibir `openspec/` global como fuente principal |

## Rollback Plan

Revertir esta decisión documental, mantener solo `openspec` en APP y posponer API/INFRA hasta redefinir la estrategia.

## Dependencies

- Ninguna adicional para APP y API.

## Success Criteria

- [ ] La raíz SDD operativa queda definida por repo, no en `grupo-sts`
- [ ] APP conserva su `openspec/` actual sin conflicto
- [ ] API queda identificada e inicializada como siguiente raíz SDD del workspace
- [ ] La coordinación cross-repo se documenta fuera de `openspec/` global
