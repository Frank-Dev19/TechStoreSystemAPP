export interface DocumentTypeSaveRequest {
    name: string;
    digits: number;
    description: string;
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


