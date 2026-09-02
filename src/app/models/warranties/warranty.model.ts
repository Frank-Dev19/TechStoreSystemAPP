import { EquipmentType, ServiceOrderPriority } from '../service-orders/service-order';

export type WarrantyDurationUnit = 'DAY' | 'MONTH' | 'YEAR';
export type WarrantySourceType = 'PRODUCT' | 'SERVICE';
export type WarrantyCoverageStatus = 'ACTIVE' | 'RESERVED' | 'CONSUMED' | 'EXPIRED' | 'REVOKED';
export type WarrantyClaimStatus =
  | 'RECEIVED'
  | 'IN_REVIEW'
  | 'RESOLVED_APPLIES'
  | 'RESOLVED_REJECTED'
  | 'CANCELLED';

export interface WarrantyCustomer {
  id: number;
  name: string;
  documentNumber?: string | null;
}

export interface WarrantyCoverage {
  id: number;
  sourceType: WarrantySourceType;
  sourceUnitKey: string;
  customerId: number;
  customer?: WarrantyCustomer;
  saleId: number | null;
  serviceOrderId: number | null;
  serviceOrderItemId: number | null;
  productId: number | null;
  product?: { id: number; name?: string; brand?: string | null } | null;
  serialId: number | null;
  sourceCodeSnapshot: string;
  sourceNameSnapshot: string;
  serialSnapshot: string | null;
  originTechnicianId: number | null;
  originTechnicianNameSnapshot: string | null;
  durationValue: number;
  durationUnit: WarrantyDurationUnit;
  startsAt: string;
  expiresAt: string;
  coverageAmount: number;
  status: WarrantyCoverageStatus;
  consumedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface WarrantyClaim {
  id: number;
  coverageId: number;
  coverage: WarrantyCoverage;
  status: WarrantyClaimStatus;
  serviceOrderId: number | null;
  serviceOrderItemId: number | null;
  diagnosisId: number | null;
  outcome: 'WARRANTY_APPLIES' | 'WARRANTY_REJECTED' | null;
  originTechnicianId: number | null;
  attendingTechnicianId: number | null;
  attendingTechnician?: { id: number; name: string } | null;
  technicianOverrideReason: string | null;
  reportedIssue: string;
  reservedAt: string;
  reviewStartedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface WarrantyTechnicianReportRow {
  rank: number;
  technicianId: number;
  technicianName: string;
  deliveredServices: number;
  consumedWarranties: number;
  appliedWarranties: number;
  rejectedWarranties: number;
  consumedAmount: number;
  warrantyRate: number;
}

export interface WarrantyTechnicianReport {
  generatedAt: string;
  technicians: WarrantyTechnicianReportRow[];
}

export interface WarrantyPage<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface WarrantyIntakeRequest {
  coverageId: number;
  reportedIssue: string;
  assignedToTechnicianId?: number;
  technicianOverrideReason?: string;
  equipmentType?: EquipmentType;
  equipmentTypeOther?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  accessories?: string;
  priority?: ServiceOrderPriority;
  notes?: string;
}
