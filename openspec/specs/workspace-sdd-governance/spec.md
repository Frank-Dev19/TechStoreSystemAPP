# Workspace SDD Governance Specification

## Purpose

Definir la gobernanza SDD para un workspace contenedor de repos independientes.

## Requirements

### Requirement: Repo-local SDD roots

El workspace SHALL definir la raíz SDD operativa dentro de cada repositorio Git y SHALL NOT usar la carpeta padre no versionada como fuente principal de `openspec/`.

#### Scenario: Workspace with independent repos

- GIVEN un workspace padre que contiene múltiples repos con `.git` propios
- WHEN se define la raíz SDD
- THEN cada repo SHALL usar su propio `openspec/` como source of truth
- AND la carpeta padre SHALL NOT alojar el `openspec/` principal

#### Scenario: Existing openspec already present in one repo

- GIVEN que uno de los repos ya tiene `openspec/`
- WHEN se formaliza la estrategia SDD
- THEN esa raíz existente SHOULD preservarse
- AND la estrategia SHALL evitar una segunda raíz competidora en la carpeta padre

### Requirement: Cross-repo coordination

El workspace MAY mantener documentación liviana de coordinación cross-repo en la carpeta padre, pero dicha documentación SHALL NOT reemplazar los artifacts operativos por repo.

#### Scenario: Cross-repo initiative spans frontend and backend

- GIVEN una iniciativa que afecta APP y API
- WHEN se documenta su coordinación
- THEN la carpeta padre MAY contener documentación de seguimiento o gobernanza
- AND los artifacts ejecutables del cambio SHALL vivir en los `openspec/` de los repos afectados

#### Scenario: Parent folder is not a Git repository

- GIVEN que la carpeta padre no tiene `.git`
- WHEN se evalúa crear un `openspec/` global
- THEN la estrategia SHALL descartarlo como raíz principal
- AND la trazabilidad de PRs y commits SHALL mantenerse por repositorio

#### Scenario: Infrastructure repo is deployment-only

- GIVEN un repositorio de infraestructura usado solo para despliegue en VPS
- WHEN se define el alcance operativo SDD del workspace
- THEN dicho repositorio MAY quedar fuera del sistema SDD operativo
- AND APP y API SHALL seguir usando roots SDD por repo
