import { ClientResponse } from '../clients-response';

export interface ServiceOrder {
  id: number;
  code: string;
  status: ServiceOrderStatus;
  workflowStatus: ServiceOrderWorkflowStatus;
  paymentStatus: ServiceOrderPaymentStatus;
  priority: ServiceOrderPriority;
  requestOrigin: RequestOrigin;
  clientId: number | null;
  client?: ClientResponse | null;
  createdBy: number;
  closedBy: number | null;
  cancelledBy: number | null;
  assignedToTechnicianId: number | null;
  assignedToTechnicianName?: string | null;
  clientSnapshotName?: string | null;
  clientSnapshotDocumentTypeName?: string | null;
  clientSnapshotDocumentNumber?: string | null;
  clientSnapshotPhone?: string | null;
  clientSnapshotEmail?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  equipmentType: EquipmentType;
  equipmentTypeOther?: string | null;
  serviceType: ServiceType;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  accessories: string | null;
  initialIssue: string;
  estimatedRepairHours: number | null;
  assignedAt: string | null;
  receivedAt: string;
  reviewStartedAt: string | null;
  serviceStartedAt: string | null;
  serviceCompletedAt: string | null;
  readyForPickupAt: string | null;
  estimatedDeliveryDate: string | null;
  resolvedAt: string | null;
  deliveredAt: string | null;
  closedAt: string | null;
  cancelledAt: string | null;
  isPaid: boolean;
  paidAt: string | null;
  notes: string | null;
  discount: number;
  cancellationReason: string | null;
  rating: number | null;
  ratingComment: string | null;
  ratedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  totalServiceOrderAgreedAmount?: number;
}

export enum ServiceOrderStatus {
  OPEN = 'OPEN',
  ACTIVE = 'ACTIVE',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  CLOSED_NO_SOLUTION = 'CLOSED_NO_SOLUTION',
  IN_PROGRESS = 'ACTIVE',
  PARTIALLY_COMPLETED = 'READY_FOR_PICKUP',
  COMPLETED = 'DELIVERED',
}

export enum ServiceOrderWorkflowStatus {
  ASSIGNED = 'ASSIGNED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  DIAGNOSIS_READY = 'DIAGNOSIS_READY',
  UNDER_COORDINATION = 'UNDER_COORDINATION',
  WAITING_QUOTE = 'UNDER_COORDINATION',
  QUOTE_SENT = 'UNDER_COORDINATION',
  WAITING_CLIENT_DECISION = 'UNDER_COORDINATION',
  APPROVED_FOR_WORK = 'APPROVED_FOR_WORK',
  IN_SERVICE = 'IN_SERVICE',
  WAITING_PARTS = 'WAITING_PARTS',
  SERVICE_DONE = 'SERVICE_DONE',
  NO_SOLUTION = 'NO_SOLUTION',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  CANCELLED = 'CANCELLED',
}

export enum ServiceOrderPaymentStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
  WAIVED = 'WAIVED',
}

export enum ServiceOrderPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum RequestOrigin {
  CLIENT = 'CLIENT',
  INTERNAL = 'INTERNAL',
}

export enum ServiceType {
  STANDARD_SERVICE = 'STANDARD_SERVICE',
  DIAGNOSIS = 'DIAGNOSIS',
  WARRANTY_SERVICE = 'WARRANTY_SERVICE',
  ASSEMBLY = 'ASSEMBLY',
  CUSTOMER_SERVICE = 'CUSTOMER_SERVICE',
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
