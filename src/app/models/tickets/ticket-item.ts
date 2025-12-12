import type { Ticket } from "./ticket"

export interface TicketItem {
  id: number;
  ticketId: number;
  itemNumber: number;
  equipmentType: EquipmentType;
  serviceType: ServiceType;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  initialIssue: string;
  accessories: string | null;
  status: TicketItemStatus;
  assignedToTechnicianId: number | null;
  assignedToTechnicianName?: string | null;
  assignedToSupervisorId?: number | null;
  assignedToSupervisorName?: string | null;
  assignedAt: string | null;
  serviceLocation: ServiceLocation;
  serviceAddress: string | null;
  serviceAddressReference: string | null;
  scheduledServiceDate: string | null;
  slaTargetDays: number;
  slaStartDate: string | null;
  slaDeadline: string | null;
  slaPaused: boolean;
  slaPausedAt: string | null;
  slaPausedReason: ClientSlaPauseReason | null;
  slaPausedDays: number;
  slaBreached: boolean;
  slaBreachedAt: string | null;
  estimatedRepairHours: number | null;
  actualDiagnosisHours: number | null;
  actualRepairHours: number | null;
  diagnosisEfficiencyPercent: number | null;
  repairEfficiencyPercent: number | null;
  requiresParts: boolean;
  partsRequestedAt: string | null;
  partsReceivedAt: string | null;
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
  readyForDeliveryAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  finalAmount: number | null;
  discount: number;
  cancelledBy: number | null;
  cancellationReason: string | null;
  rating: number | null;
  ratingComment: string | null;
  ratedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  ticket?: Ticket;
}

export enum ServiceType {
  DIAGNOSIS = 'DIAGNOSIS',
  STANDARD_SERVICE = 'STANDARD_SERVICE',
}

export enum TicketItemStatus {
  ASSIGNED = 'ASSIGNED',
  IN_DIAGNOSIS = 'IN_DIAGNOSIS',
  DIAGNOSED = 'DIAGNOSED',
  QUOTED = 'QUOTED',
  SUPERVISOR_APPROVED = 'SUPERVISOR_APPROVED',
  SUPERVISOR_REJECTED = 'SUPERVISOR_REJECTED',
  SENT_TO_CLIENT = 'SENT_TO_CLIENT',
  AWAITING_CLIENT_RESPONSE = 'AWAITING_CLIENT_RESPONSE',
  CLIENT_APPROVED = 'CLIENT_APPROVED',
  CLIENT_REJECTED = 'CLIENT_REJECTED',
  AWAITING_PARTS = 'AWAITING_PARTS',
  IN_REPAIR = 'IN_REPAIR',
  REPAIRED = 'REPAIRED',
  READY_FOR_DELIVERY = 'READY_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum ServiceLocation {
  ON_SITE = 'ON_SITE',
  OFF_SITE = 'OFF_SITE',
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

export enum ClientSlaPauseReason {
  AWAITING_CLIENT_APPROVAL = 'AWAITING_CLIENT_APPROVAL',
  CLIENT_REQUESTED_HOLD = 'CLIENT_REQUESTED_HOLD',
  AWAITING_CLIENT_INFO = 'AWAITING_CLIENT_INFO',
}
