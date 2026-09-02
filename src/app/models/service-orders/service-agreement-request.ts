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

export interface ServiceOrderCommercialRevisionRequest {
  serviceOrderId: number;
  notes?: string;
  items: ServiceOrderCommercialRevisionItemRequest[];
}

export interface ServiceOrderCommercialRevisionItemRequest {
  serviceOrderItemId: number;
  baseVersionId?: number;
  notes?: string;
  warrantyDurationValue?: number;
  warrantyDurationUnit?: 'DAY' | 'MONTH' | 'YEAR';
  lines: ServiceOrderCommercialRevisionLineRequest[];
}

export interface ServiceOrderCommercialRevisionLineRequest {
  type: 'PRODUCT' | 'SERVICE';
  productId?: number;
  serviceId?: number;
  quantity: number;
  unitPrice: number;
  discountPct?: number;
  discountOverrideReason?: string;
  requiresPurchase?: boolean;
  notes?: string;
}

export type ServiceOrderClientDecisionType = 'ACCEPTED' | 'CHANGES_REQUESTED';
export type ServiceOrderClientDecisionChannel = 'WHATSAPP' | 'PHONE' | 'IN_PERSON' | 'EMAIL' | 'OTHER';

export interface ServiceOrderClientDecisionRequest {
  commercialVersionId: number;
  decision: ServiceOrderClientDecisionType;
  channel: ServiceOrderClientDecisionChannel;
  observation?: string;
}


