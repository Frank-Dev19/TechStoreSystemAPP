import { ServiceOrderDiagnosisStatus } from './service-order-diagnosis';

export interface ServiceOrderDiagnosisSaveRequest {
  serviceOrderItemId: number;
  sequenceNumber?: number;
  status?: ServiceOrderDiagnosisStatus | null;
  summary: string;
  details?: string | null;
}

export interface ServiceOrderDiagnosisUpdateRequest {
  serviceOrderItemId: number;
  sequenceNumber?: number;
  status?: ServiceOrderDiagnosisStatus | null;
  summary: string;
  details?: string | null;
}
