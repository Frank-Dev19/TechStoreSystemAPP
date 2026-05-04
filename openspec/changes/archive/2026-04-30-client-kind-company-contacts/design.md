# Design: Client kind and company contacts

## Technical Approach

Extender el dominio `Client` con `kind`, agregar una tabla hija para contactos empresariales, mantener el snapshot de contacto en `ServiceOrder`, dejar la creación de empresa + contactos inline en el wizard de recepción y agregar una superficie dedicada de administración de contactos en la vista `clients`. Además, el create backend de empresa debe volverse atómico para no persistir clientes sin contactos.

## Architecture Decisions

### Decision: `Client.kind` como regla de negocio

**Choice**: Persistir `kind = PERSON | COMPANY` en `Client`.
**Alternatives considered**: Inferir siempre desde `documentTypeId`; usar solo labels/UI.
**Rationale**: Hoy el wizard decide por longitud de documento y mezcla conceptos. `kind` centraliza reglas para backend, frontend y futuras extensiones.

### Decision: contactos en entidad separada

**Choice**: Crear `ClientContact` con relación `Client 1:N`, `isPrimary` e idealmente `isActive`.
**Alternatives considered**: Campos opcionales en `clients`; relación 1:1.
**Rationale**: El usuario ya definió reemplazos futuros y múltiples contactos. 1:N preserva historial y evita sobrescribir personas anteriores.

### Decision: snapshot + referencia persistida en orden

**Choice**: La orden selecciona un contacto, persiste snapshot y también guarda `clientContactId`.
**Alternatives considered**: Solo snapshot; solo FK al contacto.
**Rationale**: El snapshot protege auditoría histórica; la referencia permite trazabilidad y selección desde maestro.

### Decision: creación inline en wizard, administración en drawer desde clients

**Choice**: En recepción, la creación de empresa + contactos vive inline dentro del wizard; en `clients`, la administración de contactos vive en una superficie dedicada tipo drawer.
**Alternatives considered**: modal encima de modal en el wizard; modal simple en `clients`.
**Rationale**: El wizard necesita mantener foco operativo y continuidad; un drawer en `clients` soporta mejor CRUD de varios contactos sin romper la lectura de la grilla.

### Decision: alta de empresa atómica en backend

**Choice**: La creación de `COMPANY` debe validar y persistir empresa + contactos en una misma unidad atómica.
**Alternatives considered**: corregir solo frontend; persistir cliente primero y contactos después.
**Rationale**: La UI correcta reduce errores, pero no elimina integraciones rotas ni payloads incompletos. El backend no puede dejar clientes huérfanos por fallos posteriores de contactos.

## Data Flow

### Alta inline en wizard

`ReceptionPanel` → busca `Client` por documento → si no existe crea `Client` inline → si `kind=COMPANY` crea uno o más `ClientContact` dentro del mismo flujo → crea `ServiceOrder` con snapshot del contacto operativo.

```text
Reception wizard
   ├─ lookup client by document
   ├─ create Client(kind)
   ├─ create ClientContact(s) (only COMPANY)
   └─ create ServiceOrder(snapshot contact)
```

### Empresa existente

```text
Select company client
   ├─ load related contacts
   ├─ preselect primary
   ├─ optionally create new contact inline
   └─ submit order with selected contact
```

### Gestión desde clients

```text
Clients table
   ├─ create company client
   │   ├─ capture legal data
   │   ├─ capture first contact
   │   └─ submit atomic create
   └─ manage company contacts
       ├─ open drawer from row action
       ├─ list existing contacts
       ├─ add/update contacts
       └─ switch primary contact
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `TechStoreSystemAPI/src/clients/entities/client.entity.ts` | Modify | agregar `kind` y relación a contactos |
| `TechStoreSystemAPI/src/clients/create-client.dto.ts` | Modify | aceptar `kind` y, para empresa, primer contacto opcional/embebido o separado |
| `TechStoreSystemAPI/src/clients/update-client.dto.ts` | Modify | compatibilizar edición con `kind` |
| `TechStoreSystemAPI/src/clients/client.service.ts` | Modify | validar `kind`, unicidad de primary y alta atómica |
| `TechStoreSystemAPI/src/clients/entities/client-contact.entity.ts` | Create | entidad de contactos empresariales |
| `TechStoreSystemAPI/src/service-orders/dto/create-service-order.dto.ts` | Modify | aceptar selección de contacto empresarial (`clientContactId` o equivalente) |
| `TechStoreSystemAPI/src/service-orders/entities/service-order.entity.ts` | Modify | persistir `clientContactId` y mantener snapshots |
| `TechStoreSystemAPI/src/service-orders/services/service-order.service.ts` | Modify | resolver contacto seleccionado y aplicar snapshot correcto |
| `TechStoreSystemAPP/src/app/models/clients-request.ts` | Modify | agregar `kind` y payloads de contacto empresa |
| `TechStoreSystemAPP/src/app/models/clients-response.ts` | Modify | exponer `kind` y contactos |
| `TechStoreSystemAPP/src/app/pages/reception-panel/reception-panel.ts` | Modify | separar flujo PERSON vs COMPANY |
| `TechStoreSystemAPP/src/app/pages/reception-panel/reception-panel.html` | Modify | bloques distintos: persona / empresa + contacto |
| `TechStoreSystemAPP/src/app/pages/clients/clients.ts` | Modify | alta de empresa con primer contacto + acción para gestionar contactos |
| `TechStoreSystemAPP/src/app/pages/clients/clients.html` | Modify | UI de alta empresa y drawer/acción para contactos |

## Interfaces / Contracts

```ts
type ClientKind = 'PERSON' | 'COMPANY'

type ClientContact = {
  id: number
  clientId: number
  name: string
  email?: string | null
  phone?: string | null
  isPrimary: boolean
  isActive?: boolean
}
```

```ts
type ClientSaveRequest = {
  kind?: ClientKind
  contacts?: ClientContactRequest[]
}
```

```ts
type ServiceOrderSaveRequest = {
  clientId?: number | null
  clientContactId?: number | null
  contactName?: string
  contactEmail?: string | null
  contactPhone?: string | null
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | validación `kind`, primary único, snapshot correcto, create atómico | specs de servicios Nest + mappers/helpers Angular |
| Integration | creación inline empresa/persona desde wizard hacia contratos; alta empresa desde `clients`; gestión de contactos | pruebas de servicio/componentes con mocks HTTP |
| E2E | N/A | no hay infraestructura e2e en APP |

## Migration / Rollout

Migración de datos mínima requerida. Backfill inicial: mapear `RUC -> COMPANY` y `DNI -> PERSON`; otros tipos quedan por fallback temporal. Para clientes empresa legacy sin contactos:
- el wizard deberá pedir crear uno antes de finalizar nuevas órdenes;
- `clients` deberá permitir cargar el primer contacto desde su propia gestión;
- la creación backend no deberá volver a dejar empresas persistidas sin contactos.

## Open Questions

- [ ] Confirmar tratamiento inicial de tipos de documento distintos de DNI/RUC hasta que `DocumentType` clasifique PERSON/COMPANY en otro change.
