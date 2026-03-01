import { PaymentStatus, TicketPriority } from './ticket';
import { TicketItemSaveRequest } from './ticket-item-request';

export interface TicketSaveRequest {
  clientId: number;
  priority?: TicketPriority;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  estimatedDeliveryDate?: string | null;
  paymentStatus?: PaymentStatus;
  currency?: string;
  notes?: string | null;
  items: TicketItemSaveRequest[];
}

export interface TicketUpdateRequest {
  clientId?: number;
  priority?: TicketPriority;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  estimatedDeliveryDate?: string | null;
  paymentStatus?: PaymentStatus;
  currency?: string;
  notes?: string | null;
  items?: TicketItemSaveRequest[];
}
