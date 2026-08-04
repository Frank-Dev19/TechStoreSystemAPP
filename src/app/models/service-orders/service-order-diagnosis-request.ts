import { ServiceOrderDiagnosisOutcome, ServiceOrderDiagnosisStatus } from './service-order-diagnosis';

export interface ServiceOrderDiagnosisSaveRequest {
  serviceOrderItemId?: number;
  /** Compatibilidad temporal para órdenes antiguas de un solo equipo. */
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
  sequenceNumber?: number;
  status?: ServiceOrderDiagnosisStatus | null;
  outcome?: ServiceOrderDiagnosisOutcome | null;
  summary?: string;
  details?: string | null;
  outcomeReason?: string | null;
  recommendedAction?: string | null;
}
