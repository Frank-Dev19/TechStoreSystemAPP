import { DocumentType } from '../sales/enums';

export type ElectronicDocumentStatus = 'PENDING' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'ERROR';
export type ElectronicCancellationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'ERROR';

export interface ElectronicDocument {
  id: number;
  saleId: number;
  companyId: number;
  provider: string;
  providerEndpoint?: string | null;
  documentType: DocumentType | string;
  sunatDocumentTypeCode: string;
  series: string;
  number: string;
  status: ElectronicDocumentStatus;
  payloadJson?: unknown | null;
  responseJson?: unknown | null;
  xml?: string | null;
  hash?: string | null;
  cdrZip?: string | null;
  sunatCode?: string | null;
  sunatDescription?: string | null;
  sunatNotes?: string[] | unknown | null;
  errorMessage?: string | null;
  sentAt?: string | null;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  cancellationStatus?: ElectronicCancellationStatus | null;
  cancellationEndpoint?: string | null;
  cancellationTicket?: string | null;
  cancellationReason?: string | null;
  cancellationObservations?: string | null;
  cancellationErrorMessage?: string | null;
  cancellationRequestedAt?: string | null;
  cancellationResolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ElectronicCancellationResponse {
  sale: { id: number; status: string };
  document?: ElectronicDocument;
  pending: boolean;
  message: string;
}

export interface ElectronicCreditNote {
  id: number;
  saleId: number;
  series: string;
  number: string;
  reasonCode: '01' | '06';
  reason: string;
  observations?: string | null;
  refundMethod: string;
  amount: number;
  status: ElectronicDocumentStatus;
  sunatDescription?: string | null;
  errorMessage?: string | null;
  acceptedAt?: string | null;
  createdAt: string;
  hasXml: boolean;
  hasCdr: boolean;
  localApplicationPending: boolean;
}

export interface SendInvoicesBatchResponse {
  total: number;
  accepted: number;
  pending: number;
  failed: number;
  emailsSent: number;
  emailsSkipped: number;
  emailsFailed: number;
  results: Array<{
    saleId: number;
    ok: boolean;
    document?: ElectronicDocument;
    emailDelivery?: AutomaticEmailDelivery;
    error?: string;
  }>;
}

export interface ElectronicRefundResponse {
  sale: { id: number; status: string };
  creditNote?: ElectronicCreditNote;
  message: string;
}

export interface SendInvoiceResponse {
  saleId: number;
  payload: unknown;
  document: ElectronicDocument;
  response: unknown;
  emailDelivery?: AutomaticEmailDelivery;
}

export interface AutomaticEmailDelivery {
  status: 'SENT' | 'SKIPPED' | 'FAILED';
  to?: string;
  message: string;
}

export interface SendElectronicDocumentEmailResponse {
  ok: true;
  saleId: number;
  to: string;
  message: string;
}
