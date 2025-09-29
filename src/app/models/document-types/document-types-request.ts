export interface DocumentTypeSaveRequest {
    name: string;
    isActive?: boolean;
}

export interface DocumentTypeDeleteRequest {
    id: number;
}

export interface DocumentTypeBulkDeleteRequest {
    ids: number[];
}

export type DocumentTypeUpdateRequest = Partial<DocumentTypeSaveRequest> & {
    id?: number;
}

