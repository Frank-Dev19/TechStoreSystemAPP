import { DiagnosisStatus } from "./diagnostic";

export interface DiagnosticSaveRequest {
    ticketItemId: number;
    sequenceNumber?: number;
    status?: DiagnosisStatus | null;
    summary: string;
    details?: string | null;
}

export interface DiagnosticUpdateRequest {
    ticketItemId: number;
    sequenceNumber?: number;
    status?: DiagnosisStatus | null;
    summary: string;
    details?: string | null;
}
