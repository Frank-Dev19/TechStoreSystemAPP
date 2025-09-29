export interface DocumentTypeResponse {
    id: number;
    name: string;
    isActive: boolean;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    deletedAt?: string | Date | null;
}

export interface DocumentTypesPaginatedResponse {
    data: DocumentTypeResponse[];
    total: number;
    page: number;
    limit: number;
}
