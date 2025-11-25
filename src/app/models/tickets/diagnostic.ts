export interface Diagnostic {
    id: number;
    ticketItemId: number;
    sequenceNumber: number;
    status: DiagnosisStatus;
    summary: string;
    details: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}

export enum DiagnosisStatus {
    CURRENT = 'CURRENT',
    ARCHIVED = 'ARCHIVED'
}