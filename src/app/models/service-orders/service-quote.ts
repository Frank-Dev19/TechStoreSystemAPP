import type { Product } from '../catalog/product';
import type { Service } from '../service-catalog/service';
import type { ServiceOrderItem } from './service-order-item';

export interface ServiceOrderQuote {
  id: number;
  serviceOrderItemId: number;
  serviceOrderItem?: ServiceOrderItem | null;
  diagnosisId: number | null;
  sequenceNumber: number;
  status: ServiceOrderQuoteStatus;
  totalAmount: number;
  currency?: string | null;
  notes: string | null;
  productItems: ServiceOrderQuoteProduct[];
  serviceItems: ServiceOrderQuoteService[];
  sentToClientAt: Date | null;
  clientApprovedAt: Date | null;
  clientRejectedAt: Date | null;
  clientNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ServiceOrderQuoteProduct {
  id: number;
  serviceOrderQuoteId: number;
  productId: number | null;
  productCodeSnapshot: string;
  productNameSnapshot: string;
  productDescriptionSnapshot: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  requiresPurchase: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  product?: Product | null;
}

export interface ServiceOrderQuoteService {
  id: number;
  serviceOrderQuoteId: number;
  serviceId: number | null;
  serviceCodeSnapshot: string;
  serviceNameSnapshot: string;
  serviceDescriptionSnapshot: string | null;
  estimatedHours: number;
  unitPrice: number;
  lineTotal: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  service?: Service | null;
}

export enum ServiceOrderQuoteStatus {
  SENT_TO_CLIENT = 'SENT_TO_CLIENT',
  AWAITING_CLIENT_RESPONSE = 'AWAITING_CLIENT_RESPONSE',
  CLIENT_APPROVED = 'CLIENT_APPROVED',
  CLIENT_REJECTED = 'CLIENT_REJECTED',
  CURRENT = 'CURRENT',
  ARCHIVED = 'ARCHIVED',
}
