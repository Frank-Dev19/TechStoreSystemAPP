import type { ServiceOrder } from './service-order';

export interface ServiceOrderItem {
  id: number;
  serviceOrderId: number;
  itemNumber: number;
  equipmentType: EquipmentType;
  equipmentTypeOther?: string | null;
  serviceType: ServiceType;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  initialIssue: string;
  accessories: string | null;
  status: ServiceOrderItemStatus;
  assignedToTechnicianId: number | null;
  assignedToTechnicianName?: string | null;
  assignedAt: string | null;
  estimatedRepairHours: number | null;
  receivedAt: string;
  diagnosisStartedAt: string | null;
  diagnosisCompletedAt: string | null;
  quotedAt: string | null;
  quoteSentAt: string | null;
  quoteApprovedAt: string | null;
  quoteRejectedAt: string | null;
  lastCustomerResponseAt: string | null;
  repairStartedAt: string | null;
  repairCompletedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  finalAmount?: number | null;
  discount: number;
  cancelledBy: number | null;
  cancellationReason: string | null;
  rating: number | null;
  ratingComment: string | null;
  ratedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  serviceOrder?: ServiceOrder;
}

export enum ServiceType {
  STANDARD_SERVICE = 'STANDARD_SERVICE',
  DIAGNOSIS = 'DIAGNOSIS',
  WARRANTY_SERVICE = 'WARRANTY_SERVICE',
  ASSEMBLY = 'ASSEMBLY',
  CUSTOMER_SERVICE = 'CUSTOMER_SERVICE',
}

export enum ServiceOrderItemStatus {
  ASSIGNED = 'ASSIGNED',
  IN_DIAGNOSIS = 'IN_DIAGNOSIS',
  DIAGNOSED = 'DIAGNOSED',
  QUOTED = 'QUOTED',
  SENT_TO_CLIENT = 'SENT_TO_CLIENT',
  AWAITING_CLIENT_RESPONSE = 'AWAITING_CLIENT_RESPONSE',
  CLIENT_APPROVED = 'CLIENT_APPROVED',
  QUOTE_EXPIRED = 'QUOTE_EXPIRED',
  READY_FOR_REPAIR = 'READY_FOR_REPAIR',
  CLIENT_REJECTED = 'CLIENT_REJECTED',
  CLOSED_REJECTED_CLIENT = 'CLOSED_REJECTED_CLIENT',
  AWAITING_PARTS = 'AWAITING_PARTS',
  IN_REPAIR = 'IN_REPAIR',
  REPAIRED = 'REPAIRED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum EquipmentType {
  LAPTOP = 'LAPTOP',
  DESKTOP_PC = 'DESKTOP_PC',
  ALL_IN_ONE = 'ALL_IN_ONE',
  PRINTER = 'PRINTER',
  SCANNER = 'SCANNER',
  PROJECTOR = 'PROJECTOR',
  MONITOR = 'MONITOR',
  SERVER = 'SERVER',
  NETWORK_DEVICE = 'NETWORK_DEVICE',
  OTHER = 'OTHER',
}
