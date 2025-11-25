import { QuoteStatus } from "./quote";

export interface QuoteRequest {
  ticketItemId?: number;
  diagnosisId?: number;
  sequenceNumber?: number;
  status?: QuoteStatus;
  currency?: string;
  notes?: string;
  products?: QuoteProductRequest[];
  services?: QuoteServiceRequest[];
}

export interface QuoteProductRequest {
    productId?: number;
    quantity?: number;
    unitPrice?: number;
    requiresPurchase?: boolean;
    notes?: string;
}

export interface QuoteServiceRequest {
    serviceId?: number;
    notes?: string;
}
