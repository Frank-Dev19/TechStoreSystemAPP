# Tasks: Workspace SDD Strategy

## Phase 1: Governance Foundation

- [x] 1.1 Validar que `C:\Users\sergi\dev\grupo-sts` siga sin `.git` antes de ejecutar la estrategia.
- [x] 1.2 Confirmar que `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\openspec` permanece como raíz SDD vigente del frontend.
- [x] 1.3 Documentar en `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\openspec\changes\workspace-sdd-strategy\` la regla “source of truth por repo”.

## Phase 2: Repo Initialization Rollout

- [x] 2.1 Inicializar `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPI\openspec` con `sdd-init`, respetando el repo backend como raíz.
- [x] 2.2 Verificar en API que `openspec/config.yaml`, `openspec/specs/` y `openspec/changes/` queden creados correctamente.
- [x] 2.3 Confirmar que `C:\Users\sergi\dev\grupo-sts\TechStoreSystemINFRA` queda fuera del alcance SDD operativo por ser despliegue VPS.

## Phase 3: Cross-repo Coordination

- [x] 3.1 Definir una ubicación de coordinación liviana en `C:\Users\sergi\dev\grupo-sts\` (por ejemplo `docs/` o `workspace-specs/`), sin usar `openspec/`.
- [x] 3.2 Documentar la convención: cambios APP/API/INFRA viven en su repo; iniciativas transversales solo se resumen en la carpeta padre.
- [x] 3.3 Registrar ejemplos de mapeo cross-repo para futuros cambios: frontend -> APP openspec, backend -> API openspec, infra -> INFRA openspec.

## Phase 4: Verification

- [x] 4.1 Verificar manualmente el escenario spec “Workspace with independent repos”.
- [x] 4.2 Verificar manualmente el escenario spec “Existing openspec already present in one repo”.
- [x] 4.3 Verificar manualmente el escenario spec “Parent folder is not a Git repository”.
- [x] 4.4 Confirmar que no exista `C:\Users\sergi\dev\grupo-sts\openspec` como raíz principal después del rollout.

## Phase 5: Cleanup / Adoption

- [x] 5.1 Actualizar la documentación interna del equipo para que nuevos changes se creen en el repo correcto.
- [x] 5.2 Cerrar el change `workspace-sdd-strategy` solo cuando APP, API y el alcance de INFRA queden explícitamente resueltos.
