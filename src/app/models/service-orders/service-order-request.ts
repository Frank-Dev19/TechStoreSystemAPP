import {
  EquipmentType,
  RequestOrigin,
  ServiceOrderCancellationChannel,
  ServiceOrderCancellationResolution,
  ServiceOrderPriority,
  ServiceType,
} from './service-order';

export interface RequestServiceOrderItemCancellationRequest {
  channel: ServiceOrderCancellationChannel;
  reason: string;
}

export interface ResolveServiceOrderItemCancellationRequest {
  resolution: ServiceOrderCancellationResolution;
  chargeAmount?: number;
  reason: string;
}

export type ServiceOrderInitialCommercialLineType = 'PRODUCT' | 'SERVICE';

export interface ServiceOrderInitialCommercialLineRequest {
  type: ServiceOrderInitialCommercialLineType;
  productId?: number;
  serviceId?: number;
  quantity: number;
  unitPrice: number;
  requiresPurchase?: boolean;
  notes?: string;
}

export interface ServiceOrderInitialCommercialRequest {
  notes?: string;
  lines: ServiceOrderInitialCommercialLineRequest[];
}

export interface ServiceOrderCreateItemRequest {
  equipmentType: EquipmentType;
  equipmentTypeOther?: string | null;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  accessories?: string | null;
  initialIssue: string;
  priority?: ServiceOrderPriority;
  estimatedRepairHours?: number | null;
  estimatedDeliveryDate?: string | null;
  notes?: string | null;
  warrantySourceItemId?: number;
  initialCommercial?: ServiceOrderInitialCommercialRequest;
}

export interface ServiceOrderSaveRequest {
  requestOrigin?: RequestOrigin;
  clientId?: number | null;
  clientContactId?: number | null;
  assignedToTechnicianId: number;
  serviceType: ServiceType;
  contactName?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  items: ServiceOrderCreateItemRequest[];
}

export interface ServiceOrderUpdateRequest {
  requestOrigin?: RequestOrigin;
  clientId?: number | null;
  clientContactId?: number | null;
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
