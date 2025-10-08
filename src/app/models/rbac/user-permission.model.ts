import { PermissionApi } from './permission.model';

export type OverrideEffect = 'allow' | 'deny';

export interface UserPermissionApi {
    id: number;
    user: { id: number } | number;       // según serialización
    permission: PermissionApi;
    effect: OverrideEffect;
    expiresAt: string | null;
    scope: Record<string, any> | null;
    createdAt?: string;
}

// UI (coincide con tu HTML)
export interface ExceptionalPermissionUI {
    id: number;
    userId: number;
    permissionId: number;
    effect: OverrideEffect;
    scope?: string;
    expiresAt?: Date;
}

export const scopeToString = (obj?: Record<string, any> | null): string | undefined => {
    if (!obj) return undefined;
    try {
        const pairs = Object.entries(obj).map(([k, v]) => `${k}:${v}`);
        return pairs.join('; ');
    } catch { return undefined; }
};
