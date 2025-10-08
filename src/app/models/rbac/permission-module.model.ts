// API
export interface PermissionModuleApi {
    id: number;
    moduleKey: string;
    label: string;
    icon?: string | null;
    sortOrder: number;
    createdAt?: string;
    updatedAt?: string;
}

// UI (coincide con tu HTML)
export interface PermissionModuleUI {
    id: number;
    key: string;
    label: string;
    icon: string;
    sortOrder: number;
}

export const mapModuleApiToUI = (m: PermissionModuleApi): PermissionModuleUI => ({
    id: m.id,
    key: m.moduleKey,
    label: m.label,
    icon: m.icon ?? '',
    sortOrder: m.sortOrder ?? 0,
});
