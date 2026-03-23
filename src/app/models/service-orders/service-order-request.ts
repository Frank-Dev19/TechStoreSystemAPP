import {
  EquipmentType,
  RequestOrigin,
  ServiceOrderPaymentStatus,
  ServiceOrderPriority,
  ServiceOrderStatus,
  ServiceOrderWorkflowStatus,
  ServiceType,
} from './service-order';

export interface ServiceOrderSaveRequest {
  requestOrigin?: RequestOrigin;
  clientId?: number | null;
  priority?: ServiceOrderPriority;
  assignedToTechnicianId?: number | null;
  equipmentType?: EquipmentType;
  equipmentTypeOther?: string | null;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  accessories?: string | null;
  initialIssue?: string;
  serviceType?: ServiceType;
  estimatedRepairHours?: number | null;
  estimatedDeliveryDate?: string | null;
  notes?: string | null;
}

export interface ServiceOrderUpdateRequest extends Partial<ServiceOrderSaveRequest> {
  contactName?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  isPaid?: boolean;
  status?: ServiceOrderStatus;
  workflowStatus?: ServiceOrderWorkflowStatus;
  paymentStatus?: ServiceOrderPaymentStatus;
  cancellationReason?: string | null;
}
