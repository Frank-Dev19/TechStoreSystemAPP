import { ServiceOrderItem } from './service-order-item';
import { ClientResponse } from '../clients-response';

export interface ServiceOrder {
  id: number;
  code: string;
  status: ServiceOrderStatus;
  priority: ServiceOrderPriority;
  requestOrigin: RequestOrigin;
  clientId: number | null;
  client?: ClientResponse | null;
  createdBy: number;
  closedBy: number | null;
  clientSnapshotName?: string | null;
  clientSnapshotDocumentTypeName?: string | null;
  clientSnapshotDocumentNumber?: string | null;
  clientSnapshotPhone?: string | null;
  clientSnapshotEmail?: string | null;
  // legacy fields kept for compatibility with older payloads
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  estimatedDeliveryDate: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  isPaid: boolean;
  paidAt: string | null;
  notes: string | null;
  itemsCount: number;
  completedItemsCount: number;
  totalServiceOrderQuotedAmount?: number;
  pendingQuoteItemsCount?: number;
  rejectedQuoteItemsCount?: number;
  pendingDeliveryItemsCount?: number;
  pendingServiceOrderQuoteItemsCount?: number;
  rejectedServiceOrderQuoteItemsCount?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  items?: ServiceOrderItem[];
}

export enum ServiceOrderStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  PARTIALLY_COMPLETED = 'PARTIALLY_COMPLETED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ServiceOrderPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum RequestOrigin {
  CLIENT = 'CLIENT',
  INTERNAL = 'INTERNAL',
}
