// Debe coincidir con AUDIT_ACTIONS del backend
export const AUDIT_ACTIONS = [
    'HTTP',
    'LOGIN_SUCCESS',
    'LOGIN_FAILURE',
    'LOGOUT',
    'ENTITY_CREATE',
    'ENTITY_UPDATE',
    'ENTITY_DELETE',
    'BUSINESS',
] as const;

export type AuditAction = typeof AUDIT_ACTIONS[number];

// Debe coincidir con AUDIT_ENTITIES del backend
export const AUDIT_ENTITIES = [
    'AUTH',
    'USER',
    'PRODUCT',
    'MOVEMENT',
    'STOCK',
    'LOT',
    'SERIAL',
    'CLIENT',
    'DOC_TYPE',
    'SYSTEM',
    'OTHER',
    'CATEGORY',
    'UNIT',
    'COUNTDIFFERENCESUMMARY',
    'COUNTDIFFERENCE',
    'COUNTENTRYSERIAL',
    'COUNTENTRY',
    'COUNTSNAPSHOT',
    'COUNT',
    'MOVEMENTSERIAL',
] as const;

export type AuditEntity = typeof AUDIT_ENTITIES[number];

// Debe coincidir con AUDIT_METHODS del backend
export const AUDIT_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
export type AuditMethod = typeof AUDIT_METHODS[number];
