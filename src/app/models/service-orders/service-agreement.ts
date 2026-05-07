import type { Product } from '../catalog/product';
import type { ServiceOrder } from './service-order';

export interface ServiceOrderAgreement {
  id: number;
  serviceOrderId: number;
  serviceOrder?: ServiceOrder | null;
  diagnosisId: number | null;
  sequenceNumber: number;
  status: ServiceOrderAgreementStatus;
  source?: ServiceOrderAgreementSource | null;
  currency?: string | null;
  totalAmount: number;
  notes: string | null;
  productItems: ServiceOrderAgreementProduct[];
  serviceItems: ServiceOrderAgreementService[];
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

