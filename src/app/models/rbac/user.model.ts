import { RoleApi } from './role.model';

export interface DocumentTypeApi { id: number; name: string; code?: string; }

export interface UserApi {
    id: number;
    email: string;
    name: string;
    phone: string | null;
    documentType: DocumentTypeApi;
    documentNumber: string | null;
    roles: RoleApi[];
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;
}

export interface UserCreateRequest {
    email: string;
    name: string;
    phone?: string | null;
    documentTypeId: number;
    documentNumber: string;
    password: string;
    roleIds?: number[];
}

export interface UserUpdateRequest {
    email?: string;
    name?: string;
    phone?: string | null;
    documentTypeId?: number;
    documentNumber?: string;
    password?: string;
    roleIds?: number[];
    isActive?: boolean;
}

// UI (coincide con tu HTML)
export interface UserUI {
    id: number;
    nombre: string;
    email: string;
    celular: string;
    tipoDocumento: string;   // etiqueta
    nroDocumento: string;
    roles: number[];         // ids de rol
    isActive: boolean;
    deleted: boolean;
}

export const mapUserApiToUI = (u: UserApi): UserUI => ({
    id: u.id,
    nombre: u.name,
    email: u.email,
    celular: u.phone ?? '',
    tipoDocumento: u.documentType?.name ?? '',
    nroDocumento: u.documentNumber ?? '',
    roles: (u.roles || []).map(r => r.id),
    isActive: u.isActive,
    deleted: !!u.deletedAt,
});
