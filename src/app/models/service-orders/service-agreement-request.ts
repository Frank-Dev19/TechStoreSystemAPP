import { ServiceOrderAgreementSource, ServiceOrderAgreementStatus } from './service-agreement';

export interface ServiceOrderAgreementRequest {
  serviceOrderId?: number;
  diagnosisId?: number;
  baseAgreementId?: number;
  sequenceNumber?: number;
  status?: ServiceOrderAgreementStatus;
  source?: ServiceOrderAgreementSource;
  notes?: string;
  products?: ServiceOrderAgreementProductRequest[];
  newProducts?: ServiceOrderAgreementProductRequest[];
  technicalServiceAmount?: number;
}

export interface ServiceOrderAgreementProductRequest {
  productId?: number;
  quantity?: number;
  unitPrice?: number;
  requiresPurchase?: boolean;
  notes?: string;
}


