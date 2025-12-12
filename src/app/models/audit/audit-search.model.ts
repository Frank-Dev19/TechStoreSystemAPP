import { AuditAction, AuditEntity, AuditMethod } from './audit.types';
import { AuditLog } from './audit-log.model';

export interface AuditSearchFilters {
    from: string; // YYYY-MM-DD
    to: string;   // YYYY-MM-DD

    userId?: number | null;
    action?: AuditAction | null;
    entity?: AuditEntity | null;
    status?: number | null;
    method?: AuditMethod | null;

    q?: string; // búsqueda libre (path, entityId, requestId, etc.)

    page?: number;
    pageSize?: number;
    sort?: 'ts:desc' | 'ts:asc';
}

export interface AuditSearchResponse<T = AuditLog> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
}
