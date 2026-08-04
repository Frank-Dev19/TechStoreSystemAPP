import type { Product } from '../catalog/product';
import type { ServiceOrder, ServiceOrderItem } from './service-order';

export interface ServiceOrderAgreement {
  id: number;
  serviceOrderId: number;
  serviceOrder?: ServiceOrder | null;
  diagnosisId: number | null;
  derivedFromAgreementId?: number | null;
  supersededByAgreementId?: number | null;
  isCurrentVersion?: boolean | null;
  sequenceNumber: number;
  status: ServiceOrderAgreementStatus;
  source?: ServiceOrderAgreementSource | null;
  currency?: string | null;
  totalAmount: number;
  notes: string | null;
  productItems: ServiceOrderAgreementProduct[];
  serviceItems: ServiceOrderAgreementService[];
  items?: ServiceOrderAgreementItemLink[];
  agreedAt: Date | null;
  agreedByUserId?: number | null;
  sentToClientAt?: Date | null;
  clientApprovedAt?: Date | null;
  clientRejectedAt?: Date | null;
  clientNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export enum ServiceOrderAgreementSource {
  TECHNICIAN_COORDINATION = 'TECHNICIAN_COORDINATION',
  TECHNICAL_SERVICE_AUTO = 'TECHNICAL_SERVICE_AUTO',
  RECEPTION_DIRECT = 'RECEPTION_DIRECT',
}

export interface ServiceOrderAgreementProduct {
  id: number;
  serviceOrderAgreementId: number;
  provenance?: AgreementLineProvenance | null;
  canEdit?: boolean | null;
  canDelete?: boolean | null;
  derivedFromItemId?: number | null;
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

export interface ServiceOrderAgreementService {
  id: number;
  serviceOrderAgreementId: number;
  provenance?: AgreementLineProvenance | null;
  canEdit?: boolean | null;
  canDelete?: boolean | null;
  derivedFromItemId?: number | null;
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
  service?: { id?: number | null; name?: string | null; code?: string | null } | null;
}

export enum ServiceOrderAgreementStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  SUPERSEDED = 'SUPERSEDED',
  VOIDED = 'VOIDED',
  CURRENT = 'DRAFT',
  SENT = 'DRAFT',
  CLIENT_APPROVED = 'CONFIRMED',
  AUTO_APPROVED = 'CONFIRMED',
  APPROVED = 'CONFIRMED',
  CLIENT_REJECTED = 'VOIDED',
  REJECTED = 'VOIDED',
  ARCHIVED = 'SUPERSEDED',
  EXPIRED = 'SUPERSEDED',
}

export type AgreementLineProvenance = 'INHERITED' | 'NEW';

export type ServiceOrderCommercialLineType = 'PRODUCT' | 'SERVICE' | 'ADJUSTMENT';
export type ServiceOrderItemCommercialVersionStatus = 'DRAFT' | 'ISSUED' | 'ACCEPTED' | 'REPLACED' | 'VOIDED';

export interface ServiceOrderItemCommercialLine {
  id: number;
  commercialVersionId: number;
  type: ServiceOrderCommercialLineType;
  productId: number | null;
  serviceId: number | null;
  catalogCodeSnapshot: string;
  catalogNameSnapshot: string;
  catalogDescriptionSnapshot: string | null;
  quantity: number;
  unitPrice: number;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
  requiresPurchase: boolean;
  notes: string | null;
  discounts?: ServiceOrderLineDiscount[];
}

export interface ServiceOrderLineDiscount {
  id: number;
  commercialLineId: number;
  pricingConfigId: number | null;
  ruleName: string;
  type: 'PERCENTAGE';
  percentage: number;
  amount: number;
  maxAllowedPct: number;
  wasLimitOverridden: boolean;
  overrideReason: string | null;
  appliedByUserId: number;
  authorizedByUserId: number | null;
  createdAt: string;
}

export interface ServiceOrderItemCommercialVersion {
  id: number;
  serviceOrderItemId: number;
  derivedFromVersionId: number | null;
  versionNumber: number;
  status: ServiceOrderItemCommercialVersionStatus;
  totalAmount: number;
  notes: string | null;
  lines: ServiceOrderItemCommercialLine[];
  decisions?: ServiceOrderClientDecision[];
}

export interface ServiceOrderClientDecision {
  id: number;
  commercialVersionId: number;
  decision: 'ACCEPTED' | 'CHANGES_REQUESTED';
  channel: 'WHATSAPP' | 'PHONE' | 'IN_PERSON' | 'EMAIL' | 'OTHER';
  observation: string | null;
  recordedByUserId: number;
  recordedAt: string;
  recordedByUser?: { id: number; name: string } | null;
}

export interface ServiceOrderAgreementItemLink {
  id: number;
  serviceOrderAgreementId: number;
  serviceOrderItemId: number;
  commercialVersionId: number;
  serviceOrderItem?: ServiceOrderItem | null;
  commercialVersion?: ServiceOrderItemCommercialVersion | null;
}

export interface ServiceOrderClientDecisionResult {
  decision: {
    id: number;
    commercialVersionId: number;
    decision: 'ACCEPTED' | 'CHANGES_REQUESTED';
    channel: 'WHATSAPP' | 'PHONE' | 'IN_PERSON' | 'EMAIL' | 'OTHER';
    observation: string | null;
    recordedByUserId: number;
    recordedAt: string;
  };
  agreement: ServiceOrderAgreement;
  item: ServiceOrderItem;
  order: ServiceOrder;
  allAccepted: boolean;
}

export interface AgreementLineUiMeta {
  provenance: AgreementLineProvenance;
  canEdit: boolean;
  canDelete: boolean;
  derivedFromItemId?: number | null;
}

