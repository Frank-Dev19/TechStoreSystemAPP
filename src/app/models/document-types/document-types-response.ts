export interface DocumentTypeResponse {
    id: number;
    name: string;
    digits: number;
    description: string;
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


