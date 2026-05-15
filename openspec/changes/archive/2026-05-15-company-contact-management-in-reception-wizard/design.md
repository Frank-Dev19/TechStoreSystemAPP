# Technical Design: company-contact-management-in-reception-wizard

## Problem

El wizard de recepción hoy tiene partes del selector de contactos para empresas, pero el flujo quedó incompleto:

- puede listar contactos activos
- puede hidratar el principal
- pero no obliga contacto para `COMPANY`
- y tampoco persiste un contacto nuevo cuando la empresa existente no tiene ninguno

Eso deja al wizard en un estado híbrido: la UI permite edición inline, pero el master de la empresa no queda alineado.

## Design Decisions

### 1. Aislar el comportamiento por `clientKind`

La gestión de contactos se activa solo si `clientKind === ClientKind.COMPANY`.

- `PERSON`: mantiene snapshot directo en `contactName/contactEmail/contactPhone`
- `COMPANY`: usa un subflujo de contacto operativo resuelto

### 2. Introducir modo explícito de contacto en el wizard

El wizard manejará un estado local equivalente a:

- `existing` → usar contacto existente
- `create-inline` → registrar contacto nuevo para la empresa actual

La UI debe poder entrar a `create-inline` en dos casos:

- no hay contactos activos
- la recepcionista elige “Nuevo contacto” desde el área de selección

### 3. Resolver contacto antes de crear la orden

`resolveClientId(...)` debe dejar de devolver `clientContactId: null` para empresas existentes.

Nuevo comportamiento esperado:

- si hay `clientId` de empresa y `clientContactId` válido → usarlo
- si hay `clientId` de empresa y modo `create-inline` con contacto válido → persistir contacto primero
- recién después devolver `{ clientId, clientContactId }`

### 4. Persistencia de contacto inline

El frontend reutilizará `ClientsApiService.update(...)` con payload mergeado de `contacts` para agregar el nuevo contacto sin perder los existentes.

Consideraciones:

- partir del cliente actual en memoria
- tomar solo contactos activos/inactivos existentes que deban preservarse
- agregar el nuevo contacto con `isPrimary` según reglas de negocio actuales
- usar la respuesta del backend para recuperar el contacto persistido y su `id`

### 5. Contrato visual del wizard

El área de contacto para empresas debe expresar claramente:

- lista de contactos disponibles cuando existen
- acción para crear uno nuevo inline
- obligatoriedad de resolver un contacto antes de confirmar

No se debe exponer este subflujo para `PERSON`.

## Impacted Areas

- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\reception-panel\reception-panel.ts`
  - estado del subflujo
  - hidratación del cliente encontrado
  - resolución/persistencia del contacto antes de crear orden
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\reception-panel\reception-panel.html`
  - selector + entrada a alta inline
  - mensajes de obligatoriedad para empresa
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\services\clients-api.service.ts`
  - reutilización del `update(...)` actual

## Verification

- typecheck: `npx tsc --noEmit -p tsconfig.app.json`
- prueba manual en `http://localhost:4200/reception-panel`
  - empresa con múltiples contactos
  - empresa sin contactos
  - persona existente
  - cliente nuevo empresa
