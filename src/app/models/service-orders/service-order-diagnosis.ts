export interface ServiceOrderDiagnosis {
    id: number;
    serviceOrderItemId: number;
    sequenceNumber: number;
    status: ServiceOrderDiagnosisStatus;
    summary: string;
    details: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}

export enum ServiceOrderDiagnosisStatus {
    CURRENT = 'CURRENT',
    ARCHIVED = 'ARCHIVED'
}