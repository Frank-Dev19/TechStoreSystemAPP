import { ServiceOrderAgreementSource, ServiceOrderAgreementStatus } from './service-agreement';

export interface ServiceOrderAgreementRequest {
  serviceOrderId?: number;
  diagnosisId?: number;
  sequenceNumber?: number;
  status?: ServiceOrderAgreementStatus;
  source?: ServiceOrderAgreementSource;
  notes?: string;
  products?: ServiceOrderAgreementProductRequest[];
  services?: ServiceOrderAgreementServiceRequest[];
}

export interface ServiceOrderAgreementProductRequest {
  productId?: number;
  quantity?: number;
  unitPrice?: number;
  requiresPurchase?: boolean;
  notes?: string;
}

export interface ServiceOrderAgreementServiceRequest {
  serviceId?: number;
  notes?: string;
}


