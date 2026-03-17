import { EquipmentType, ServiceType } from './service-order-item';

export interface ServiceOrderItemSaveRequest {
  equipmentType: EquipmentType;
  equipmentTypeOther?: string | null;
  serviceType?: ServiceType;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  initialIssue: string;
  accessories?: string | null;
  estimatedRepairHours?: number;
}

export interface ServiceOrderItemUpdateRequest extends Partial<ServiceOrderItemSaveRequest> {
  id: number;
}
