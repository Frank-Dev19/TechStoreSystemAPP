import { ServiceOrderDiagnosisOutcome, ServiceOrderDiagnosisStatus } from './service-order-diagnosis';

export interface ServiceOrderDiagnosisSaveRequest {
  serviceOrderId?: number;
  sequenceNumber?: number;
  status?: ServiceOrderDiagnosisStatus | null;
  outcome?: ServiceOrderDiagnosisOutcome | null;
  summary: string;
  details?: string | null;
  outcomeReason?: string | null;
  recommendedAction?: string | null;
}

export interface ServiceOrderDiagnosisUpdateRequest {
  serviceOrderId?: number;
  sequenceNumber?: number;
  status?: ServiceOrderDiagnosisStatus | null;
  outcome?: ServiceOrderDiagnosisOutcome | null;
  summary?: string;
  details?: string | null;
  outcomeReason?: string | null;
  recommendedAction?: string | null;
}
