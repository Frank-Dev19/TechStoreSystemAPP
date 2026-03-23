export interface ServiceOrderDiagnosis {
  id: number;
  serviceOrderId: number;
  sequenceNumber: number;
  status: ServiceOrderDiagnosisStatus;
  outcome: ServiceOrderDiagnosisOutcome;
  summary: string;
  details: string | null;
  outcomeReason: string | null;
  recommendedAction: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export enum ServiceOrderDiagnosisStatus {
  CURRENT = 'CURRENT',
  SUPERSEDED = 'SUPERSEDED',
}

export enum ServiceOrderDiagnosisOutcome {
  REPAIRABLE = 'REPAIRABLE',
  IRREPARABLE = 'IRREPARABLE',
  NOT_COST_EFFECTIVE = 'NOT_COST_EFFECTIVE',
  NO_PARTS_AVAILABLE = 'NO_PARTS_AVAILABLE',
  NO_FAULT_FOUND = 'NO_FAULT_FOUND',
  WARRANTY_APPLIES = 'WARRANTY_APPLIES',
  WARRANTY_REJECTED = 'WARRANTY_REJECTED',
}
