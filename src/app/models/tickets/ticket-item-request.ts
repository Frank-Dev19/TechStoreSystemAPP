import { EquipmentType, ServiceType } from './ticket-item';

export interface TicketItemSaveRequest {
  equipmentType: EquipmentType;
  serviceType?: ServiceType;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  initialIssue: string;
  accessories?: string | null;
  estimatedRepairHours?: number;
}

export interface TicketItemUpdateRequest extends Partial<TicketItemSaveRequest> {
  id: number;
}
