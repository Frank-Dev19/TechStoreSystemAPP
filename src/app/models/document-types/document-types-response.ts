import { DocumentTypeKind } from './document-types-request';

export interface DocumentTypeResponse {
    id: number;
    name: string;
    digits: number;
    description: string;
    sunatCode?: string | null;
    kind?: DocumentTypeKind | null;
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


