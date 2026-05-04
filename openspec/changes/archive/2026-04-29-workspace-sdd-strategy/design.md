# Design: Workspace SDD Strategy

## Technical Approach

Aplicar SDD por repositorio Git y usar la carpeta padre solo para coordinación liviana. La decisión implementa la spec `workspace-sdd-governance`: roots locales por repo y ausencia de `openspec/` global como fuente principal.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|----------|--------|-------------------------|-----------|
| SDD root | `openspec/` dentro de cada repo | `openspec/` global en `grupo-sts` | La carpeta padre no tiene `.git`; el artifact principal debe viajar con commits y PRs del repo afectado |
| Existing APP state | Preservar `TechStoreSystemAPP/openspec` | Reemplazarlo por raíz global | Ya existe una raíz válida; crear otra competiría con el flujo actual |
| Cross-repo coordination | Documentación liviana en carpeta padre | Specs operativas globales | Permite seguimiento transversal sin romper ownership ni versionado |

## Data Flow

```text
Workspace grupo-sts
   |
   +--> TechStoreSystemAPP/.git + openspec/
   |
   +--> TechStoreSystemAPI/.git + openspec/   (a inicializar)
   |
   +--> TechStoreSystemINFRA/.git             (fuera de alcance SDD operativo)
   |
   +--> docs/workspace coordination (optional, non-authoritative)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `TechStoreSystemAPP/openspec/changes/workspace-sdd-strategy/proposal.md` | Modify | Formaliza la propuesta con capability explícita |
| `TechStoreSystemAPP/openspec/changes/workspace-sdd-strategy/specs/workspace-sdd-governance/spec.md` | Create | Define requisitos de gobernanza SDD del workspace |
| `TechStoreSystemAPP/openspec/changes/workspace-sdd-strategy/design.md` | Create | Documenta cómo aplicar la estrategia |
| `TechStoreSystemAPI/openspec/` | Create (future) | Raíz SDD propia del backend |
| `grupo-sts/<docs-coordination>` | Create (optional future) | Coordinación cross-repo no autoritativa |

## Interfaces / Contracts

```text
Repo authority contract
- APP changes -> APP openspec
- API changes -> API openspec
- INFRA deploy-only -> outside operational SDD scope
- Cross-repo initiative APP/API -> parent coordination doc + per-repo openspec artifacts
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | N/A | No aplica; decisión de gobernanza |
| Integration | Consistencia de roots SDD | Verificación manual: cada repo con `.git` y su propio `openspec/` |
| E2E | Flujo operativo SDD | Validar que cambios futuros se creen en el repo correcto |

## Migration / Rollout

1. Mantener `TechStoreSystemAPP/openspec` como root vigente.
2. Inicializar `openspec` en `TechStoreSystemAPI`.
3. Mantener `TechStoreSystemINFRA` fuera del alcance SDD operativo por ser despliegue VPS.
4. Crear documentación liviana en `grupo-sts` solo si aparecen cambios cross-repo recurrentes.

No migration required sobre código de producto.

## Open Questions

- [ ] Definir si `docs/` es la ubicación definitiva de coordinación cross-repo en la carpeta padre.
