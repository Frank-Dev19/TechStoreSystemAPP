export interface UserRole {
    id: number;
    name: string;
    permissions: string[];
}

export interface DocumentTypeVM {
    id: number;
    name: string;
}

export interface User {
    id: number;
    email: string;
    name: string;
    phone: string | null;
    documentType: DocumentTypeVM | null;
    documentNumber: string | null;
    isActive: boolean;
    roles: UserRole[];
    createdAt: string | Date;
    updatedAt: string | Date;
}
