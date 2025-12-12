import { AuditAction, AuditEntity } from './audit.types';

export interface AuditLog {
    id: number;
    createdAt: string; // viene como ISO string desde el backend (CreateDateColumn)

    userId: number | null;

    actorEmail: string | null;
    actorName: string | null;

    action: AuditAction;
    entity: AuditEntity;
    entityId: string | null;

    method: string | null;
    path: string | null;
    status: number | null;
    durationMs: number | null;

    ip: string | null;
    userAgent: string | null;

    requestId: string | null;
    sessionId: string | null;

    reason: string | null;
    keyId: string | null;

    before: any;
    after: any;
}
