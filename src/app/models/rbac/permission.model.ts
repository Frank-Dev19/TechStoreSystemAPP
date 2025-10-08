import { PermissionModuleApi } from './permission-module.model';

export interface PermissionApi {
    id: number;
    code: string;
    description: string;
    actionKey: string;
    sortOrder: number;
    module: PermissionModuleApi;
}

export interface PermissionCreateRequest {
    moduleKey: string;
    actionKey: string;
    description: string;
    sortOrder?: number;
}

export interface PermissionUpdateRequest {
    moduleKey?: string;
    actionKey?: string;
    description?: string;
    sortOrder?: number;
}

// UI (coincide con tu HTML)
export interface PermissionUI {
    id: number;
    codigo: string;
    descripcion: string;
    actionkey: string;
    module_id: number;
}

export const mapPermApiToUI = (p: PermissionApi): PermissionUI => ({
    id: p.id,
    codigo: p.code,
    descripcion: p.description,
    actionkey: p.actionKey,
    module_id: p.module.id,
});
