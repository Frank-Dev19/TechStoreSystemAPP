export interface CustomersResponse {
    id: number;
    name: string;
    documentTypeId: number;
    documentNumber: string;
    email?: string;
    phone?: string;
    isActive: boolean;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    deletedAt?: string | Date | null;
}

export interface CustomersPaginatedResponse {
    data: CustomersResponse[];
    total: number;
    page: number;
    limit: number;
}
