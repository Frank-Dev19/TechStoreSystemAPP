import { EquipmentType, ServiceLocation, ServiceType } from './ticket-item';

export interface TicketItemSaveRequest {
  equipmentType: EquipmentType;
  serviceType?: ServiceType;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  initialIssue: string;
  accessories?: string | null;
  serviceLocation?: ServiceLocation;
  serviceAddress?: string | null;
  serviceAddressReference?: string | null;
  scheduledServiceDate?: string | null;
  slaTargetDays?: number;
  requiresParts?: boolean;
  estimatedRepairHours?: number;
}

export interface TicketItemUpdateRequest extends Partial<TicketItemSaveRequest> {
  id: number;
}
