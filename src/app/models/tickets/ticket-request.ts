import { PaymentStatus, TicketPriority } from './ticket';
import { TicketItemSaveRequest } from './ticket-item-request';

export interface TicketSaveRequest {
  businessPartnerId: number;
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
  businessPartnerId?: number;
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
