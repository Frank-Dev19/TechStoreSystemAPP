export const DocumentTypeKind = {
    PERSON: 'PERSON',
    COMPANY: 'COMPANY',
} as const;

export type DocumentTypeKind = (typeof DocumentTypeKind)[keyof typeof DocumentTypeKind];

export interface DocumentTypeSaveRequest {
    name: string;
    digits: number;
    description: string;
    sunatCode?: string | null;
    kind: DocumentTypeKind;
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


