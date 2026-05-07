import {
  EquipmentType,
  RequestOrigin,
  ServiceOrderPriority,
  ServiceType,
} from './service-order';

export interface ServiceOrderSaveRequest {
  requestOrigin?: RequestOrigin;
  clientId?: number | null;
  clientContactId?: number | null;
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
  contactName?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export interface ServiceOrderBatchSharedContextRequest {
  requestOrigin?: RequestOrigin;
  clientId?: number | null;
  clientContactId?: number | null;
  priority?: ServiceOrderPriority;
  assignedToTechnicianId?: number | null;
  contactName?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export interface ServiceOrderBatchEntryRequest {
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

export interface ServiceOrderBatchCreateRequest {
  sharedContext: ServiceOrderBatchSharedContextRequest;
  orders: ServiceOrderBatchEntryRequest[];
}

export interface ServiceOrderBatchCreateResponse {
  createdOrders: import('./service-order').ServiceOrder[];
}

export interface ServiceOrderUpdateRequest {
  requestOrigin?: RequestOrigin;
  clientId?: number | null;
  clientContactId?: number | null;
  priority?: ServiceOrderPriority;
  equipmentType?: EquipmentType;
  equipmentTypeOther?: string | null;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  accessories?: string | null;
  initialIssue?: string;
  estimatedRepairHours?: number | null;
  estimatedDeliveryDate?: string | null;
  notes?: string | null;
  contactName?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  cancellationReason?: string | null;
}
