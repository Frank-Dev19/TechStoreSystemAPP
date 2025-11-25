import { TicketItem } from './ticket-item';

export interface Ticket {
  id: number;
  code: string;
  status: TicketStatus;
  priority: TicketPriority;
  businessPartnerId: number;
  createdBy: number;
  closedBy: number | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  estimatedDeliveryDate: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  totalQuotedAmount: number;
  totalPaidAmount: number;
  paymentStatus: PaymentStatus;
  currency: string;
  notes: string | null;
  itemsCount: number;
  completedItemsCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  items?: TicketItem[];
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  PARTIALLY_COMPLETED = 'PARTIALLY_COMPLETED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
}
