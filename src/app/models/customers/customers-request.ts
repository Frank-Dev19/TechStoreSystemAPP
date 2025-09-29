export interface CustomersSaveRequest {
    name: string;
    documentTypeId: number;
    documentNumber: string;
    email?: string;
    phone?: string;
    isActive?: boolean;
}

export interface CustomersDeleteRequest {
    id: number;
}

export interface CustomerBulkDeleteRequest {
    ids: number[];
}

export type CustomersUpdateRequest = Partial<CustomersSaveRequest> & {
    id?: number;
};
