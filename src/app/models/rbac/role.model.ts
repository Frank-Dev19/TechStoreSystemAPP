import { PermissionApi } from './permission.model';

export interface RoleApi {
    id: number;
    name: string;
    permissions: PermissionApi[];
    createdAt?: string;
}

export interface RoleCreateRequest {
    name: string;
    permissionIds?: number[];
}

export interface RoleUpdateRequest {
    name?: string;
    permissionIds?: number[];
}

export interface AssignPermissionsRequest {
    permissions: string[]; // códigos
}

// UI (coincide con tu HTML)
export interface RoleUI {
    id: number;
    nombre: string;
    permissions: number[]; // ids de permisos
    createdAt: Date;
}

export const mapRoleApiToUI = (r: RoleApi): RoleUI => ({
    id: r.id,
    nombre: r.name,
    permissions: (r.permissions || []).map(p => p.id),
    createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
});
