import { ServiceOrderQuoteStatus } from './service-quote';

export interface ServiceOrderQuoteRequest {
  serviceOrderItemId: number;
  diagnosisId?: number;
  sequenceNumber?: number;
  status?: ServiceOrderQuoteStatus;
  notes?: string;
  products?: ServiceOrderQuoteProductRequest[];
  services?: ServiceOrderQuoteServiceRequest[];
}

export interface ServiceOrderQuoteProductRequest {
  productId?: number;
  quantity?: number;
  unitPrice?: number;
  requiresPurchase?: boolean;
  notes?: string;
}

export interface ServiceOrderQuoteServiceRequest {
  serviceId?: number;
  notes?: string;
}
