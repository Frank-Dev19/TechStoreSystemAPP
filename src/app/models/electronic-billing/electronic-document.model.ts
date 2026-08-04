import { DocumentType } from '../sales/enums';

export type ElectronicDocumentStatus = 'PENDING' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'ERROR';

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
  createdAt: string;
  updatedAt: string;
}

export interface SendInvoiceResponse {
  saleId: number;
  payload: unknown;
  document: ElectronicDocument;
  response: unknown;
}

export interface SendElectronicDocumentEmailResponse {
  ok: true;
  saleId: number;
  to: string;
  message: string;
}
